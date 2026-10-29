import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, ChoiceGroup, EmptyState, Field, Screen, Wordmark } from "@/components/ui";
import { useTasks, type TaskItem } from "@/lib/use-tasks";

type Draft = { id?: string; title: string; notes: string; assignee: string; dueOn: string; status?: TaskItem["status"] };

function dayLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(new Date(year, month - 1, day));
}

function doneLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Done";
  return `Done ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(date)}`;
}

export function TasksHome() {
  const tasks = useTasks();
  const { colors, parentMode, radius, space } = useTheme();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const openItems = tasks.items.filter((item) => item.status !== "done");
  const doneItems = tasks.items.filter((item) => item.status === "done");
  const choices = [{ value: "", label: "No one yet" }, ...tasks.people.map((person) => ({ value: person.id, label: person.id === tasks.me ? "Me" : person.name }))];

  const save = () => {
    if (!draft) return;
    setFormError(null);
    tasks
      .save(draft)
      .then(() => setDraft(null))
      .catch((error: unknown) => setFormError(error instanceof Error ? error.message : "The task could not be saved."));
  };

  const spoken =
    tasks.phase !== "ready"
      ? "Tasks are still opening."
      : !tasks.canView
        ? "Tasks are not shared with this device."
        : tasks.items.length === 0
          ? "There are no tasks."
          : `Tasks. ${tasks.items
              .map((item) => {
                const owner = item.assignee === tasks.me ? "assigned to you" : item.assigneeName ? `assigned to ${item.assigneeName}` : "open";
                return item.status === "done" ? `${item.title}, done.` : `${item.title}, ${owner}.`;
              })
              .join(" ")}`;

  const card = {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: space[4],
    gap: space[3],
  };

  return (
    <Screen>
      <Wordmark />
      <AppText variant="title">Tasks</AppText>
      {parentMode ? null : <AppText tone="muted">Errands, rides, meals, and follow-ups, with a clear owner.</AppText>}
      <ReadAloud text={spoken} />
      {tasks.phase === "loading" ? (
        <Card>
          <AppText tone="muted">Opening tasks on this device.</AppText>
        </Card>
      ) : null}
      {tasks.phase === "error" ? (
        <Card>
          <AppText>{tasks.message}</AppText>
        </Card>
      ) : null}
      {tasks.phase === "ready" && !tasks.canView ? (
        <EmptyState title="Not shared here" body="A parent has not shared tasks with this device." />
      ) : null}
      {tasks.phase === "ready" && tasks.canView && draft ? (
        <Card style={{ gap: space[4] }}>
          <AppText variant="heading">{draft.id ? "Edit task" : "New task"}</AppText>
          <Field label="Title" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} placeholder="Pick up the prescription" />
          <Field label="Notes" value={draft.notes} onChangeText={(notes) => setDraft({ ...draft, notes })} placeholder="Optional" />
          <ChoiceGroup label="Assign to" value={draft.assignee} onChange={(assignee) => setDraft({ ...draft, assignee })} options={choices} />
          <Field label="Due date" value={draft.dueOn} onChangeText={(dueOn) => setDraft({ ...draft, dueOn })} placeholder="Optional, 2026-11-03" />
          {formError ? <AppText>{formError}</AppText> : null}
          <ActionButton label="Save" onPress={save} />
          {draft.id && draft.status !== "done" ? (
            <ActionButton
              label="Remove"
              emphasis="quiet"
              onPress={() => {
                const id = draft.id;
                if (!id) return;
                tasks.remove(id).then(() => setDraft(null)).catch((error: unknown) => {
                  setFormError(error instanceof Error ? error.message : "The task could not be removed.");
                });
              }}
            />
          ) : null}
          <ActionButton label="Close" emphasis="quiet" onPress={() => setDraft(null)} />
        </Card>
      ) : null}
      {tasks.phase === "ready" && tasks.canView && !draft && tasks.canEdit ? (
        <ActionButton
          label="Add a task"
          onPress={() => {
            setFormError(null);
            setDraft({ title: "", notes: "", assignee: "", dueOn: "" });
          }}
        />
      ) : null}
      {tasks.phase === "ready" && tasks.canView && !draft && openItems.length === 0 ? (
        <EmptyState title="No open tasks" body="When something needs doing, it will show up here with who is taking it." />
      ) : null}
      {tasks.phase === "ready" && tasks.canView && !draft
        ? openItems.map((item) => {
            const owner = item.assignee === tasks.me ? "Assigned to you" : item.assigneeName ? `Assigned to ${item.assigneeName}` : "Open";
            const due = item.dueOn ? `Due ${dayLabel(item.dueOn)}` : "";
            const canComplete = tasks.canEdit || item.assignee === tasks.me;
            return (
              <View key={item.id} style={card}>
                <Pressable accessibilityRole={tasks.canEdit ? "button" : "text"} accessibilityLabel={item.title} disabled={!tasks.canEdit} onPress={() => setDraft({ id: item.id, title: item.title, notes: item.notes, assignee: item.assignee, dueOn: item.dueOn, status: item.status })}>
                  <AppText variant="caption" tone="muted">{[owner, due].filter(Boolean).join(" · ")}</AppText>
                  <AppText variant="heading">{item.title}</AppText>
                  {item.notes ? <AppText tone="muted">{item.notes}</AppText> : null}
                </Pressable>
                {canComplete ? <ActionButton label="Mark done" onPress={() => tasks.complete(item.id).catch(() => undefined)} /> : null}
              </View>
            );
          })
        : null}
      {tasks.phase === "ready" && tasks.canView && !draft && doneItems.length > 0 ? <AppText variant="label">Done</AppText> : null}
      {tasks.phase === "ready" && tasks.canView && !draft
        ? doneItems.map((item) => (
            <View key={item.id} style={card}>
              <AppText variant="caption" tone="muted">{doneLabel(item.completedAt)}{item.assigneeName ? ` · ${item.assigneeName}` : ""}</AppText>
              <AppText variant="heading">{item.title}</AppText>
              {item.notes ? <AppText tone="muted">{item.notes}</AppText> : null}
              {tasks.canEdit ? <ActionButton label="Reopen" emphasis="quiet" onPress={() => tasks.reopen(item.id).catch(() => undefined)} /> : null}
            </View>
          ))
        : null}
      {tasks.notice ? <AppText variant="caption" tone="muted">{tasks.notice}</AppText> : null}
      <AppText variant="caption" tone="muted">Private to your care circle.</AppText>
    </Screen>
  );
}
