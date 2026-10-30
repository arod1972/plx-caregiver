import { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, ChoiceGroup, EmptyState, Field, Group, Mark, PageHeader, Row, Screen, SectionLabel } from "@/components/ui";
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
  const { parentMode, space } = useTheme();
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

  return (
    <Screen>
      <PageHeader
        title="Tasks"
        lede={parentMode ? undefined : "Errands, rides, and follow-ups."}
        onAdd={
          tasks.phase === "ready" && tasks.canView && tasks.canEdit && !draft
            ? () => {
                setFormError(null);
                setDraft({ title: "", notes: "", assignee: "", dueOn: "" });
              }
            : undefined
        }
        addLabel="Add a task"
      />
      <ReadAloud text={spoken} />
      {tasks.phase === "loading" ? <AppText tone="muted">Opening tasks.</AppText> : null}
      {tasks.phase === "error" ? (
        <Card>
          <AppText>{tasks.message}</AppText>
        </Card>
      ) : null}
      {tasks.phase === "ready" && !tasks.canView ? (
        <EmptyState title="Not shared" body="Tasks aren’t on this device." icon="eye-off" />
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
      {tasks.phase === "ready" && tasks.canView && !draft && openItems.length === 0 ? (
        <Group>
          <View style={{ padding: space[4] }}>
            <EmptyState title="Nothing to do" body="Errands and follow-ups will appear here." icon="check-square" />
          </View>
        </Group>
      ) : null}
      {tasks.phase === "ready" && tasks.canView && !draft && openItems.length > 0 ? (
        <Group>
          {openItems.map((item, index) => {
            const owner = item.assignee === tasks.me ? "Assigned to you" : item.assigneeName ? item.assigneeName : "Open";
            const due = item.dueOn ? `Due ${dayLabel(item.dueOn)}` : "";
            const canComplete = tasks.canEdit || item.assignee === tasks.me;
            return (
              <Row
                key={item.id}
                last={index === openItems.length - 1}
                label={tasks.canEdit ? `Edit ${item.title}` : item.title}
                onPress={
                  tasks.canEdit
                    ? () => setDraft({ id: item.id, title: item.title, notes: item.notes, assignee: item.assignee, dueOn: item.dueOn, status: item.status })
                    : undefined
                }
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="heading">{item.title}</AppText>
                  <AppText variant="caption" tone="muted">{[owner, due].filter(Boolean).join(" · ")}</AppText>
                  {item.notes ? <AppText tone="muted">{item.notes}</AppText> : null}
                </View>
                <Mark
                  done={false}
                  label={`Mark ${item.title} done`}
                  onPress={canComplete ? () => tasks.complete(item.id).catch(() => undefined) : undefined}
                />
              </Row>
            );
          })}
        </Group>
      ) : null}
      {tasks.phase === "ready" && tasks.canView && !draft && doneItems.length > 0 ? (
        <View style={{ gap: space[3] }}>
          <SectionLabel>Done</SectionLabel>
          <Group>
            {doneItems.map((item, index) => (
              <Row key={item.id} last={index === doneItems.length - 1}>
                <Mark done label={doneLabel(item.completedAt)} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="heading">{item.title}</AppText>
                  <AppText variant="caption" tone="muted">
                    {doneLabel(item.completedAt)}
                    {item.assigneeName ? ` · ${item.assigneeName}` : ""}
                  </AppText>
                  {item.notes ? <AppText tone="muted">{item.notes}</AppText> : null}
                  {tasks.canEdit ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Reopen ${item.title}`} onPress={() => tasks.reopen(item.id).catch(() => undefined)}>
                      <AppText variant="label" tone="accent">Reopen</AppText>
                    </Pressable>
                  ) : null}
                </View>
              </Row>
            ))}
          </Group>
        </View>
      ) : null}
      {tasks.notice ? <AppText variant="caption" tone="faint">{tasks.notice}</AppText> : null}
      <AppText variant="caption" tone="faint">Private to this circle.</AppText>
    </Screen>
  );
}
