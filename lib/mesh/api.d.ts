declare module "@/lib/mesh/repository.mjs" {
  export type CareRole = "parent" | "caregiver" | "family" | "viewer";
  export type PublicDevice = {
    id: string;
    name: string;
    publicKey: string;
    circleId: string;
    circleName: string;
    role: CareRole;
    primary: boolean;
    createdAt: string;
  };
  export type PublicPeer = { deviceId: string; name: string; pairedAt: string; role: CareRole };
  export type InviteResult = { invite: unknown; text: string };
  export type AcceptResult = {
    status: "paired" | "confirmed" | "synced";
    peer: PublicPeer;
    confirmation?: unknown;
    text?: string;
    accepted?: number;
  };

  export function ensureDevice(store: unknown, name?: string): Promise<PublicDevice & { secretKey: string }>;
  export function readDevice(store: unknown): Promise<(PublicDevice & { secretKey: string }) | null>;
  export function renameDevice(store: unknown, name: string): Promise<PublicDevice>;
  export function renameCircle(store: unknown, name: string): Promise<{ id: string; name: string }>;
  export function setMemberRole(store: unknown, deviceId: string, role: CareRole): Promise<CareRole>;
  export function listPeers(store: unknown): Promise<PublicPeer[]>;
  export function createInvite(store: unknown, role?: CareRole): Promise<InviteResult>;
  export function createUpdates(store: unknown): Promise<{ text: string }>;
  export function acceptPayload(store: unknown, text: string): Promise<AcceptResult>;
  export function listCollection(store: unknown, collection: string): Promise<Array<Record<string, unknown>>>;
}