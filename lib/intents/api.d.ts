declare module "@/lib/intents/actions.mjs" {
  export const handsOffPhrases: string[];
  export function clockLabel(time: string): string;
  export function pickNext(
    items: Array<{ id: string; name: string; time: string; dosage?: string; taken: boolean }>,
    now?: Date,
  ): { id: string; name: string; time: string; dosage?: string; taken: boolean } | null;
  export function runIntent(
    store: unknown,
    name: string,
    params?: Record<string, unknown>,
    now?: Date,
  ): Promise<{ spoken: string; id?: string }>;
}
