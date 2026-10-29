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

export async function notifyAssignment(task: { id: string; title: string; stamp: string }) {
  try {
    const db = await careStore();
    const key = `notify.task.${task.id}`;
    if ((await db.getMeta(key)) === task.stamp) return false;
    if (!(await allowed())) {
      await db.setMeta(key, task.stamp);
      return false;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: task.title, body: "Assigned to you" },
      trigger: null,
    });
    await db.setMeta(key, task.stamp);
    await db.setMeta(`notify.task.id.${task.id}`, id);
    return true;
  } catch {
    return false;
  }
}

export async function remindDose(med: { id: string; name: string; at: number }) {
  try {
    const db = await careStore();
    const stampKey = `notify.med.at.${med.id}`;
    if ((await db.getMeta(stampKey)) === String(med.at)) return false;
    if (!(await allowed())) {
      await db.setMeta(stampKey, String(med.at));
      return false;
    }
    const previous = await db.getMeta(`notify.med.${med.id}`);
    if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: med.name, body: "Time for a dose" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(med.at) },
    });
    await db.setMeta(`notify.med.${med.id}`, id);
    await db.setMeta(stampKey, String(med.at));
    return true;
  } catch {
    return false;
  }
}

export async function clearDoseReminder(medId: string) {
  try {
    const db = await careStore();
    const previous = await db.getMeta(`notify.med.${medId}`);
    if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    await db.setMeta(`notify.med.${medId}`, "");
    await db.setMeta(`notify.med.at.${medId}`, "");
  } catch {
    return;
  }
}
export async function clearAssignmentNotice(taskId: string) {
  try {
    const db = await careStore();
    const previous = await db.getMeta(`notify.task.id.${taskId}`);
    if (previous) await Notifications.cancelScheduledNotificationAsync(previous).catch(() => undefined);
    await db.setMeta(`notify.task.${taskId}`, "");
    await db.setMeta(`notify.task.id.${taskId}`, "");
  } catch {
    return;
  }
}
