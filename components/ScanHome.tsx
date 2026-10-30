import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Platform, View } from "react-native";

import { ReadAloud } from "@/components/ReadAloud";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, Masthead, Screen } from "@/components/ui";
import { useMeds } from "@/lib/use-meds";
import { readLabelText } from "@/lib/scan/ocr";
import { matchLabel } from "@/lib/scan/match.mjs";
import { useScanConsent } from "@/lib/use-scan";

type Result = { text: string; matchId: string | null };

export function ScanHome() {
  const scan = useScanConsent();
  const meds = useMeds();
  const { parentMode, colors, radius, space } = useTheme();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const matched = result?.matchId ? meds.items.find((item) => item.id === result.matchId) ?? null : null;
  const spoken = matched
    ? `${matched.name}. ${matched.dosage}. ${matched.taken ? "Taken today." : "Not taken yet."}`
    : "Scan a label. The photo stays on this device and is not saved.";

  const read = async (uri: string, revoke: boolean) => {
    if (reading) return;
    setReading(true);
    setFormError(null);
    setResult(null);
    try {
      const text = await readLabelText(uri);
      const hit = matchLabel(text, meds.items);
      setResult({ text, matchId: hit?.id ?? null });
      setCameraOpen(false);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "The label could not be read.");
    } finally {
      if (revoke) URL.revokeObjectURL(uri);
      setReading(false);
    }
  };

  const openCamera = async () => {
    setFormError(null);
    const current = permission?.granted ? permission : await requestPermission();
    if (!current.granted) {
      setFormError("The camera stays off until you allow it.");
      return;
    }
    setCameraOpen(true);
  };

  const capture = async () => {
    const photo = await camera.current?.takePictureAsync({ quality: 0.5 });
    if (!photo?.uri) {
      setFormError("The photo could not be taken.");
      return;
    }
    await read(photo.uri, false);
  };

  const choosePhoto = async () => {
    setFormError(null);
    if (Platform.OS === "web") {
      const uri = await pickWebFile();
      if (uri) await read(uri, true);
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (!picked.canceled && picked.assets[0]) await read(picked.assets[0].uri, false);
  };

  return (
    <Screen>
      <Masthead
        title="Scan a label"
        lede={parentMode ? "The photo stays here." : "The photo is read on this device. It is not saved and it is not sent."}
      />
      <ReadAloud text={spoken} />
      <ActionButton label="Back" emphasis="quiet" onPress={() => router.back()} />
      {scan.phase === "loading" || meds.phase === "loading" ? <AppText tone="muted">Opening the scanner.</AppText> : null}
      {scan.phase === "error" ? (
        <Card>
          <AppText>{scan.message}</AppText>
        </Card>
      ) : null}
      {meds.phase === "error" ? (
        <Card>
          <AppText>{meds.message}</AppText>
        </Card>
      ) : null}
      {scan.phase === "ready" && scan.consent !== "allowed" ? (
        <Card style={{ gap: space[4] }}>
          <AppText variant="heading">Camera</AppText>
          <AppText tone="muted">
            {scan.consent === "declined"
              ? "The camera stays off. You can allow it when you want to read a label."
              : "Allow the camera before a label is read. Nothing is read until you do."}
          </AppText>
          <ActionButton label="Allow the camera" onPress={() => scan.choose("allowed").catch(show(setFormError))} />
          {scan.consent === "unknown" ? (
            <ActionButton label="Not now" emphasis="quiet" onPress={() => scan.choose("declined").catch(show(setFormError))} />
          ) : null}
        </Card>
      ) : null}
      {scan.phase === "ready" && scan.consent === "allowed" && meds.phase === "ready" ? (
        <View style={{ gap: space[6] }}>
          {meds.items.length === 0 ? <AppText tone="muted">Add a medication first. A label can only match one that is saved.</AppText> : null}
          {cameraOpen ? (
            <View style={{ gap: space[4] }}>
              <CameraView ref={camera} facing="back" style={{ height: 280, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.canvas }} />
              <ActionButton label={reading ? "Reading the label" : "Read this label"} onPress={() => capture().catch(show(setFormError))} />
              <ActionButton label="Close camera" emphasis="quiet" onPress={() => setCameraOpen(false)} />
            </View>
          ) : (
            <View style={{ gap: space[4] }}>
              <ActionButton label="Open camera" onPress={() => openCamera().catch(show(setFormError))} />
              <ActionButton label="Choose a photo" emphasis="quiet" onPress={() => choosePhoto().catch(show(setFormError))} />
            </View>
          )}
          {reading && !result ? <AppText tone="muted">Reading the label on this device.</AppText> : null}
          {formError ? <AppText>{formError}</AppText> : null}
          {result && !matched ? (
            <Card style={{ gap: space[3] }}>
              <AppText variant="heading">No match</AppText>
              <AppText tone="muted">Nothing on this label matches a saved medication.</AppText>
              {result.text ? <AppText variant="caption" tone="faint">{clip(result.text)}</AppText> : null}
            </Card>
          ) : null}
          {matched ? (
            <Card style={{ gap: space[4] }}>
              <AppText variant="caption" tone="faint">Saved medication</AppText>
              <AppText variant="heading">{matched.name}</AppText>
              {matched.dosage ? <AppText tone="muted">{matched.dosage}</AppText> : null}
              <AppText tone="muted">{matched.taken ? "Taken today." : "Not taken yet."}</AppText>
              {meds.canEdit ? (
                <ActionButton label="Mark taken" onPress={() => meds.take(matched.id).catch(show(setFormError))} />
              ) : null}
              {meds.canEdit ? (
                <ActionButton label="Mark not taken" emphasis="quiet" onPress={() => meds.untake(matched.id).catch(show(setFormError))} />
              ) : null}
            </Card>
          ) : null}
          {meds.notice ? <AppText variant="caption" tone="faint">{meds.notice}</AppText> : null}
          <ActionButton label="Turn the camera off" emphasis="quiet" onPress={() => scan.choose("declined").then(() => setCameraOpen(false)).catch(show(setFormError))} />
        </View>
      ) : null}
    </Screen>
  );
}

function clip(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157)}...` : clean;
}

function pickWebFile() {
  return new Promise<string | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? URL.createObjectURL(file) : null);
    };
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

function show(setFormError: (message: string) => void) {
  return (error: unknown) => {
    setFormError(error instanceof Error ? error.message : "The label could not be read.");
  };
}
