import { ensureDevice } from "../mesh/repository.mjs";

const CONSENT = "scan.consent";

export async function readScanConsent(store) {
  const value = await store.getMeta(CONSENT);
  return value === "allowed" || value === "declined" ? value : "unknown";
}

export async function setScanConsent(store, consent) {
  if (consent !== "allowed" && consent !== "declined") throw new Error("Choose whether to allow the camera");
  await ensureDevice(store);
  await store.setMeta(CONSENT, consent);
}
