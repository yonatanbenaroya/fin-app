// Encrypted transfer files (.finpack), the same format as fin/sync/crypto.py on the Mac:
// "FINPACK1", a JSON header line, then AES-256-GCM ciphertext with the header as associated data.
// The key comes from the passphrase through PBKDF2-SHA256. WebCrypto only; nothing leaves the device.

const MAGIC = new TextEncoder().encode('FINPACK1\n');
const ITERATIONS = 600000;
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function deriveKey(passphrase, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

async function sealKey(plain, key, salt, iterations) {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  // Keys in sorted order, no spaces: the same bytes Python writes.
  const header = new TextEncoder().encode(JSON.stringify({
    cipher: 'AES-256-GCM', iterations, kdf: 'PBKDF2-SHA256', nonce: b64(nonce), salt: b64(salt),
  }));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: header }, key, plain));
  const out = new Uint8Array(MAGIC.length + header.length + 1 + sealed.length);
  out.set(MAGIC, 0);
  out.set(header, MAGIC.length);
  out[MAGIC.length + header.length] = 10;
  out.set(sealed, MAGIC.length + header.length + 1);
  return out;
}

/** Encrypt a plain pack (Uint8Array) with a passphrase: a new salt and nonce. */
export async function seal(plain, passphrase) {
  if (!passphrase) throw new Error('passphrase');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return sealKey(plain, await deriveKey(passphrase, salt, ITERATIONS), salt, ITERATIONS);
}

/** The account key for automatic sync: derived once, kept as a key that cannot be exported. */
export async function deriveAccountKey(passphrase, salt, iterations = ITERATIONS) {
  if (!passphrase) throw new Error('passphrase');
  return { key: await deriveKey(passphrase, salt, iterations), salt, iterations };
}

/** Encrypt with an account key: its salt, a new nonce. */
export function sealWith(plain, account) {
  return sealKey(plain, account.key, account.salt, account.iterations);
}

function parse(blob) {
  if (blob.length < MAGIC.length || !MAGIC.every((b, i) => blob[i] === b)) throw new Error('format');
  const end = blob.indexOf(10, MAGIC.length);
  if (end < 0) throw new Error('format');
  const header = blob.slice(MAGIC.length, end);
  let fields;
  try { fields = JSON.parse(new TextDecoder().decode(header)); } catch { throw new Error('format'); }
  if (fields.kdf !== 'PBKDF2-SHA256' || fields.cipher !== 'AES-256-GCM') throw new Error('format');
  if (!(fields.iterations >= 100000 && fields.iterations <= 5000000)) throw new Error('format');
  return { header, fields, sealed: blob.slice(end + 1) };
}

async function open(key, nonce, sealed, header) {
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, additionalData: header }, key, sealed));
  } catch {
    throw new Error('passphrase');
  }
}

/** Decrypt a file sealed with this account key. Throws Error('format') or Error('passphrase'). */
export async function unsealWith(blob, account) {
  const { header, fields, sealed } = parse(blob);
  const salt = unb64(fields.salt);
  const same = salt.length === account.salt.length && salt.every((b, i) => b === account.salt[i]);
  if (!same || fields.iterations !== account.iterations) throw new Error('passphrase');
  return open(account.key, unb64(fields.nonce), sealed, header);
}

export { b64, unb64 };

/** Decrypt a .finpack (Uint8Array). Throws Error('format') or Error('passphrase'). */
export async function unseal(blob, passphrase) {
  const { header, fields, sealed } = parse(blob);
  const key = await deriveKey(passphrase, unb64(fields.salt), fields.iterations);
  return open(key, unb64(fields.nonce), sealed, header);
}
