import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/components/theme";
import { ReadAloud } from "@/components/ReadAloud";
import { ActionButton, AppText, Card, EmptyState, Field, Screen, Wordmark } from "@/components/ui";
import { usePosts, type PostItem } from "@/lib/use-posts";

function whenLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function UpdatesHome() {
  const posts = usePosts();
  const { colors, parentMode, radius, space } = useTheme();
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
      <Wordmark />
      <AppText variant="title">Updates</AppText>
      {parentMode ? null : <AppText tone="muted">Care notes for the people allowed to see them.</AppText>}
      <ReadAloud text={spoken} />
      {posts.phase === "loading" ? (
        <Card>
          <AppText tone="muted">Opening updates on this device.</AppText>
        </Card>
      ) : null}
      {posts.phase === "error" ? (
        <Card>
          <AppText>{posts.message}</AppText>
        </Card>
      ) : null}
      {posts.phase === "ready" && !posts.canRead ? (
        <EmptyState title="Not shared here" body="A parent has not shared updates with this device." />
      ) : null}
      {posts.phase === "ready" && posts.canRead ? (
        <Card style={{ gap: space[4] }}>
          <Field label="Update" value={draft} onChangeText={setDraft} placeholder="What should the circle know?" multiline />
          {formError ? <AppText>{formError}</AppText> : null}
          <ActionButton label="Post" onPress={send} />
        </Card>
      ) : null}
      {posts.phase === "ready" && posts.canRead && posts.items.length === 0 ? (
        <EmptyState title="No updates yet" body="Family messages stay in this circle. They are not posted anywhere else." />
      ) : null}
      {posts.phase === "ready" && posts.canRead
        ? posts.items.map((item: PostItem) => (
            <View
              key={item.id}
              style={{
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                padding: space[4],
                gap: space[2],
              }}
            >
              <AppText variant="caption" tone="muted">
                {item.authorId === posts.me ? "You" : item.authorName}
                {item.sentAt ? ` · ${whenLabel(item.sentAt)}` : ""}
              </AppText>
              <AppText>{item.body}</AppText>
            </View>
          ))
        : null}
      {posts.notice ? <AppText variant="caption" tone="muted">{posts.notice}</AppText> : null}
      <AppText variant="caption" tone="muted">Private to your care circle.</AppText>
    </Screen>
  );
}
