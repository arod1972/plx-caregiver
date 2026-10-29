import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, EmptyState, Field, HairlineRow, PageHeader, Screen } from "@/components/ui";
import { useMeds, type MedicationItem } from "@/lib/use-meds";

function timeLabel(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hours, minutes));
}

type Draft = { id?: string; name: string; time: string; dosage: string; refillOn: string };

function takenLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Taken";
  return `Taken ${new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)}`;
}

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(year, month - 1, day));
}

export function MedsHome() {
  const meds = useMeds();
  const { parentMode, space } = useTheme();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const save = () => {
    if (!draft) return;
    setFormError(null);
    meds
      .save(draft)
      .then(() => setDraft(null))
      .catch((error: unknown) => setFormError(error instanceof Error ? error.message : "The medication could not be saved."));
  };

  const spoken =
    meds.phase !== "ready"
      ? "Medications are still opening."
      : !meds.canView
        ? "Medications are not shared with this device."
        : meds.items.length === 0
          ? "No medications are saved."
          : `Medications. ${meds.items
              .map((item) => `${item.name}. ${item.dosage}. Every day at ${timeLabel(item.time)}. ${item.taken ? takenLabel(item.takenAt) : "Not taken yet"}.`)
              .join(" ")}`;

  const ready = meds.phase === "ready" && meds.canView;
  const showList = ready && !draft;

  return (
    <Screen>
      <PageHeader title="Medications" subtitle={parentMode ? undefined : "Today's doses, and whether they were taken."} />
      <View style={{ gap: space[6] }}>
        <ReadAloud text={spoken} />
        {meds.phase === "loading" ? <AppText tone="muted">Opening on this device.</AppText> : null}
        {meds.phase === "error" ? <AppText>{meds.message}</AppText> : null}
        {meds.phase === "ready" && !meds.canView ? (
          <EmptyState mark="locked" title="Not shared here" body="This isn't available on this device." />
        ) : null}
        {ready && draft ? (
          <Card>
            <AppText variant="heading">{draft.id ? "Edit medication" : "New medication"}</AppText>
            <Field label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Lisinopril" />
            <Field label="Dosage" value={draft.dosage} onChangeText={(dosage) => setDraft({ ...draft, dosage })} placeholder="10 mg" />
            <Field label="Time" value={draft.time} onChangeText={(time) => setDraft({ ...draft, time })} placeholder="08:00" />
            <Field label="Refill date" value={draft.refillOn} onChangeText={(refillOn) => setDraft({ ...draft, refillOn })} placeholder="Optional, 2026-12-01" />
            <AppText tone="muted">The time repeats every day on the calendar.</AppText>
            {formError ? <AppText>{formError}</AppText> : null}
            <ActionButton label="Save" onPress={save} />
            {draft.id ? (
              <ActionButton
                label="Remove"
                emphasis="quiet"
                onPress={() => {
                  const id = draft.id;
                  if (!id) return;
                  meds.remove(id).then(() => setDraft(null)).catch((error: unknown) => {
                    setFormError(error instanceof Error ? error.message : "The medication could not be removed.");
                  });
                }}
              />
            ) : null}
            <ActionButton label="Close" emphasis="quiet" onPress={() => setDraft(null)} />
          </Card>
        ) : null}
        {showList && meds.canEdit ? (
          <ActionButton
            label="Add a medication"
            onPress={() => {
              setFormError(null);
              setDraft({ name: "", time: "08:00", dosage: "", refillOn: "" });
            }}
          />
        ) : null}
        {showList && meds.items.length === 0 ? (
          <EmptyState mark="meds" title="No medications" body="Doses will appear here." />
        ) : null}
        {showList && meds.items.length > 0 ? (
          <View>
            {meds.items.map((item: MedicationItem) => (
              <HairlineRow key={item.id}>
                <Pressable
                  accessibilityRole={meds.canEdit ? "button" : "text"}
                  accessibilityLabel={`${item.name}, ${item.dosage}, every day at ${timeLabel(item.time)}`}
                  disabled={!meds.canEdit}
                  onPress={() => {
                    setFormError(null);
                    setDraft({ id: item.id, name: item.name, time: item.time, dosage: item.dosage, refillOn: item.refillOn });
                  }}
                >
                  <AppText variant="caption" tone="faint">
                    Every day · {timeLabel(item.time)}
                  </AppText>
                  <AppText variant="heading">{item.name}</AppText>
                  {item.dosage ? <AppText tone="muted">{item.dosage}</AppText> : null}
                  {item.refillOn ? <AppText variant="caption" tone="faint">Refill {dateLabel(item.refillOn)}</AppText> : null}
                  <AppText variant="caption" tone="faint">
                    {item.taken ? takenLabel(item.takenAt) : "Not taken yet"} · This week {item.weekTaken} of {item.weekDays}
                  </AppText>
                </Pressable>
                {meds.canEdit && !item.taken ? (
                  <ActionButton label="Mark taken" onPress={() => meds.take(item.id).catch((error: unknown) => setFormError(error instanceof Error ? error.message : "The dose could not be marked."))} />
                ) : null}
              </HairlineRow>
            ))}
          </View>
        ) : null}
        {formError && !draft ? <AppText>{formError}</AppText> : null}
        {meds.notice ? <AppText variant="caption" tone="faint">{meds.notice}</AppText> : null}
      </View>
      <AppText variant="caption" tone="faint">Private to your care circle.</AppText>
    </Screen>
  );
}
