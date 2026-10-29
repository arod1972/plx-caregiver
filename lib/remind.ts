import * as Notifications from "expo-notifications";
import { careStore } from "@/lib/care-store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const kindLabel: Record<string, string> = {
  appointment: "Appointment",
  visit: "Visit",
  date: "Important date",
};

async function allowed() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function remindEvent(event: { id: string; title: string; kind: string; at: number }) {
  try {
    if (!(await allowed())) return false;
    const db = await careStore();
    const previous = await db.getMeta(`notify.${event.id}`);
    if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: event.title, body: kindLabel[event.kind] ?? "Calendar" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(event.at) },
    });
    await db.setMeta(`notify.${event.id}`, id);
    return true;
  } catch {
    return false;
  }
}

export async function cancelReminder(eventId: string) {
  try {
    const db = await careStore();
    const previous = await db.getMeta(`notify.${eventId}`);
    if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    await db.setMeta(`notify.${eventId}`, "");
  } catch {
    return;
  }
}
