import { AppText, EmptyState, Screen, Wordmark } from "@/components/ui";

function todayLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function CalendarScreen() {
  return (
    <Screen>
      <Wordmark />
      <AppText variant="label" tone="muted">
        {todayLabel()}
      </AppText>
      <AppText variant="title">Calendar</AppText>
      <AppText tone="muted">A shared view of appointments, visits, and important dates.</AppText>
      <EmptyState
        title="A clear day"
        body="Visits and appointments will gather here for everyone you trust with them."
      />
      <AppText variant="caption" tone="muted">
        Private to your care circle.
      </AppText>
    </Screen>
  );
}
