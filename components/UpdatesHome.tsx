import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, EmptyState, Field, Group, PageHeader, Row, Screen } from "@/components/ui";
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
          ? "There are no updates yet."
          : `Updates. ${posts.items
              .slice(-8)
              .map((item) => `${item.authorId === posts.me ? "You" : item.authorName} said ${item.body}`)
              .join(". ")}`;

  return (
    <Screen>
      <PageHeader title="Updates" lede={parentMode ? undefined : "A short note for the people in this circle."} />
      <ReadAloud text={spoken} />
      {posts.phase === "loading" ? <AppText tone="muted">Opening updates.</AppText> : null}
      {posts.phase === "error" ? (
        <Card>
          <AppText>{posts.message}</AppText>
        </Card>
      ) : null}
      {posts.phase === "ready" && !posts.canRead ? (
        <EmptyState title="Not shared" body="Updates aren’t on this device." icon="eye-off" />
      ) : null}
      {posts.phase === "ready" && posts.canRead ? (
        <Card style={{ gap: space[4] }}>
          <Field label="Update" value={draft} onChangeText={setDraft} placeholder="What should the circle know?" multiline />
          {formError ? <AppText>{formError}</AppText> : null}
          <ActionButton label="Post" onPress={send} />
        </Card>
      ) : null}
      {posts.phase === "ready" && posts.canRead && posts.items.length === 0 ? (
        <EmptyState title="No notes yet" body="The first update will show up here." icon="message-circle" />
      ) : null}
      {posts.phase === "ready" && posts.canRead && posts.items.length > 0 ? (
        <Group>
          {posts.items.map((item: PostItem, index) => (
            <Row key={item.id} last={index === posts.items.length - 1}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="caption" tone="muted">
                  {item.authorId === posts.me ? "You" : item.authorName}
                  {item.sentAt ? ` · ${whenLabel(item.sentAt)}` : ""}
                </AppText>
                <AppText>{item.body}</AppText>
              </View>
            </Row>
          ))}
        </Group>
      ) : null}
      {posts.notice ? <AppText variant="caption" tone="faint">{posts.notice}</AppText> : null}
      <AppText variant="caption" tone="faint">Private to this circle.</AppText>
    </Screen>
  );
}
