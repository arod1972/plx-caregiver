import { gcm } from "@noble/ciphers/aes.js";
import { bytesToHex, hexToBytes } from "./codec.mjs";

export function randomVaultKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function sealJson(value, keyHex) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const cipher = gcm(hexToBytes(keyHex), iv).encrypt(new TextEncoder().encode(JSON.stringify(value)));
  return { v: 1, iv: bytesToHex(iv), data: bytesToHex(cipher) };
}

export function openJson(sealed, keyHex) {
  if (!sealed || sealed.v !== 1 || typeof sealed.iv !== "string" || typeof sealed.data !== "string") {
    throw new Error("Sealed data is not valid");
  }
  const plain = gcm(hexToBytes(keyHex), hexToBytes(sealed.iv)).decrypt(hexToBytes(sealed.data));
  return JSON.parse(new TextDecoder().decode(plain));
}
