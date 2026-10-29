export function clockBeats(next, prev) {
  if (!prev) return true;
  if (next.at && prev.at && next.at !== prev.at) return next.at > prev.at;
  if (next.lamport !== prev.lamport) return next.lamport > prev.lamport;
  return next.deviceId > prev.deviceId;
}

export function blankRecord(id, collection) {
  return {
    id,
    collection,
    fields: Object.create(null),
    deleted: false,
    updatedAt: "",
  };
}

export function applyOp(record, op) {
  if (record && record.collection !== op.collection) throw new Error("Record belongs to another collection");
  const base = record ?? blankRecord(op.recordId, op.collection);
  const clock = { lamport: op.lamport, deviceId: op.deviceId, at: op.at };
  if (op.field === "_deleted") {
    const prev = base.fields._deleted;
    if (clockBeats(clock, prev)) {
      base.fields._deleted = { value: true, ...clock };
      base.deleted = true;
      base.updatedAt = op.at;
    }
    return base;
  }
  const tomb = base.fields._deleted;
  if (tomb && !clockBeats(clock, tomb)) return base;
  if (tomb && clockBeats(clock, tomb)) {
    delete base.fields._deleted;
    base.deleted = false;
  }
  const prev = base.fields[op.field];
  if (clockBeats(clock, prev)) {
    base.fields[op.field] = { value: op.value, ...clock };
    base.updatedAt = op.at;
  }
  return base;
}

export function materialize(record) {
  if (!record || record.deleted) return null;
  const value = { id: record.id, collection: record.collection };
  for (const [key, field] of Object.entries(record.fields)) {
    if (key === "_deleted") continue;
    value[key] = field.value;
  }
  return value;
}
