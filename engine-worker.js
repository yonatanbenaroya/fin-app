// The engine on the phone: Pyodide in a worker, with this device's data kept in IndexedDB.
// It loads only files that ship with the app (no network once installed).

import { loadPyodide } from './pyodide/pyodide.mjs';

const DATA = '/data';
const IDB_NAME = 'fin-device';
const IDB_STORE = 'files';
// What is kept between visits: the database and the private configs (never the settings file).
const KEEP = /^(fin\.db|[a-z_.]+\.private\.yaml)$/;

function idb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadFiles() {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const files = new Map();
    const cursor = db.transaction(IDB_STORE).objectStore(IDB_STORE).openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) { files.set(c.key, c.value); c.continue(); } else resolve(files);
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

async function saveFiles(py) {
  const db = await idb();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  const store = tx.objectStore(IDB_STORE);
  for (const name of py.FS.readdir(DATA)) {
    if (KEEP.test(name)) store.put(py.FS.readFile(`${DATA}/${name}`), name);
  }
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
}

async function boot() {
  const py = await loadPyodide({ indexURL: new URL('./pyodide/', import.meta.url).href });
  await py.loadPackage('pyyaml');
  const engine = await (await fetch(new URL('./engine.zip', import.meta.url))).arrayBuffer();
  py.unpackArchive(engine, 'zip', { extractDir: '/app' });
  py.runPython("import sys\nsys.path.insert(0, '/app')");
  py.FS.mkdirTree(DATA);
  for (const [name, bytes] of await loadFiles()) py.FS.writeFile(`${DATA}/${name}`, bytes);
  const device = py.pyimport('fin.screens.device');
  device.prepare(DATA);
  return { py, device };
}

const ready = boot();

self.onmessage = async (event) => {
  const { id, op, args } = event.data;
  try {
    const { py, device } = await ready;
    let text;
    if (op === 'call') {
      text = device.call(DATA, args.screen, args.months);
    } else if (op === 'import') {
      const path = `/tmp/upload-${id}`;
      py.FS.writeFile(path, args.bytes);
      text = device.import_path(DATA, args.name, path);
      await saveFiles(py);
    } else if (op === 'receive') {
      const path = `/tmp/pack-${id}`;
      py.FS.writeFile(path, args.bytes);
      text = device.receive_path(DATA, path);
      await saveFiles(py);
    } else if (op === 'export') {
      const path = `/tmp/pack-${id}`;
      text = device.export_plain(DATA, path);
      if (JSON.parse(text).ok) {
        const bytes = py.FS.readFile(path);
        py.FS.unlink(path);
        self.postMessage({ id, text, bytes }, [bytes.buffer]);
        return;
      }
    } else if (op === 'logOut') {
      text = device.log_out(DATA);
    } else if (op === 'logMark') {
      text = device.log_mark(DATA, args.marks);
      await saveFiles(py);
    } else if (op === 'logTake') {
      const path = `/tmp/entries-${id}`;
      py.FS.writeFile(path, args.text);
      text = device.log_take(DATA, path, args.seq);
      await saveFiles(py);
    } else if (op === 'edit') {
      text = device.edit(DATA, args.request);
      await saveFiles(py);
    } else if (op === 'password') {
      text = device.password_check(args.password);
    } else if (op === 'logWhere') {
      text = device.log_where(DATA);
    } else {
      throw new Error(`unknown request ${op}`);
    }
    self.postMessage({ id, text });
  } catch (error) {
    self.postMessage({ id, error: String(error && error.message || error) });
  }
};
