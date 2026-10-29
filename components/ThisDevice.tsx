import { useEffect, useState } from "react";
import { View } from "react-native";
import { QrMark } from "@/components/QrMark";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, Field } from "@/components/ui";
import { useLocalCare } from "@/lib/use-local-care";

export function ThisDevice() {
  const care = useLocalCare();
  const { space } = useTheme();
  const readyName = care.status.phase === "ready" ? care.status.name : "";
  const [name, setName] = useState(readyName);
  const [paste, setPaste] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (care.status.phase === "ready") setName(care.status.name);
  }, [care.status]);

  if (care.status.phase === "loading") {
    return (
      <Card>
        <AppText variant="heading">This device</AppText>
        <AppText tone="muted">Opening the private store on this device.</AppText>
      </Card>
    );
  }

  if (care.status.phase === "error") {
    return (
      <Card>
        <AppText variant="heading">This device</AppText>
        <AppText>{care.status.message}</AppText>
      </Card>
    );
  }

  const save = () => {
    setFormError(null);
    care.saveName(name).catch((error: unknown) => {
      setFormError(error instanceof Error ? error.message : "The name could not be saved.");
    });
  };

  const pair = () => {
    setFormError(null);
    care.pair(paste.trim()).then(() => setPaste("")).catch((error: unknown) => {
      setFormError(error instanceof Error ? error.message : "That invite could not be used.");
    });
  };

  return (
    <View style={{ gap: space[4] }}>
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">This device</AppText>
        <AppText tone="muted">A private name for this phone or computer. Care records stay here until you pair.</AppText>
        <Field label="Device name" value={name} onChangeText={setName} onBlur={save} />
        <AppText variant="caption" tone="muted">
          {care.notice}
        </AppText>
      </Card>
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">Pair a family device</AppText>
        <AppText tone="muted">Create an invite, then the other person pastes it on their Profile. No account and no server.</AppText>
        <ActionButton label="Create invite" onPress={() => care.makeInvite().catch(() => setFormError("The invite could not be created."))} />
        {care.inviteText ? (
          <View style={{ gap: space[3] }}>
            <QrMark text={care.inviteText} />
            <Field label="Invite" value={care.inviteText} onChangeText={() => undefined} multiline editable={false} />
          </View>
        ) : null}
        <Field
          label="Paste an invite or confirmation"
          value={paste}
          onChangeText={setPaste}
          multiline
          placeholder="Paste the other device's code"
        />
        <ActionButton label="Pair" onPress={pair} emphasis="quiet" />
        {care.confirmationText ? (
          <View style={{ gap: space[3] }}>
            <AppText tone="muted">Confirmation to send back</AppText>
            <QrMark text={care.confirmationText} />
            <Field label="Confirmation" value={care.confirmationText} onChangeText={() => undefined} multiline editable={false} />
          </View>
        ) : null}
        {formError ? <AppText>{formError}</AppText> : null}
        <AppText variant="label">Paired devices</AppText>
        {care.status.peers.length === 0 ? (
          <AppText tone="muted">No other devices yet.</AppText>
        ) : (
          care.status.peers.map((peer) => (
            <AppText key={peer.deviceId}>
              {peer.name}
            </AppText>
          ))
        )}
      </Card>
    </View>
  );
}
