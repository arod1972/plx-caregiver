import { AppText, EmptyState, Screen, Wordmark } from "@/components/ui";

export default function UpdatesScreen() {
  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Updates</AppText>
      <AppText tone="muted">Care notes for the people allowed to see them.</AppText>
      <EmptyState
        title="No updates yet"
        body="Family messages stay in this circle. They are not posted anywhere else."
      />
      <AppText variant="caption" tone="muted">
        Private to your care circle.
      </AppText>
    </Screen>
  );
}
