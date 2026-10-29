import { AppText, EmptyState, Screen, Wordmark } from "@/components/ui";

export default function MedsScreen() {
  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Medications</AppText>
      <AppText tone="muted">Doses, schedules, and refill dates in one list.</AppText>
      <EmptyState
        title="No medications yet"
        body="A dose can be logged by the person receiving care or by family."
      />
      <AppText variant="caption" tone="muted">
        Private to your care circle.
      </AppText>
    </Screen>
  );
}
