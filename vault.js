// One password, derived keys: the same key hierarchy as fin/sync/vault.py on the Mac.
//   stretched = PBKDF2-SHA256(NFC(password), SHA-256("fin-vault-v1|" + email), N)
//   auth = HKDF(stretched, "fin auth v1") -> relay password (hex); wrap = HKDF(stretched, "fin wrap v1")
//   vault record = {format, kdf, iterations, wrapped, recovery}: each a b64(nonce12 + AES-GCM(key, DEK))
//   recovery key = HKDF(recovery code, "fin recovery v1"); the code is random and shown once.
// WebCrypto only. The wrapping and recovery keys cannot be exported. The data key (DEK) can be
// wrapped again (decided 2026-11-17), so this device can reset a forgotten password; its raw
// bytes never pass through JavaScript (generateKey, wrapKey and unwrapKey only).
// Errors: Error('format') for a foreign or damaged record or code, Error('passphrase') for a
// wrong password or recovery code.

import { b64, unb64 } from './finpack.js';

export const ITERATIONS = 1000000;
const MIN_ITERATIONS = 100000; // tests only
const MAX_ITERATIONS = 10000000;
const FORMAT = 1;
const KDF = 'PBKDF2-SHA256';
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const RECOVERY_CHARS = 28;
const text = (s) => new TextEncoder().encode(s);
const VAULT_AAD = text('fin vault v1');
const RECOVERY_AAD = text('fin vault recovery v1');
const AES = { name: 'AES-GCM', length: 256 };
const DEK_USES = ['encrypt', 'decrypt'];
const KEK_USES = ['wrapKey', 'unwrapKey'];
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const hkdf = (info) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: text(info) });

/** The PBKDF2 salt: fixed per account, computable before any network call. */
export async function vaultSalt(email) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', text('fin-vault-v1|' + email.trim().toLowerCase())));
}

/** The relay password (hex string) and the wrapping key (non-extractable CryptoKey). */
export async function loginKeys(email, password, iterations = ITERATIONS) {
  if (!email || !email.trim() || !password) throw new Error('passphrase');
  if (!(iterations >= MIN_ITERATIONS && iterations <= MAX_ITERATIONS)) throw new Error('format');
  const material = await crypto.subtle.importKey('raw', text(password.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const salt = await vaultSalt(email);
  const stretched = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 256);
  const root = await crypto.subtle.importKey('raw', stretched, 'HKDF', false, ['deriveBits', 'deriveKey']);
  new Uint8Array(stretched).fill(0);
  const auth = new Uint8Array(await crypto.subtle.deriveBits(hkdf('fin auth v1'), root, 256));
  const wrapKey = await crypto.subtle.deriveKey(hkdf('fin wrap v1'), root, AES, false, KEK_USES);
  const authSecret = hex(auth);
  auth.fill(0);
  return { authSecret, wrapKey };
}

/** A new recovery code (140 random bits): seven groups of four characters. Show it once. */
export function newRecoveryCode() {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(RECOVERY_CHARS)), (b) => CROCKFORD[b & 31]).join('');
  return raw.match(/.{4}/g).join('-');
}

/** The canonical form of a typed code: case, spaces and dashes ignored, O→0, I/L→1. */
export function normalizeRecoveryCode(code) {
  const t = String(code).replace(/[\s-]/g, '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1');
  if (t.length !== RECOVERY_CHARS || [...t].some((c) => !CROCKFORD.includes(c))) throw new Error('format');
  return t;
}

async function recoveryKey(code) {
  const root = await crypto.subtle.importKey('raw', text(normalizeRecoveryCode(code)), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(hkdf('fin recovery v1'), root, AES, false, KEK_USES);
}

async function sealKey(kek, dek, aad) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.wrapKey('raw', dek, kek, { name: 'AES-GCM', iv: nonce, additionalData: aad }));
  const blob = new Uint8Array(12 + sealed.length);
  blob.set(nonce, 0);
  blob.set(sealed, 12);
  return b64(blob);
}

async function openKey(kek, wrapped, aad) {
  const blob = unb64(wrapped);
  try {
    return await crypto.subtle.unwrapKey(
      'raw', blob.slice(12), kek, { name: 'AES-GCM', iv: blob.slice(0, 12), additionalData: aad }, 'AES-GCM', true, DEK_USES,
    );
  } catch {
    throw new Error('passphrase');
  }
}

function wrappedOk(value) {
  try { return unb64(value).length === 12 + 32 + 16; } catch { return false; }
}

function parse(record) {
  let r = record;
  if (typeof r === 'string') {
    try { r = JSON.parse(r); } catch { throw new Error('format'); }
  }
  if (!r || r.format !== FORMAT || r.kdf !== KDF || !Number.isInteger(r.iterations)) throw new Error('format');
  if (r.iterations < MIN_ITERATIONS || r.iterations > MAX_ITERATIONS) throw new Error('format');
  if (!wrappedOk(r.wrapped) || ('recovery' in r && !wrappedOk(r.recovery))) throw new Error('format');
  return r;
}

async function makeRecord(wrapKey, dek, iterations, recovery) {
  const record = { format: FORMAT, kdf: KDF, iterations, wrapped: await sealKey(wrapKey, dek, VAULT_AAD) };
  if (recovery !== undefined) record.recovery = recovery;
  return record;
}

/** The iteration count a record was made with. */
export const vaultIterations = (record) => parse(record).iterations;

/** A new random data key (CryptoKey), its vault record, and the recovery code to show once. */
export async function createVault(wrapKey, iterations = ITERATIONS) {
  const dek = await crypto.subtle.generateKey(AES, true, DEK_USES);
  const recoveryCode = newRecoveryCode();
  const recovery = await sealKey(await recoveryKey(recoveryCode), dek, RECOVERY_AAD);
  return { dek, record: await makeRecord(wrapKey, dek, iterations, recovery), recoveryCode };
}

/** The data key as an AES-GCM CryptoKey. Throws Error('format') or Error('passphrase'). */
export async function openVault(record, wrapKey) {
  return openKey(wrapKey, parse(record).wrapped, VAULT_AAD);
}

/** The data key from the recovery code (a forgotten password). */
export async function openWithRecovery(record, code) {
  const r = parse(record);
  if (!('recovery' in r)) throw new Error('format');
  return openKey(await recoveryKey(code), r.recovery, RECOVERY_AAD);
}

/** The record with the data key under a new password; the recovery copy is kept. */
export async function wrapVault(record, dek, newWrapKey, iterations) {
  const r = parse(record);
  return makeRecord(newWrapKey, dek, iterations ?? r.iterations, r.recovery);
}

/** The same data key under a new wrapping key (a password change with the old password). */
export async function rewrap(record, oldWrapKey, newWrapKey, iterations) {
  return wrapVault(record, await openVault(record, oldWrapKey), newWrapKey, iterations);
}

/** A new recovery code for this vault; the old one stops working. Show the code once. */
export async function replaceRecovery(record, dek) {
  const r = { ...parse(record) };
  const recoveryCode = newRecoveryCode();
  r.recovery = await sealKey(await recoveryKey(recoveryCode), dek, RECOVERY_AAD);
  return { record: r, recoveryCode };
}
