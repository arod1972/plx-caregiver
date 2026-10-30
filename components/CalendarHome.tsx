import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, ChoiceGroup, EmptyState, Field, Group, PageHeader, Row, Screen } from "@/components/ui";
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

function weekOf(anchor: number) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.getTime();
  });
}

function sameDay(a: number, b: number) {
  return dayKey(a) === dayKey(b);
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
  const { parentMode, colors, space, type, fontFamily } = useTheme();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selected, setSelected] = useState(() => Date.now());
  const days = weekOf(Date.now());
  const visible = calendar.items.filter((item) => sameDay(item.occursAt, selected));

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
          ? "Nothing is on the calendar."
          : `Calendar. ${calendar.items
              .slice(0, 12)
              .map((item) => `${dayLabel(item.occursAt)} at ${timeLabel(item)}. ${item.title}. ${kindLabel(item.kind)}.`)
              .join(" ")}`;

  return (
    <Screen>
      <PageHeader
        eyebrow={dayLabel(Date.now())}
        title="Today"
        lede={parentMode ? undefined : "Appointments, visits, and doses."}
        onAdd={calendar.phase === "ready" && calendar.canView && calendar.canEdit && !draft ? openNew : undefined}
        addLabel="Add an event"
      />
      <ReadAloud text={spoken} />
      {calendar.phase === "loading" ? <AppText tone="muted">Opening the calendar.</AppText> : null}
      {calendar.phase === "error" ? (
        <Card>
          <AppText>{calendar.message}</AppText>
        </Card>
      ) : null}
      {calendar.phase === "ready" && !calendar.canView ? (
        <EmptyState title="Not shared" body="This calendar isn’t on this device." icon="eye-off" />
      ) : null}
      {calendar.phase === "ready" && calendar.canView && draft ? (
        <Card style={{ gap: space[4] }}>
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
      {calendar.phase === "ready" && calendar.canView && !draft ? (
        <View style={{ flexDirection: "row", gap: space[1] }}>
          {days.map((day) => {
            const active = sameDay(day, selected);
            const today = sameDay(day, Date.now());
            const busy = calendar.items.some((item) => sameDay(item.occursAt, day));
            const letter = new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(day);
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={dayLabel(day)}
                onPress={() => setSelected(day)}
                style={{
                  flex: 1,
                  minHeight: 64,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  borderRadius: 16,
                  backgroundColor: active ? colors.accent : "transparent",
                }}
              >
                <AppText variant="caption" tone={active ? "accentInk" : "muted"} style={{ fontSize: Math.min(type.caption, 13) }}>
                  {letter}
                </AppText>
                <AppText variant="label" tone={active ? "accentInk" : "ink"} style={{ fontFamily, fontWeight: today ? "700" : "600" }}>
                  {new Date(day).getDate()}
                </AppText>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: busy ? (active ? colors.accentInk : colors.accent) : "transparent" }} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {calendar.phase === "ready" && calendar.canView && !draft && visible.length === 0 ? (
        <Group>
          <View style={{ padding: space[4] }}>
            <EmptyState title="Nothing scheduled" body={`${dayLabel(selected)} is clear.`} icon="calendar" />
          </View>
        </Group>
      ) : null}
      {calendar.phase === "ready" && calendar.canView && !draft && visible.length > 0 ? (
        <Group>
          {visible.map((item, index) => (
            <Row
              key={`${item.id}-${item.occursAt}`}
              last={index === visible.length - 1}
              label={calendar.canEdit && item.kind !== "med" ? item.title : undefined}
              onPress={calendar.canEdit && item.kind !== "med" ? () => openEdit(item) : undefined}
            >
              <View style={{ width: 76 }}>
                <AppText variant="label">{timeLabel(item)}</AppText>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="heading">{item.title}</AppText>
                <AppText variant="caption" tone="muted">
                  {kindLabel(item.kind)}
                  {item.repeat === "weekly" ? " · Every week" : item.repeat === "monthly" ? " · Every month" : item.repeat === "daily" ? " · Every day" : ""}
                </AppText>
                {item.notes ? <AppText tone="muted">{item.notes}</AppText> : null}
              </View>
            </Row>
          ))}
        </Group>
      ) : null}
      {calendar.notice ? (
        <AppText variant="caption" tone="faint">
          {calendar.notice}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="faint">
        Private to this circle.
      </AppText>
    </Screen>
  );
}
