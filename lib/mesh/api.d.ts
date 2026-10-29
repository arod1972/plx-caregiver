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
  export type AccessLevel = "edit" | "view" | "none";
  export type MemberAccess = "role" | AccessLevel;
  export type Sharing = {
    roles: Record<CareRole, { view: boolean; edit: boolean }>;
    members: Record<string, MemberAccess>;
  };

  export function readSharing(store: unknown): Promise<Sharing>;
  export function resolveAccess(
    sharing: Sharing,
    role: CareRole,
    deviceId?: string,
  ): { view: boolean; edit: boolean };
  export function setRoleAccess(store: unknown, role: CareRole, level: AccessLevel): Promise<Sharing>;
  export function setMemberAccess(store: unknown, deviceId: string, level: MemberAccess): Promise<Sharing>;
  export function listPeers(store: unknown): Promise<PublicPeer[]>;
  export function createInvite(store: unknown, role?: CareRole): Promise<InviteResult>;
  export function createUpdates(store: unknown): Promise<{ text: string }>;
  export function acceptPayload(store: unknown, text: string): Promise<AcceptResult>;
  export function listCollection(store: unknown, collection: string): Promise<Array<Record<string, unknown>>>;
}

declare module "@/lib/mesh/calendar.mjs" {
  export type EventKind = "appointment" | "visit" | "date";
  export type EventRepeat = "none" | "weekly" | "monthly";
  export type SavedEvent = {
    id: string;
    title: string;
    kind: EventKind;
    startsAt: string;
    repeat: EventRepeat;
    notes: string;
    allDay: boolean;
  };
  export function localStarts(date: string, time?: string): string;
  export function saveEvent(
    store: unknown,
    input: { id?: string; title: string; kind: EventKind; startsAt: string; repeat?: EventRepeat; notes?: string },
  ): Promise<SavedEvent>;
  export function deleteEvent(store: unknown, id: string): Promise<void>;
  export function listUpcoming(
    store: unknown,
    now?: Date,
  ): Promise<Array<SavedEvent & { occursAt: number }>>;
  export function nextReminderAt(event: { startsAt?: string; repeat?: string }, now?: number): number | null;
}
