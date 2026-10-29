import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ActionButton, AppText, Card, EmptyState, Field, Screen, Wordmark } from "@/components/ui";
import { useMeds, type MedicationItem } from "@/lib/use-meds";

function timeLabel(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hours, minutes));
}

type Draft = { id?: string; name: string; time: string };

export function MedsHome() {
  const meds = useMeds();
  const { colors, radius, space } = useTheme();
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

  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Medications</AppText>
      <AppText tone="muted">Times that also appear on the calendar. Every day, for this circle.</AppText>
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
          <Field label="Name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Morning lisinopril" />
          <Field label="Time" value={draft.time} onChangeText={(time) => setDraft({ ...draft, time })} placeholder="08:00" />
          <AppText tone="muted">It shows every day on the calendar.</AppText>
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
            setDraft({ name: "", time: "08:00" });
          }}
        />
      ) : null}
      {meds.phase === "ready" && meds.canView && !draft && meds.items.length === 0 ? (
        <EmptyState title="No medications yet" body="Add a name and a time. The circle will see it on the calendar." />
      ) : null}
      {meds.phase === "ready" && meds.canView && !draft
        ? meds.items.map((item: MedicationItem) => (
            <Pressable
              key={item.id}
              accessibilityRole={meds.canEdit ? "button" : "text"}
              accessibilityLabel={`${item.name}, every day at ${timeLabel(item.time)}`}
              disabled={!meds.canEdit}
              onPress={() => {
                setFormError(null);
                setDraft({ id: item.id, name: item.name, time: item.time });
              }}
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                padding: space[4],
                gap: space[1],
              }}
            >
              <AppText variant="caption" tone="muted">
                Every day · {timeLabel(item.time)}
              </AppText>
              <AppText variant="heading">{item.name}</AppText>
            </Pressable>
          ))
        : null}
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
