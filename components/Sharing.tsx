import { View } from "react-native";
import { useTheme } from "@/components/theme";
import { AppText, Card, ChoiceGroup } from "@/components/ui";
import type { AccessLevel, CareRole, LocalPeer, MemberAccess, Sharing } from "@/lib/use-local-care";

const roles: { value: CareRole; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "caregiver", label: "Caregiver" },
  { value: "family", label: "Family" },
  { value: "viewer", label: "Viewer" },
];

const levels: { value: AccessLevel; label: string }[] = [
  { value: "edit", label: "Can change" },
  { value: "view", label: "Can view" },
  { value: "none", label: "No access" },
];

function roleLabel(role: CareRole) {
  return roles.find((item) => item.value === role)?.label ?? "Family";
}

function levelOf(access: { view: boolean; edit: boolean }): AccessLevel {
  if (access.edit) return "edit";
  if (access.view) return "view";
  return "none";
}

function describe(access: { view: boolean; edit: boolean }) {
  if (access.edit) return "You can view and change care details.";
  if (access.view) return "You can view care details, but not change them.";
  return "You don't have access to care details on this circle.";
}

export function SharingCard({
  canManage,
  sharing,
  peers,
  mine,
  onRole,
  onMember,
}: {
  canManage: boolean;
  sharing: Sharing;
  peers: LocalPeer[];
  mine: { view: boolean; edit: boolean };
  onRole: (role: CareRole, level: AccessLevel) => void;
  onMember: (deviceId: string, level: MemberAccess) => void;
}) {
  const { space } = useTheme();

  return (
    <Card style={{ gap: space[4] }}>
      <AppText variant="heading">Sharing</AppText>
      {canManage ? (
        <>
          <AppText tone="muted">Who can see care details, and who can change them. Copy updates so the other device matches.</AppText>
          {roles.map((role) => (
            <ChoiceGroup
              key={role.value}
              label={role.label}
              value={levelOf(sharing.roles[role.value])}
              onChange={(level) => onRole(role.value, level)}
              options={levels}
            />
          ))}
          {peers.length === 0 ? (
            <AppText tone="muted">After someone pairs, you can make an exception for that person.</AppText>
          ) : (
            peers.map((peer) => (
              <ChoiceGroup
                key={peer.deviceId}
                label={peer.name}
                value={sharing.members[peer.deviceId] ?? "role"}
                onChange={(level) => onMember(peer.deviceId, level)}
                options={[
                  { value: "role", label: `Same as ${roleLabel(peer.role)}` },
                  { value: "edit", label: "Can change" },
                  { value: "view", label: "Can view" },
                  { value: "none", label: "No access" },
                ]}
              />
            ))
          )}
        </>
      ) : (
        <View style={{ gap: space[2] }}>
          <AppText>{describe(mine)}</AppText>
          <AppText tone="muted">A parent sets this for the circle.</AppText>
        </View>
      )}
    </Card>
  );
}
