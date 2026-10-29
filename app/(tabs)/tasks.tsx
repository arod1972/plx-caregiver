import { AppText, EmptyState, Screen, Wordmark } from "@/components/ui";

export default function TasksScreen() {
  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Tasks</AppText>
      <AppText tone="muted">Errands, rides, meals, and follow-ups, with a clear owner.</AppText>
      <EmptyState
        title="No open tasks"
        body="When something needs doing, it will show up here with who is taking it."
      />
      <AppText variant="caption" tone="muted">
        Private to your care circle.
      </AppText>
    </Screen>
  );
}
