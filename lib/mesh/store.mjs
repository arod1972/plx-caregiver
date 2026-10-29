import { openJson, randomVaultKey, sealJson } from "./seal.mjs";

export function createMemoryStore() {
  const meta = new Map();
  const records = new Map();
  const packages = [];
  const peers = new Map();
  const invites = new Map();
  const audit = [];

  return {
    async getMeta(key) {
      return meta.has(key) ? meta.get(key) : null;
    },
    async setMeta(key, value) {
      meta.set(key, value);
    },
    async getRecord(id) {
      return records.get(id) ?? null;
    },
    async putRecord(row) {
      records.set(row.id, row);
    },
    async listRecords(collection) {
      return [...records.values()].filter((row) => row.collection === collection);
    },
    async putPackage(row) {
      const index = packages.findIndex((item) => item.id === row.id);
      if (index >= 0) packages[index] = row;
      else packages.push(row);
    },
    async hasPackage(id) {
      return packages.some((item) => item.id === id);
    },
    async maxSeq(deviceId) {
      return packages.filter((item) => item.deviceId === deviceId).reduce((max, item) => Math.max(max, item.seq), 0);
    },
    async packagesAfter(heads) {
      return packages
        .filter((item) => item.seq > (heads[item.deviceId] ?? 0))
        .sort((a, b) => (a.deviceId === b.deviceId ? a.seq - b.seq : a.deviceId < b.deviceId ? -1 : 1));
    },
    async heads() {
      const map = {};
      for (const item of packages) map[item.deviceId] = Math.max(map[item.deviceId] ?? 0, item.seq);
      return map;
    },
    async getPeer(deviceId) {
      return peers.get(deviceId) ?? null;
    },
    async putPeer(row) {
      peers.set(row.deviceId, row);
    },
    async listPeers() {
      return [...peers.values()].sort((a, b) => a.pairedAt.localeCompare(b.pairedAt));
    },
    async putInvite(row) {
      invites.set(row.id, row);
    },
    async getInvite(id) {
      return invites.get(id) ?? null;
    },
    async appendAudit(entry) {
      audit.push(entry);
    },
    async listAudit() {
      return audit.map((entry) => ({ ...entry }));
    },
    dump() {
      return {
        meta: [...meta.entries()],
        records: [...records.values()],
        packages,
        peers: [...peers.values()],
        invites: [...invites.values()],
        audit,
      };
    },
    load(snapshot) {
      meta.clear();
      records.clear();
      packages.length = 0;
      peers.clear();
      invites.clear();
      audit.length = 0;
      for (const [key, value] of snapshot.meta ?? []) meta.set(key, value);
      for (const row of snapshot.records ?? []) records.set(row.id, reviveRecord(row));
      packages.push(...(snapshot.packages ?? []));
      for (const row of snapshot.peers ?? []) peers.set(row.deviceId, row);
      for (const row of snapshot.invites ?? []) invites.set(row.id, row);
      audit.push(...(snapshot.audit ?? []));
    },
  };
}

function reviveRecord(row) {
  const fields = Object.create(null);
  for (const [key, value] of Object.entries(row.fields ?? {})) fields[key] = value;
  return { ...row, fields };
}

export function createPersistedStore(storage, key) {
  const store = createMemoryStore();
  const vaultName = "plx-caregiver.vault";
  let vault = storage.getItem(vaultName);
  if (!vault || !/^[0-9a-f]{64}$/i.test(vault)) {
    vault = randomVaultKey();
    storage.setItem(vaultName, vault);
  }
  const raw = storage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      store.load(parsed && parsed.v === 1 && parsed.data && parsed.iv ? openJson(parsed, vault) : parsed);
    } catch {
      storage.removeItem(key);
    }
  }
  const save = () => storage.setItem(key, JSON.stringify(sealJson(store.dump(), vault)));
  for (const name of ["setMeta", "putRecord", "putPackage", "putPeer", "putInvite", "appendAudit"]) {
    const original = store[name];
    store[name] = async (...args) => {
      const result = await original(...args);
      save();
      return result;
    };
  }
  return store;
}
