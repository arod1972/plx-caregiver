import { useEffect, useState } from "react";
import { View } from "react-native";
import { QrMark } from "@/components/QrMark";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, ChoiceGroup, Field } from "@/components/ui";
import { useLocalCare, type CareRole } from "@/lib/use-local-care";

const roles: { value: CareRole; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "caregiver", label: "Caregiver" },
  { value: "family", label: "Family" },
  { value: "viewer", label: "Viewer" },
];

function roleLabel(role: CareRole) {
  return roles.find((item) => item.value === role)?.label ?? "Family";
}

export function ThisDevice() {
  const care = useLocalCare();
  const { space } = useTheme();
  const ready = care.status.phase === "ready" ? care.status : null;
  const [name, setName] = useState(ready?.name ?? "");
  const [circleName, setCircleName] = useState(ready?.circleName ?? "");
  const [inviteRole, setInviteRole] = useState<CareRole>("family");
  const [paste, setPaste] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (care.status.phase !== "ready") return;
    setName(care.status.name);
    setCircleName(care.status.circleName);
  }, [care.status]);

  if (care.status.phase === "loading") {
    return (
      <Card>
        <AppText variant="heading">This device</AppText>
        <AppText tone="muted">Opening the private store on this device.</AppText>
      </Card>
    );
  }

  if (care.status.phase === "error" || !ready) {
    return (
      <Card>
        <AppText variant="heading">This device</AppText>
        <AppText>{care.status.phase === "error" ? care.status.message : "This device could not be opened."}</AppText>
      </Card>
    );
  }

  const saveName = () => {
    setFormError(null);
    care.saveName(name).catch((error: unknown) => {
      setFormError(error instanceof Error ? error.message : "The name could not be saved.");
    });
  };

  const saveCircle = () => {
    setFormError(null);
    care.saveCircle(circleName).catch((error: unknown) => {
      setFormError(error instanceof Error ? error.message : "The circle name could not be saved.");
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
        <AppText variant="heading">Care circle</AppText>
        <AppText tone="muted">Created on this device. People you invite share only what you send them.</AppText>
        <Field label="Circle name" value={circleName} onChangeText={setCircleName} onBlur={saveCircle} editable={ready.primary} />
        {ready.primary ? (
          <ChoiceGroup label="Your role" value={ready.role} onChange={(role) => care.saveRole(ready.deviceId, role)} options={roles} />
        ) : (
          <AppText>Your role is {roleLabel(ready.role)}.</AppText>
        )}
        {ready.peers.length === 0 ? <AppText tone="muted">No other devices yet.</AppText> : null}
        {ready.peers.map((peer) =>
          ready.primary ? (
            <ChoiceGroup
              key={peer.deviceId}
              label={peer.name}
              value={peer.role}
              onChange={(role) => care.saveRole(peer.deviceId, role)}
              options={roles}
            />
          ) : (
            <AppText key={peer.deviceId}>
              {peer.name} · {roleLabel(peer.role)}
            </AppText>
          ),
        )}
      </Card>
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">This device</AppText>
        <AppText tone="muted">A private name for this phone or computer. Care records stay here until you pair.</AppText>
        <Field label="Device name" value={name} onChangeText={setName} onBlur={saveName} />
        <AppText variant="caption" tone="muted">
          {care.notice}
        </AppText>
      </Card>
      <Card style={{ gap: space[4] }}>
        <AppText variant="heading">Pair a family device</AppText>
        <AppText tone="muted">Choose their role, create an invite, then they paste it on their Profile. No account and no server.</AppText>
        <ChoiceGroup label="Role on the invite" value={inviteRole} onChange={setInviteRole} options={roles} />
        <ActionButton label="Create invite" onPress={() => care.makeInvite(inviteRole).catch(() => setFormError("The invite could not be created."))} />
        {care.inviteText ? (
          <View style={{ gap: space[3] }}>
            <QrMark text={care.inviteText} />
            <Field label="Invite" value={care.inviteText} onChangeText={() => undefined} multiline editable={false} />
          </View>
        ) : null}
        <Field
          label="Paste an invite, confirmation, or update"
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
        <ActionButton label="Copy updates" emphasis="quiet" onPress={() => care.shareUpdates().catch(() => setFormError("Updates could not be prepared."))} />
        {care.updatesText ? <Field label="Updates" value={care.updatesText} onChangeText={() => undefined} multiline editable={false} /> : null}
        {formError ? <AppText>{formError}</AppText> : null}
      </Card>
    </View>
  );
}
