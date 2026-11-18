// The encrypted account on the phone: one password, one shared log (fin/sync/account.py on the Mac).
// The password gives the relay a derived secret and opens the vault, which holds the data key.
// Every entry is sealed here with the data key before it leaves (zlib 'deflate', then AES-GCM),
// so the relay stores ciphertext only. The engine (backend.log) prepares and applies plain
// entries; this file seals, sends and fetches them. On the Mac the local server runs the rounds,
// and this file only asks for their status.

import { b64, unb64 } from './finpack.js';
import { MODE } from './mode.js';
import { SYNC } from './sync-config.js';
import * as vault from './vault.js';

const ENTRY_AAD = new TextEncoder().encode('fin log v1');
const SNAPSHOT_AAD = new TextEncoder().encode('fin snapshot v1');
const BUCKET = 'fin-sync';
const SNAPSHOT_FILE = 'snapshot.bin';
const PREVIOUS_SNAPSHOT_FILE = 'snapshot.prev.bin'; // kept by the Mac when it writes a new one
const PULL_PAGE = 100;
const DB_NAME = 'fin-account';
const STORE = 'kv';

// ---- a small IndexedDB key-value store: the session, the data key (CryptoKey), state
function db() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function kv(mode, fn) {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const request = fn(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const kvGet = (key) => kv('readonly', (s) => s.get(key));
const kvPut = (key, value) => kv('readwrite', (s) => s.put(value, key));
const kvDel = (key) => kv('readwrite', (s) => s.delete(key));

export class AccountError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// ---- the relay (Supabase auth, tables and storage)
async function call(path, options = {}, token = null) {
  try {
    return await fetch(SYNC.url + path, {
      ...options,
      cache: 'no-store',
      headers: { apikey: SYNC.anonKey, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new AccountError('offline');
  }
}

async function token(grant, payload) {
  const response = await call(`/auth/v1/token?grant_type=${grant}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  if ([400, 401, 403, 422].includes(response.status)) throw new AccountError(grant === 'password' ? 'login' : 'signed_out');
  if (!response.ok) throw new AccountError('relay');
  const data = await response.json();
  const expiresAt = data.expires_at || Math.floor(Date.now() / 1000) + data.expires_in;
  return { userId: data.user.id, access: data.access_token, refresh: data.refresh_token, expiresAt };
}

async function rest(method, path, session, body, prefer = '') {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json', ...(prefer ? { Prefer: prefer } : {}) };
  const response = await call(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, session.access);
  if (response.status === 401 || response.status === 403) throw new AccountError('signed_out');
  if (!response.ok) throw new AccountError('relay');
  const textBody = await response.text();
  return textBody ? JSON.parse(textBody) : null;
}

async function getVault(session) {
  const rows = await rest('GET', '/rest/v1/vaults?select=record', session);
  if (!rows || !rows.length) return null;
  const record = rows[0].record;
  return typeof record === 'string' ? JSON.parse(record) : record;
}

const putVault = (session, record) => rest('POST', '/rest/v1/vaults?on_conflict=user_id', session,
  { user_id: session.userId, record }, 'resolution=merge-duplicates,return=minimal');

async function download(session, name) {
  const path = `${BUCKET}/${encodeURIComponent(session.userId)}/${encodeURIComponent(name)}`;
  const response = await call(`/storage/v1/object/authenticated/${path}`, {}, session.access);
  if (response.ok) return new Uint8Array(await response.arrayBuffer());
  const body = (await response.text().catch(() => '')).toLowerCase().replace(/ /g, '_');
  if (response.status === 404 || (response.status === 400 && body.includes('not_found'))) return null;
  if (response.status === 401 || response.status === 403) throw new AccountError('signed_out');
  throw new AccountError('relay');
}

// ---- sealing entries with the data key
async function through(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function sealJson(value, dek, aad = ENTRY_AAD) {
  const packed = await through(new TextEncoder().encode(JSON.stringify(value)), new CompressionStream('deflate'));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, additionalData: aad }, dek, packed));
  const blob = new Uint8Array(12 + sealed.length);
  blob.set(nonce, 0);
  blob.set(sealed, 12);
  return b64(blob);
}

async function openJson(text, dek, aad = ENTRY_AAD) {
  let packed;
  try {
    const blob = unb64(text);
    packed = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12), additionalData: aad }, dek, blob.slice(12)));
  } catch {
    throw new AccountError('key');
  }
  return JSON.parse(new TextDecoder().decode(await through(packed, new DecompressionStream('deflate'))));
}

// ---- what the screens use
export const available = MODE === 'server' || !!SYNC;

/** { configured, signed_in, last_sync, received, changes, error } */
export async function status() {
  if (MODE === 'server') return (await fetch('/api/sync', { cache: 'no-store' })).json();
  if (!SYNC) return { configured: false };
  const [session, dek, state] = await Promise.all([kvGet('session'), kvGet('dek'), kvGet('state')]);
  return { configured: true, signed_in: !!(session && dek), error: null, received: 0, changes: 0, last_sync: null, ...(state || {}) };
}

/** Sign in on this phone: the data key comes from the vault, opened with the password. */
export async function login(email, password) {
  let keys;
  try { keys = await vault.loginKeys(email, password); } catch { throw new AccountError('login'); }
  const session = await token('password', { email, password: keys.authSecret });
  const record = await getVault(session);
  if (!record) throw new AccountError('not_created');
  let dek;
  try { dek = await vault.openVault(record, keys.wrapKey); } catch { throw new AccountError('login'); }
  await Promise.all([kvPut('session', session), kvPut('dek', dek), kvPut('email', email.trim().toLowerCase()), kvPut('state', {})]);
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // as fin.logic.invite

/** "abcd efgh jkmn" -> "ABCD-EFGH-JKMN"; null when the text is not an invite code. */
export function normalizeInvite(text) {
  const bare = String(text || '').replace(/[\s\-_.]/g, '').toUpperCase();
  if (bare.length !== 12 || [...bare].some((ch) => !INVITE_ALPHABET.includes(ch))) return null;
  return `${bare.slice(0, 4)}-${bare.slice(4, 8)}-${bare.slice(8)}`;
}

const REGISTER_ERRORS = ['input', 'invite', 'exists', 'busy'];

/** Create a new account from this phone (design.md §12 item 2) and sign in. The relay's
 *  `register` function gets the derived auth secret, never the password; the vault is made
 *  here. Returns the recovery code: show it once. `problem` checks the password's strength. */
export async function register(email, password, invite, problem, backend) {
  if (await problem(password)) throw new AccountError('weak');
  const address = email.trim().toLowerCase();
  const code = invite && invite.trim() ? normalizeInvite(invite) : '';
  if (code === null) throw new AccountError('invite');
  let keys;
  try { keys = await vault.loginKeys(address, password); } catch { throw new AccountError('input'); }
  const response = await call('/functions/v1/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: address, auth_secret: keys.authSecret, invite: code }),
  });
  if (!response.ok) {
    const answer = await response.json().catch(() => ({}));
    throw new AccountError(REGISTER_ERRORS.includes(answer.error) ? answer.error : 'relay');
  }
  const session = await token('password', { email: address, password: keys.authSecret });
  const { record, recoveryCode } = await vault.createVault(keys.wrapKey);
  await putVault(session, record);
  const dek = await vault.openVault(record, keys.wrapKey); // kept as on sign-in
  await backend.log.take([], await backend.log.position()); // the settings now live in the log
  await Promise.all([kvPut('session', session), kvPut('dek', dek), kvPut('email', address), kvPut('state', {})]);
  return recoveryCode;
}

export async function logout() {
  await Promise.all(['session', 'dek', 'email', 'state'].map(kvDel));
}

async function freshSession() {
  let session = await kvGet('session');
  if (!session) throw new AccountError('signed_out');
  if (session.expiresAt - 60 < Date.now() / 1000) {
    session = await token('refresh_token', { refresh_token: session.refresh });
    await kvPut('session', session); // the refresh token rotates: keep the new one at once
  }
  return session;
}

/** A new password without the old one: this phone holds the data key. `problem` checks strength. */
export async function changePassword(newPassword, problem) {
  const weak = await problem(newPassword);
  if (weak) throw new AccountError('weak');
  const [session, dek, email] = [await freshSession(), await kvGet('dek'), await kvGet('email')];
  const record = await getVault(session);
  if (!record || !dek || !email) throw new AccountError('signed_out');
  const keys = await vault.loginKeys(email, newPassword);
  await putVault(session, await vault.wrapVault(record, dek, keys.wrapKey));
  await rest('PUT', '/auth/v1/user', session, { password: keys.authSecret });
}

/** Replace the recovery code; the old one stops working. Returns the new code: show it once. */
export async function newRecoveryCode() {
  const [session, dek] = [await freshSession(), await kvGet('dek')];
  const record = await getVault(session);
  if (!record || !dek) throw new AccountError('signed_out');
  const { record: updated, recoveryCode } = await vault.replaceRecovery(record, dek);
  await putVault(session, updated);
  return recoveryCode;
}

let running = null;

/** One round. Resolves to the status: `received` and `changes` count what came in. */
export function round(backend) {
  if (MODE === 'server') {
    return fetch('/api/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Fin-Import': '1' }, body: new Uint8Array(0),
    }).then((r) => r.json());
  }
  if (!running) running = phoneRound(backend).finally(() => { running = null; });
  return running;
}

/** The newest snapshot that opens: the latest, else the one before it; null when neither
 *  does (the phone then reads the whole log, which the relay always keeps). */
async function readSnapshot(session, dek) {
  for (const name of [SNAPSHOT_FILE, PREVIOUS_SNAPSHOT_FILE]) {
    const blob = await download(session, name);
    if (!blob) continue;
    try {
      return await openJson(new TextDecoder().decode(blob), dek, SNAPSHOT_AAD);
    } catch { /* damaged: try the previous one */ }
  }
  return null;
}

async function phoneRound(backend) {
  const [dek, previous] = await Promise.all([kvGet('dek'), kvGet('state')]);
  if (!SYNC || !dek || !(await kvGet('session'))) return status();
  const state = { ...(previous || {}) };
  try {
    const session = await freshSession();
    let received = 0;
    let changes = 0;
    let position = await backend.log.position();
    if (position === 0) {
      const snapshot = await readSnapshot(session, dek);
      if (snapshot) {
        const took = await backend.log.take([snapshot.entry], snapshot.upto);
        received += took.transactions;
        changes += took.changes;
        position = snapshot.upto;
      }
    }
    for (;;) {
      const rows = await rest('GET', `/rest/v1/changes?select=seq,device,blob&seq=gt.${position}&order=seq.asc&limit=${PULL_PAGE}`, session);
      if (!rows || !rows.length) break;
      const entries = [];
      for (const row of rows) entries.push(await openJson(row.blob, dek));
      position = Number(rows[rows.length - 1].seq);
      const took = await backend.log.take(entries, position);
      received += took.transactions;
      changes += took.changes;
    }
    const out = await backend.log.outgoing();
    if (out.entry) {
      const rows = await rest('POST', '/rest/v1/changes?select=seq', session,
        { device: out.entry.device, blob: await sealJson(out.entry, dek) }, 'return=representation');
      await backend.log.markPushed(out.marks);
      const pushed = Number(rows[0].seq);
      if (pushed === position + 1) await backend.log.take([], pushed); // nothing else came in between
    }
    Object.assign(state, { last_sync: new Date().toISOString(), received, changes, error: null });
  } catch (error) {
    const message = String(error && error.message || '');
    state.error = error instanceof AccountError ? error.code : /newer version|different version/.test(message) ? 'version' : 'failed';
  }
  await kvPut('state', state);
  return { configured: true, signed_in: true, ...state };
}
