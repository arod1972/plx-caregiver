import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, ChoiceGroup, EmptyState, Field, HairlineRow, PageHeader, Screen, SectionLabel } from "@/components/ui";
import { localStarts } from "@/lib/mesh/calendar.mjs";
import { useCalendar, type CalendarItem } from "@/lib/use-calendar";

const kinds: { value: "appointment" | "visit" | "date"; label: string }[] = [
  { value: "appointment", label: "Appointment" },
  { value: "visit", label: "Visit" },
  { value: "date", label: "Important date" },
];

const repeats: { value: "none" | "weekly" | "monthly"; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Every week" },
  { value: "monthly", label: "Every month" },
];

function kindLabel(kind: CalendarItem["kind"]) {
  if (kind === "med") return "Medication";
  return kinds.find((item) => item.value === kind)?.label ?? "Appointment";
}

function dayKey(ms: number) {
  const date = new Date(ms);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(ms: number) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(ms);
}

function timeLabel(item: CalendarItem) {
  if (item.allDay) return "All day";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(item.occursAt);
}

function todayDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function stamp(iso: string) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { date: `${date.getFullYear()}-${month}-${day}`, time: `${hours}:${minutes}` };
}

function repeatLabel(repeat: CalendarItem["repeat"]) {
  if (repeat === "weekly") return "Every week";
  if (repeat === "monthly") return "Every month";
  if (repeat === "daily") return "Every day";
  return "";
}

function groupByDay(items: CalendarItem[]) {
  const groups: { key: string; label: string; items: CalendarItem[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.occursAt);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({ key, label: dayLabel(item.occursAt), items: [item] });
    else last.items.push(item);
  }
  return groups;
}

type Draft = {
  id?: string;
  title: string;
  kind: "appointment" | "visit" | "date";
  date: string;
  time: string;
  repeat: "none" | "weekly" | "monthly";
  notes: string;
};

export function CalendarHome() {
  const calendar = useCalendar();
  const { parentMode, space } = useTheme();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const openNew = () => {
    setFormError(null);
    setDraft({ title: "", kind: "appointment", date: todayDate(), time: "09:00", repeat: "none", notes: "" });
  };

  const openEdit = (item: CalendarItem) => {
    if (item.kind === "med" || item.repeat === "daily") return;
    const when = stamp(item.startsAt);
    setFormError(null);
    setDraft({ id: item.id, title: item.title, kind: item.kind, date: when.date, time: when.time, repeat: item.repeat, notes: item.notes });
  };

  const save = () => {
    if (!draft) return;
    setFormError(null);
    calendar
      .save({
        id: draft.id,
        title: draft.title,
        kind: draft.kind,
        startsAt: localStarts(draft.date, draft.kind === "date" ? "09:00" : draft.time),
        repeat: draft.repeat,
        notes: draft.notes,
      })
      .then(() => setDraft(null))
      .catch((error: unknown) => setFormError(error instanceof Error ? error.message : "The event could not be saved."));
  };

  const spoken =
    calendar.phase !== "ready"
      ? "The calendar is still opening."
      : !calendar.canView
        ? "The calendar is not shared with this device."
        : calendar.items.length === 0
          ? "Nothing is scheduled."
          : `Calendar. ${calendar.items
              .slice(0, 12)
              .map((item) => `${dayLabel(item.occursAt)} at ${timeLabel(item)}. ${item.title}. ${kindLabel(item.kind)}.`)
              .join(" ")}`;

  const ready = calendar.phase === "ready" && calendar.canView;
  const showList = ready && !draft;

  return (
    <Screen>
      <PageHeader
        kicker={dayLabel(Date.now())}
        title="Calendar"
        subtitle={parentMode ? undefined : "Appointments, visits, and important dates."}
      />
      <View style={{ gap: space[6] }}>
        <ReadAloud text={spoken} />
        {calendar.phase === "loading" ? <AppText tone="muted">Opening on this device.</AppText> : null}
        {calendar.phase === "error" ? <AppText>{calendar.message}</AppText> : null}
        {calendar.phase === "ready" && !calendar.canView ? (
          <EmptyState mark="locked" title="Not shared here" body="This isn't available on this device." />
        ) : null}
        {ready && draft ? (
          <Card>
            <AppText variant="heading">{draft.id ? "Edit event" : "New event"}</AppText>
            <Field label="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} placeholder="Clinic visit" />
            <ChoiceGroup label="Kind" value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind })} options={kinds} />
            <Field label="Date" value={draft.date} onChangeText={(date) => setDraft({ ...draft, date })} placeholder="2026-11-03" />
            {draft.kind === "date" ? null : (
              <Field label="Time" value={draft.time} onChangeText={(time) => setDraft({ ...draft, time })} placeholder="09:00" />
            )}
            <ChoiceGroup label="Repeats" value={draft.repeat} onChange={(repeat) => setDraft({ ...draft, repeat })} options={repeats} />
            <Field label="Notes" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })} placeholder="Optional" />
            {draft.repeat !== "none" ? <AppText tone="muted">Saving changes the whole series.</AppText> : null}
            {formError ? <AppText>{formError}</AppText> : null}
            <ActionButton label="Save" onPress={save} />
            {draft.id ? (
              <ActionButton
                label="Remove"
                emphasis="quiet"
                onPress={() => {
                  const id = draft.id;
                  if (!id) return;
                  calendar.remove(id).then(() => setDraft(null)).catch((error: unknown) => {
                    setFormError(error instanceof Error ? error.message : "The event could not be removed.");
                  });
                }}
              />
            ) : null}
            <ActionButton label="Close" emphasis="quiet" onPress={() => setDraft(null)} />
          </Card>
        ) : null}
        {showList && calendar.canEdit ? <ActionButton label="Add an event" onPress={openNew} /> : null}
        {showList && calendar.items.length === 0 ? (
          <EmptyState mark="calendar" title="Nothing scheduled" body="Appointments and visits will appear here." />
        ) : null}
        {showList && calendar.items.length > 0 ? (
          <View style={{ gap: space[6] }}>
            {groupByDay(calendar.items).map((group) => (
              <View key={group.key} style={{ gap: space[2] }}>
                <SectionLabel>{group.label}</SectionLabel>
                <View>
                  {group.items.map((item) => {
                    const series = repeatLabel(item.repeat);
                    const editable = calendar.canEdit && item.kind !== "med";
                    return (
                      <HairlineRow key={`${item.id}-${item.occursAt}`}>
                        <Pressable
                          accessibilityRole={editable ? "button" : "text"}
                          accessibilityLabel={`${item.title}, ${kindLabel(item.kind)}`}
                          disabled={!editable}
                          onPress={() => openEdit(item)}
                        >
                          <AppText variant="caption" tone="faint">
                            {timeLabel(item)} · {kindLabel(item.kind)}
                            {series ? ` · ${series}` : ""}
                          </AppText>
                          <AppText variant="heading">{item.title}</AppText>
                          {item.notes ? <AppText tone="muted">{item.notes}</AppText> : null}
                        </Pressable>
                      </HairlineRow>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {calendar.notice ? (
          <AppText variant="caption" tone="faint">
            {calendar.notice}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" tone="faint">
        Private to your care circle.
      </AppText>
    </Screen>
  );
}
