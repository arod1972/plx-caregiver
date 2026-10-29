import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import { openJson, randomVaultKey, sealJson } from "@/lib/mesh/seal.mjs";
import type { AuditEntry, CareRecord, InviteRow, PackageRow, PeerRow, Store } from "../mesh/store-types";

const VAULT_KEY = "plx-caregiver.vault";

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY NOT NULL,
  collection TEXT NOT NULL,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY NOT NULL,
  device_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  body TEXT NOT NULL,
  UNIQUE (device_id, seq)
);
CREATE TABLE IF NOT EXISTS peers (
  device_id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY NOT NULL,
  body TEXT NOT NULL
);
`;

function reviveRecord(row: CareRecord): CareRecord {
  const fields = Object.create(null) as CareRecord["fields"];
  for (const [key, value] of Object.entries(row.fields ?? {})) fields[key] = value;
  return { ...row, fields };
}

export async function openSqliteStore(): Promise<Store> {
  const db = await SQLite.openDatabaseAsync("plx-caregiver.db");
  await db.execAsync(SCHEMA);
  const existingVault = await AsyncStorage.getItem(VAULT_KEY);
  const vault = existingVault && /^[0-9a-f]{64}$/i.test(existingVault) ? existingVault : randomVaultKey();
  if (vault !== existingVault) await AsyncStorage.setItem(VAULT_KEY, vault);

  const writeBody = (value: unknown) => JSON.stringify(sealJson(value, vault));
  const readBody = (stored: string): unknown => {
    try {
      const parsed = JSON.parse(stored) as { v?: number; iv?: string; data?: string };
      if (parsed && parsed.v === 1 && typeof parsed.iv === "string" && typeof parsed.data === "string") return openJson(parsed, vault);
      return parsed;
    } catch {
      return stored;
    }
  };

  return {
    async getMeta(key) {
      const rows = await db.getAllAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", key);
      return rows[0] ? String(readBody(rows[0].value)) : null;
    },
    async setMeta(key, value) {
      await db.runAsync("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, writeBody(value));
    },
    async getRecord(id) {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM records WHERE id = ?", id);
      return rows[0] ? reviveRecord(readBody(rows[0].body) as CareRecord) : null;
    },
    async putRecord(row) {
      await db.runAsync(
        "INSERT INTO records (id, collection, body) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET collection = excluded.collection, body = excluded.body",
        row.id,
        row.collection,
        writeBody(row),
      );
    },
    async listRecords(collection) {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM records WHERE collection = ?", collection);
      return rows.map((item) => reviveRecord(readBody(item.body) as CareRecord));
    },
    async putPackage(row) {
      await db.runAsync(
        "INSERT INTO packages (id, device_id, seq, body) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body",
        row.id,
        row.deviceId,
        row.seq,
        writeBody(row),
      );
    },
    async hasPackage(id) {
      const rows = await db.getAllAsync<{ id: string }>("SELECT id FROM packages WHERE id = ?", id);
      return rows.length > 0;
    },
    async maxSeq(deviceId) {
      const rows = await db.getAllAsync<{ seq: number }>("SELECT COALESCE(MAX(seq), 0) AS seq FROM packages WHERE device_id = ?", deviceId);
      return rows[0]?.seq ?? 0;
    },
    async packagesAfter(heads) {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM packages ORDER BY device_id, seq");
      return rows
        .map((item) => readBody(item.body) as PackageRow)
        .filter((item) => item.seq > (heads[item.deviceId] ?? 0));
    },
    async heads() {
      const rows = await db.getAllAsync<{ device_id: string; seq: number }>("SELECT device_id, MAX(seq) AS seq FROM packages GROUP BY device_id");
      const map: Record<string, number> = {};
      for (const row of rows) map[row.device_id] = row.seq;
      return map;
    },
    async getPeer(deviceId) {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM peers WHERE device_id = ?", deviceId);
      return rows[0] ? (readBody(rows[0].body) as PeerRow) : null;
    },
    async putPeer(row) {
      await db.runAsync(
        "INSERT INTO peers (device_id, body) VALUES (?, ?) ON CONFLICT(device_id) DO UPDATE SET body = excluded.body",
        row.deviceId,
        writeBody(row),
      );
    },
    async listPeers() {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM peers");
      return rows
        .map((item) => readBody(item.body) as PeerRow)
        .sort((a, b) => a.pairedAt.localeCompare(b.pairedAt));
    },
    async putInvite(row) {
      await db.runAsync(
        "INSERT INTO invites (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body",
        row.id,
        writeBody(row),
      );
    },
    async getInvite(id) {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM invites WHERE id = ?", id);
      return rows[0] ? (readBody(rows[0].body) as InviteRow) : null;
    },
    async appendAudit(entry) {
      await db.runAsync(
        "INSERT INTO audit (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body",
        entry.id,
        writeBody(entry),
      );
    },
    async listAudit() {
      const rows = await db.getAllAsync<{ body: string }>("SELECT body FROM audit");
      return rows.map((item) => readBody(item.body) as AuditEntry);
    },
  };
}
