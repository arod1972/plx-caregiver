import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, canonicalJson, hexToBytes } from "./codec.mjs";

export function createSigningKeys() {
  const secret = ed25519.utils.randomSecretKey();
  const pub = ed25519.getPublicKey(secret);
  return { secretKey: bytesToHex(secret), publicKey: bytesToHex(pub) };
}

export function createExchangeKeys() {
  const secret = x25519.utils.randomSecretKey();
  const pub = x25519.getPublicKey(secret);
  return { secretKey: bytesToHex(secret), publicKey: bytesToHex(pub) };
}

export function signJson(value, secretHex) {
  const message = new TextEncoder().encode(canonicalJson(value));
  return bytesToHex(ed25519.sign(message, hexToBytes(secretHex)));
}

export function verifyJson(value, signatureHex, publicHex) {
  try {
    const message = new TextEncoder().encode(canonicalJson(value));
    return ed25519.verify(hexToBytes(signatureHex), message, hexToBytes(publicHex));
  } catch {
    return false;
  }
}

export function deriveSharedSecret(secretHex, theirPublicHex) {
  const shared = x25519.getSharedSecret(hexToBytes(secretHex), hexToBytes(theirPublicHex));
  return bytesToHex(shared);
}
