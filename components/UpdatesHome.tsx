import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, EmptyState, Field, HairlineRow, PageHeader, Screen } from "@/components/ui";
import { usePosts, type PostItem } from "@/lib/use-posts";

function whenLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function UpdatesHome() {
  const posts = usePosts();
  const { parentMode, space } = useTheme();
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const send = () => {
    setFormError(null);
    posts.send(draft).then(() => setDraft("")).catch((error: unknown) => {
      setFormError(error instanceof Error ? error.message : "The update could not be posted.");
    });
  };

  const spoken =
    posts.phase !== "ready"
      ? "Updates are still opening."
      : !posts.canRead
        ? "Updates are not shared with this device."
        : posts.items.length === 0
          ? "There are no notes yet."
          : `Updates. ${posts.items
              .slice(-8)
              .map((item) => `${item.authorId === posts.me ? "You" : item.authorName} said ${item.body}`)
              .join(". ")}`;

  const ready = posts.phase === "ready" && posts.canRead;

  return (
    <Screen>
      <PageHeader title="Updates" subtitle={parentMode ? undefined : "Notes for the people in this circle."} />
      <View style={{ gap: space[6] }}>
        <ReadAloud text={spoken} />
        {posts.phase === "loading" ? <AppText tone="muted">Opening on this device.</AppText> : null}
        {posts.phase === "error" ? <AppText>{posts.message}</AppText> : null}
        {posts.phase === "ready" && !posts.canRead ? (
          <EmptyState mark="locked" title="Not shared here" body="This isn't available on this device." />
        ) : null}
        {ready ? (
          <Card>
            <Field label="Update" value={draft} onChangeText={setDraft} placeholder="What should the circle know?" multiline />
            {formError ? <AppText>{formError}</AppText> : null}
            <ActionButton label="Post" onPress={send} />
          </Card>
        ) : null}
        {ready && posts.items.length === 0 ? (
          <EmptyState mark="updates" title="No notes yet" body="Updates for the circle will appear here." />
        ) : null}
        {ready && posts.items.length > 0 ? (
          <View>
            {posts.items.map((item: PostItem) => (
              <HairlineRow key={item.id}>
                <AppText variant="caption" tone="faint">
                  {item.authorId === posts.me ? "You" : item.authorName}
                  {item.sentAt ? ` · ${whenLabel(item.sentAt)}` : ""}
                </AppText>
                <AppText>{item.body}</AppText>
              </HairlineRow>
            ))}
          </View>
        ) : null}
        {posts.notice ? <AppText variant="caption" tone="faint">{posts.notice}</AppText> : null}
      </View>
      <AppText variant="caption" tone="faint">Private to your care circle.</AppText>
    </Screen>
  );
}
