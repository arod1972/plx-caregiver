import { openSqliteStore } from "@/lib/db/sqlite";

let storePromise: ReturnType<typeof openSqliteStore> | null = null;

export function careStore() {
  storePromise ??= openSqliteStore();
  return storePromise;
}
