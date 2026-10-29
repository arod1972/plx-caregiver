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

  const sql = {
    getMeta: await db.prepareAsync("SELECT value FROM meta WHERE key = ?"),
    setMeta: await db.prepareAsync("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"),
    getRecord: await db.prepareAsync("SELECT body FROM records WHERE id = ?"),
    putRecord: await db.prepareAsync(
      "INSERT INTO records (id, collection, body) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET collection = excluded.collection, body = excluded.body",
    ),
    listRecords: await db.prepareAsync("SELECT body FROM records WHERE collection = ?"),
    putPackage: await db.prepareAsync(
      "INSERT INTO packages (id, device_id, seq, body) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body",
    ),
    hasPackage: await db.prepareAsync("SELECT id FROM packages WHERE id = ?"),
    maxSeq: await db.prepareAsync("SELECT COALESCE(MAX(seq), 0) AS seq FROM packages WHERE device_id = ?"),
    packagesAfter: await db.prepareAsync("SELECT body FROM packages ORDER BY device_id, seq"),
    heads: await db.prepareAsync("SELECT device_id, MAX(seq) AS seq FROM packages GROUP BY device_id"),
    getPeer: await db.prepareAsync("SELECT body FROM peers WHERE device_id = ?"),
    putPeer: await db.prepareAsync("INSERT INTO peers (device_id, body) VALUES (?, ?) ON CONFLICT(device_id) DO UPDATE SET body = excluded.body"),
    listPeers: await db.prepareAsync("SELECT body FROM peers"),
    putInvite: await db.prepareAsync("INSERT INTO invites (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body"),
    getInvite: await db.prepareAsync("SELECT body FROM invites WHERE id = ?"),
    appendAudit: await db.prepareAsync("INSERT INTO audit (id, body) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body"),
    listAudit: await db.prepareAsync("SELECT body FROM audit"),
  };

  let chain: Promise<void> = Promise.resolve();
  const run = <T>(work: () => Promise<T>) => {
    const result = chain.then(work, work);
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  async function all<T>(statement: SQLite.SQLiteStatement, ...params: SQLite.SQLiteBindValue[]) {
    const result = await statement.executeAsync(...params);
    return (await result.getAllAsync()) as T[];
  }

  async function write(statement: SQLite.SQLiteStatement, ...params: SQLite.SQLiteBindValue[]) {
    await statement.executeAsync(...params);
  }

  return {
    async getMeta(key) {
      return run(async () => {
        const rows = await all<{ value: string }>(sql.getMeta, key);
        return rows[0] ? String(readBody(rows[0].value)) : null;
      });
    },
    async setMeta(key, value) {
      return run(() => write(sql.setMeta, key, writeBody(value)));
    },
    async getRecord(id) {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.getRecord, id);
        return rows[0] ? reviveRecord(readBody(rows[0].body) as CareRecord) : null;
      });
    },
    async putRecord(row) {
      return run(() => write(sql.putRecord, row.id, row.collection, writeBody(row)));
    },
    async listRecords(collection) {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.listRecords, collection);
        return rows.map((item) => reviveRecord(readBody(item.body) as CareRecord));
      });
    },
    async putPackage(row) {
      return run(() => write(sql.putPackage, row.id, row.deviceId, row.seq, writeBody(row)));
    },
    async hasPackage(id) {
      return run(async () => (await all<{ id: string }>(sql.hasPackage, id)).length > 0);
    },
    async maxSeq(deviceId) {
      return run(async () => {
        const rows = await all<{ seq: number }>(sql.maxSeq, deviceId);
        return rows[0]?.seq ?? 0;
      });
    },
    async packagesAfter(heads) {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.packagesAfter);
        return rows
          .map((item) => readBody(item.body) as PackageRow)
          .filter((item) => item.seq > (heads[item.deviceId] ?? 0));
      });
    },
    async heads() {
      return run(async () => {
        const rows = await all<{ device_id: string; seq: number }>(sql.heads);
        const map: Record<string, number> = {};
        for (const row of rows) map[row.device_id] = row.seq;
        return map;
      });
    },
    async getPeer(deviceId) {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.getPeer, deviceId);
        return rows[0] ? (readBody(rows[0].body) as PeerRow) : null;
      });
    },
    async putPeer(row) {
      return run(() => write(sql.putPeer, row.deviceId, writeBody(row)));
    },
    async listPeers() {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.listPeers);
        return rows.map((item) => readBody(item.body) as PeerRow).sort((a, b) => a.pairedAt.localeCompare(b.pairedAt));
      });
    },
    async putInvite(row) {
      return run(() => write(sql.putInvite, row.id, writeBody(row)));
    },
    async getInvite(id) {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.getInvite, id);
        return rows[0] ? (readBody(rows[0].body) as InviteRow) : null;
      });
    },
    async appendAudit(entry) {
      return run(() => write(sql.appendAudit, entry.id, writeBody(entry)));
    },
    async listAudit() {
      return run(async () => {
        const rows = await all<{ body: string }>(sql.listAudit);
        return rows.map((item) => readBody(item.body) as AuditEntry);
      });
    },
  };
}
