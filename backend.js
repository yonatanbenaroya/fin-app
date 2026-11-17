// The one place the screens get their data from.
// On the Mac: the local server. On the phone: the same Python views, run by Pyodide in a worker.

import { MODE } from './mode.js';

function serverBackend() {
  async function get(screen, params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`/api/${screen}${query ? `?${query}` : ''}`, { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || response.statusText);
    return body;
  }
  /** The custom header and the Origin the browser adds prove the file comes from this app. */
  async function importFile(file) {
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-Fin-Import': '1', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? body : { error: body.error || response.statusText };
  }
  /** Merge a pack from the phone, already decrypted in this browser. */
  async function receivePlain(bytes) {
    const response = await fetch('/api/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-Fin-Import': '1' },
      body: bytes,
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? body : { error: body.error || response.statusText };
  }
  /** One edit, as JSON, with the same guards as an import. */
  async function editOne(request) {
    const response = await fetch('/api/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Fin-Import': '1' },
      body: JSON.stringify(request),
    });
    const body = await response.json().catch(() => ({}));
    return response.ok ? body : { error: body.error || response.statusText };
  }
  return { mode: 'server', get, importFile, receivePlain, exportPlain: null, log: null, edit: editOne };
}

function deviceBackend() {
  const worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
  const pending = new Map();
  let next = 1;
  worker.onmessage = (event) => {
    const { id, text, error, bytes } = event.data;
    const waiting = pending.get(id);
    if (!waiting) return;
    pending.delete(id);
    if (error) waiting.reject(new Error(error));
    else waiting.resolve({ ...JSON.parse(text), bytes });
  };
  const ask = (op, args, transfer = []) => new Promise((resolve, reject) => {
    const id = next++;
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, args }, transfer);
  });
  async function get(screen, params = {}) {
    const filters = {};
    for (const key of ['preset', 'month', 'from', 'to', 'q']) if (params[key]) filters[key] = params[key];
    const answer = await ask('call', { screen, months: Number(params.months || 2), today: params.today || '', tx: params.tx || '', filters: JSON.stringify(filters) });
    if (!answer.ok) throw new Error(answer.error);
    return answer.data;
  }
  async function importFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const answer = await ask('import', { name: file.name, bytes }, [bytes.buffer]);
    return answer.ok ? answer.data : { error: answer.error };
  }
  async function receivePlain(bytes) {
    const answer = await ask('receive', { bytes }, [bytes.buffer]);
    return answer.ok ? answer.data : { error: answer.error };
  }
  /** This phone's unencrypted pack and a digest of its content, for sealing and sending to the Mac. */
  async function exportPlain() {
    const answer = await ask('export', {});
    if (!answer.ok) throw new Error(answer.error);
    return { bytes: answer.bytes, digest: answer.data.digest };
  }
  // The encrypted account's log: the engine prepares and takes in plain entries;
  // account.js seals, sends and fetches them.
  async function data(op, args) {
    const answer = await ask(op, args);
    if (!answer.ok) throw new Error(answer.error);
    return answer.data;
  }
  const log = {
    outgoing: () => data('logOut', {}),
    markPushed: (marks) => data('logMark', { marks: JSON.stringify(marks) }),
    take: (entries, seq) => data('logTake', { text: JSON.stringify(entries), seq }),
    position: async () => (await data('logWhere', {})).position,
  };
  /** Why a new account password is too weak (the rule lives in fin.logic), or null. */
  const passwordProblem = async (password) => (await data('password', { password })).problem;
  /** One edit (a ceiling, a rule, a goal, a category, a manual transaction). */
  async function editOne(request) {
    const answer = await ask('edit', { request: JSON.stringify(request) });
    return answer.ok ? answer.data : { error: answer.error };
  }
  return { mode: 'device', get, importFile, receivePlain, exportPlain, log, passwordProblem, edit: editOne };
}

export const backend = MODE === 'device' ? deviceBackend() : serverBackend();
