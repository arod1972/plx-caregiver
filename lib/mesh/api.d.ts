declare module "@/lib/mesh/seal.mjs" {
  export function randomVaultKey(): string;
  export function sealJson(value: unknown, keyHex: string): { v: 1; iv: string; data: string };
  export function openJson(sealed: { v?: number; iv?: string; data?: string }, keyHex: string): unknown;
}

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
  export type ListedEvent = {
    id: string;
    title: string;
    kind: EventKind | "med";
    startsAt: string;
    repeat: EventRepeat | "daily";
    notes: string;
    allDay: boolean;
    occursAt: number;
  };
  export function listUpcoming(store: unknown, now?: Date): Promise<ListedEvent[]>;
  export function nextReminderAt(event: { startsAt?: string; repeat?: string }, now?: number): number | null;
}

declare module "@/lib/mesh/medications.mjs" {
  export type Medication = { id: string; name: string; time: string; dosage: string; refillOn: string };
  export function medicationOccurrences(med: { time?: string; at_time?: string }, fromMs: number, untilMs: number): number[];
  export function saveMedication(
    store: unknown,
    input: { id?: string; name: string; time: string; dosage: string; refillOn?: string },
  ): Promise<Medication>;
  export function deleteMedication(store: unknown, id: string): Promise<void>;
  export function listMedications(store: unknown): Promise<Medication[]>;
  export function nextDoseAt(time: string, now?: Date): number | null;
  export function markTaken(store: unknown, medId: string, now?: Date): Promise<Medication & { taken: boolean; takenAt: string; weekTaken: number; weekDays: number } | undefined>;
  export function adherence(store: unknown, now?: Date): Promise<Array<Medication & { taken: boolean; takenAt: string; weekTaken: number; weekDays: number }>>;
}

declare module "@/lib/mesh/tasks.mjs" {
  export type TaskStatus = "open" | "assigned" | "done";
  export type TaskItem = {
    id: string;
    title: string;
    notes: string;
    assignee: string;
    assigneeName: string;
    status: TaskStatus;
    dueOn: string;
    completedAt: string;
    completedBy: string;
    assignedAt: string;
  };
  export function listCircle(store: unknown): Promise<Array<{ id: string; name: string }>>;
  export function listTasks(store: unknown): Promise<TaskItem[]>;
  export function saveTask(
    store: unknown,
    input: { id?: string; title: string; notes?: string; assignee?: string; dueOn?: string },
  ): Promise<TaskItem | undefined>;
  export function completeTask(store: unknown, id: string): Promise<TaskItem | undefined>;
  export function reopenTask(store: unknown, id: string): Promise<TaskItem | undefined>;
  export function removeTask(store: unknown, id: string): Promise<void>;
}

declare module "@/lib/mesh/posts.mjs" {
  export type PostItem = { id: string; body: string; authorId: string; authorName: string; sentAt: string };
  export function listPosts(store: unknown): Promise<PostItem[]>;
  export function addPost(store: unknown, body: string): Promise<PostItem>;
}

