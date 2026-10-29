declare module "@/lib/mesh/repository.mjs" {
  export type PublicDevice = {
    id: string;
    name: string;
    publicKey: string;
    circleId: string;
    createdAt: string;
  };
  export type PublicPeer = { deviceId: string; name: string; pairedAt: string };
  export type InviteResult = { invite: unknown; text: string };
  export type AcceptResult = {
    status: "paired" | "confirmed";
    peer: PublicPeer;
    confirmation?: unknown;
    text?: string;
  };

  export function ensureDevice(store: unknown, name?: string): Promise<PublicDevice & { secretKey: string }>;
  export function renameDevice(store: unknown, name: string): Promise<PublicDevice>;
  export function listPeers(store: unknown): Promise<PublicPeer[]>;
  export function createInvite(store: unknown): Promise<InviteResult>;
  export function acceptPayload(store: unknown, text: string): Promise<AcceptResult>;
  export function listCollection(store: unknown, collection: string): Promise<Array<Record<string, unknown>>>;
}

declare module "uqr" {
  export function encode(text: string): { size: number; data: boolean[][] };
}
