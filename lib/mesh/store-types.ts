export type CareRecord = {
  id: string;
  collection: string;
  fields: Record<string, { value: unknown; lamport: number; deviceId: string }>;
  deleted: boolean;
  updatedAt: string;
};

export type PackageRow = {
  id: string;
  deviceId: string;
  seq: number;
  envelope: { package: { id: string }; signature: string };
};

export type PeerRow = {
  deviceId: string;
  name: string;
  publicKey: string;
  sharedSecret: string;
  pairedAt: string;
  circleId: string;
};

export type InviteRow = {
  id: string;
  exchangeSecret: string;
  exchangePublic: string;
  expiresAt: string;
  circleId: string;
};

export type Store = {
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
  getRecord(id: string): Promise<CareRecord | null>;
  putRecord(row: CareRecord): Promise<void>;
  listRecords(collection: string): Promise<CareRecord[]>;
  putPackage(row: PackageRow): Promise<void>;
  hasPackage(id: string): Promise<boolean>;
  maxSeq(deviceId: string): Promise<number>;
  packagesAfter(heads: Record<string, number>): Promise<PackageRow[]>;
  heads(): Promise<Record<string, number>>;
  getPeer(deviceId: string): Promise<PeerRow | null>;
  putPeer(row: PeerRow): Promise<void>;
  listPeers(): Promise<PeerRow[]>;
  putInvite(row: InviteRow): Promise<void>;
  getInvite(id: string): Promise<InviteRow | null>;
};
