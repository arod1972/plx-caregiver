export function matchLabel(text, meds) {
  const hay = normalize(text);
  if (!hay) return null;
  const words = hay.split(" ").filter(Boolean);
  let best = null;
  for (const med of meds ?? []) {
    const name = normalize(med?.name ?? "");
    const tokens = nameTokens(name);
    if (!tokens.length) continue;
    const hits = tokens.filter((token) => tokenHit(token, hay, words)).length;
    const score = hits / tokens.length;
    if (score < 0.8) continue;
    if (!best || score > best.score || (score === best.score && name.length > best.name.length)) {
      best = { med, score, name };
    }
  }
  if (!best) return null;
  return {
    id: best.med.id,
    name: best.med.name,
    dosage: String(best.med.dosage ?? ""),
    time: String(best.med.time ?? ""),
  };
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameTokens(name) {
  const tokens = name.split(" ").filter((token) => token.length >= 3);
  if (tokens.length) return tokens;
  return name.length >= 3 ? [name] : [];
}

function tokenHit(token, hay, words) {
  if (hay.includes(token)) return true;
  return words.some((word) => editDistanceAtMostOne(token, word));
}

function editDistanceAtMostOne(left, right) {
  if (left === right) return true;
  if (left.length < 5 || right.length < 5 || Math.abs(left.length - right.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length === right.length) {
      i += 1;
      j += 1;
    } else if (left.length > right.length) i += 1;
    else j += 1;
  }
  if (i < left.length || j < right.length) edits += 1;
  return edits <= 1;
}
