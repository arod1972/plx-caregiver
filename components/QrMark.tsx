import { View } from "react-native";
import { encode } from "uqr";
import { useTheme } from "@/components/theme";

export function QrMark({ text }: { text: string }) {
  const { radius } = useTheme();
  const { data } = encode(text);
  const quiet = 2;
  const cells = data.length + quiet * 2;
  const size = 220;

  return (
    <View
      accessibilityLabel="Pairing code"
      style={{
        width: size,
        height: size,
        alignSelf: "center",
        backgroundColor: "#FBF9F6",
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: "#E3DCD2",
        padding: 8,
      }}
    >
      <View style={{ flex: 1, flexDirection: "column" }}>
        {Array.from({ length: cells }, (_, row) => (
          <View key={row} style={{ flex: 1, flexDirection: "row" }}>
            {Array.from({ length: cells }, (_, column) => {
              const inside = row >= quiet && column >= quiet && row < cells - quiet && column < cells - quiet;
              const filled = inside && data[row - quiet]?.[column - quiet];
              return <View key={column} style={{ flex: 1, backgroundColor: filled ? "#24302B" : "#FBF9F6" }} />;
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
