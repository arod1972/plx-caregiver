import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, EmptyState, Field, Screen, Wordmark } from "@/components/ui";
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
  const { colors, parentMode, radius, space } = useTheme();
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

  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Medications</AppText>
      {parentMode ? null : <AppText tone="muted">Name, dosage, daily time, and whether today's dose was taken.</AppText>}
      <ReadAloud text={spoken} />
      {meds.phase === "loading" ? (
        <Card>
          <AppText tone="muted">Opening medications on this device.</AppText>
        </Card>
      ) : null}
      {meds.phase === "error" ? (
        <Card>
          <AppText>{meds.message}</AppText>
        </Card>
      ) : null}
      {meds.phase === "ready" && !meds.canView ? (
        <EmptyState title="Not shared here" body="A parent has not shared medications with this device." />
      ) : null}
      {meds.phase === "ready" && meds.canView && draft ? (
        <Card style={{ gap: space[4] }}>
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
      {meds.phase === "ready" && meds.canView && !draft && meds.canEdit ? (
        <ActionButton
          label="Add a medication"
          onPress={() => {
            setFormError(null);
            setDraft({ name: "", time: "08:00", dosage: "", refillOn: "" });
          }}
        />
      ) : null}
      {meds.phase === "ready" && meds.canView && !draft && meds.items.length === 0 ? (
        <EmptyState title="No medications yet" body="Add a name, a dosage, and a time. The circle will see it here and on the calendar." />
      ) : null}
      {meds.phase === "ready" && meds.canView && !draft
        ? meds.items.map((item: MedicationItem) => (
            <View
              key={item.id}
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                padding: space[4],
                gap: space[3],
              }}
            >
              <Pressable
                accessibilityRole={meds.canEdit ? "button" : "text"}
                accessibilityLabel={`${item.name}, ${item.dosage}, every day at ${timeLabel(item.time)}`}
                disabled={!meds.canEdit}
                onPress={() => {
                  setFormError(null);
                  setDraft({ id: item.id, name: item.name, time: item.time, dosage: item.dosage, refillOn: item.refillOn });
                }}
              >
                <AppText variant="caption" tone="muted">
                  Every day · {timeLabel(item.time)}
                </AppText>
                <AppText variant="heading">{item.name}</AppText>
                {item.dosage ? <AppText tone="muted">{item.dosage}</AppText> : null}
                {item.refillOn ? <AppText variant="caption" tone="muted">Refill {dateLabel(item.refillOn)}</AppText> : null}
                <AppText variant="caption" tone="muted">
                  {item.taken ? takenLabel(item.takenAt) : "Not taken yet"} · This week {item.weekTaken} of {item.weekDays}
                </AppText>
              </Pressable>
              {meds.canEdit && !item.taken ? (
                <ActionButton label="Mark taken" onPress={() => meds.take(item.id).catch((error: unknown) => setFormError(error instanceof Error ? error.message : "The dose could not be marked."))} />
              ) : null}
            </View>
          ))
        : null}
      {formError && !draft ? <AppText>{formError}</AppText> : null}
      {meds.notice ? (
        <AppText variant="caption" tone="muted">
          {meds.notice}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="muted">
        Private to your care circle.
      </AppText>
    </Screen>
  );
}
