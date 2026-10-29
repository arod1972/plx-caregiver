import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, EmptyState, Field, Masthead, Screen, useChrome } from "@/components/ui";
import { usePosts, type PostItem } from "@/lib/use-posts";

function whenLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function UpdatesHome() {
  const posts = usePosts();
  const { parentMode, space } = useTheme();
  const chrome = useChrome("snug");
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
      <Masthead title="Updates" lede={parentMode ? undefined : "Notes for this circle."} />
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
        <EmptyState title="No notes yet" body="Family updates will appear here." icon="message-circle" />
      ) : null}
      {posts.phase === "ready" && posts.canRead && posts.items.length > 0 ? (
        <View style={{ gap: space[4] }}>
          {posts.items.map((item: PostItem) => (
            <View key={item.id} style={chrome}>
              <AppText variant="caption" tone="faint">
                {item.authorId === posts.me ? "You" : item.authorName}
                {item.sentAt ? ` · ${whenLabel(item.sentAt)}` : ""}
              </AppText>
              <AppText>{item.body}</AppText>
            </View>
          ))}
        </View>
      ) : null}
      {posts.notice ? <AppText variant="caption" tone="faint">{posts.notice}</AppText> : null}
      <AppText variant="caption" tone="faint">Private to this circle.</AppText>
    </Screen>
  );
}
