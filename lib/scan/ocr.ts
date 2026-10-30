import { recognize } from "label-ocr";

export async function readLabelText(uri: string) {
  const text = (await recognize(uri)).replace(/\s+/g, " ").trim();
  if (!text) throw new Error("No text was found on that label.");
  return text;
}
