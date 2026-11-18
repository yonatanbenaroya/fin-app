// The app shell: preferences, tabs, data loading and sheets.
// Every number comes from /api; this file only routes, formats and draws.

import { backend } from './backend.js';
import { icon } from './icons.js';
import { MODE } from './mode.js';
import * as finpack from './finpack.js';
import * as sync from './account.js';
import { DEFAULTS, applyTheme } from './theme.js';
import { Ctx, esc } from './ui.js';
import * as activity from './screens/activity.js';
import * as categories from './screens/categories.js';
import * as goals from './screens/goals.js';
import * as home from './screens/home.js';
import * as savings from './screens/savings.js';
import * as settings from './screens/settings.js';

const PREFS_KEY = 'fin.prefs.v1';
const TABS = [['home', 'tabHome', 'home'], ['act', 'tabAct', 'list'], ['cat', 'tabCat', 'pie'], ['goals', 'tabGoals', 'target'], ['sav', 'tabSav', 'wallet']];
const API = { home: 'home', act: 'activity', cat: 'categories', goals: 'goals', sav: 'savings' };
const SCREENS = { home, act: activity, cat: categories, goals, sav: savings };

function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

const state = {
  prefs: loadPrefs(),
  tab: (location.hash.slice(1) in API || location.hash === '#set') ? location.hash.slice(1) : 'home',
  data: {},
  ui: {},
  sheet: null,
};

const el = {
  scroll: document.getElementById('scroll'),
  screen: document.getElementById('screen'),
  tabs: document.getElementById('tabs'),
  eye: document.getElementById('eye'),
  add: document.getElementById('add'),
  avatar: document.getElementById('avatar'),
  sheet: document.getElementById('sheet-root'),
};

function ctx() { const c = new Ctx(state.prefs); c.mode = MODE; c.syncAvailable = sync.available; c.profileName = state.profileName; c.labels = state.labels || {}; c.sources = state.sources || {}; return c; }

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
  applyTheme(state.prefs);
}


function renderTabs() {
  const c = ctx();
  el.tabs.setAttribute('aria-label', c.t.nav);
  const railTop = `<div class="rail-top">
    <button type="button" class="rail-eye" data-act="hide" aria-label="${esc(state.prefs.hide ? c.t.showLbl : c.t.hideLbl)}" aria-pressed="${!!state.prefs.hide}">${icon(state.prefs.hide ? 'eyeOff' : 'eye', 20, 'stroke-width="1.7"')}</button>
    <button type="button" class="rail-lang" data-act="pref" data-arg="lang:${state.prefs.lang === 'he' ? 'en' : 'he'}">${esc(c.t.langToggle)}</button></div>`;
  el.tabs.innerHTML = railTop + TABS.map(([key, label, ic]) =>
    `<button type="button" data-act="tab" data-arg="${key}" aria-current="${state.tab === key ? 'page' : 'false'}">
      ${icon(ic, 23)}<span>${esc(c.t[label])}</span></button>`).join('')
    // Settings is not a tab (design.md §5): on desktop it sits at the bottom of the rail.
    + `<button type="button" class="rail-set" data-act="tab" data-arg="set" aria-current="${state.tab === 'set' ? 'page' : 'false'}">
      ${icon('gear', 23)}<span>${esc(c.t.tabSet)}</span></button>`;
  // On the phone Settings opens from the round avatar in the Home header, next to the eye.
  el.avatar.hidden = state.tab !== 'home';
  el.avatar.setAttribute('aria-label', c.t.tabSet);
  el.avatar.title = c.t.tabSet;
  const initial = (state.profileName || '').trim().charAt(0).toUpperCase();
  el.avatar.innerHTML = initial ? `<span class="avatar-letter">${esc(initial)}</span>` : icon('users', 20, 'stroke-width="1.7"');
  // The small "+" (design.md §11.2) sits next to the privacy eye on Home and Activity.
  el.add.hidden = !['home', 'act'].includes(state.tab);
  el.add.setAttribute('aria-label', c.t.addTitle);
  el.add.title = c.t.addTitle;
  el.eye.setAttribute('aria-label', state.prefs.hide ? c.t.showLbl : c.t.hideLbl);
  el.eye.setAttribute('aria-pressed', String(!!state.prefs.hide));
  el.eye.innerHTML = icon(state.prefs.hide ? 'eyeOff' : 'eye', 22, 'stroke-width="1.7"');
}

function renderScreen() {
  const c = ctx();
  renderTabs();
  if (state.tab === 'set') {
    el.screen.innerHTML = settings.render(c);
    updateSyncRow();
    loadProfile();
    return;
  }
  const data = state.data[state.tab];
  if (data === undefined) { el.screen.innerHTML = `<div class="card"><div class="empty">${esc(c.t.loading)}</div></div>`; return; }
  if (data instanceof Error) {
    el.screen.innerHTML = `<div class="card"><div class="empty">${esc(c.t.loadError)}</div></div>`;
    return;
  }
  if (!data.ready) {
    el.screen.innerHTML = `<div class="card"><div class="empty">${esc(MODE === 'device' ? c.t.notReadyDevice : c.t.notReady)}</div></div>`;
    return;
  }
  el.screen.innerHTML = SCREENS[state.tab].render(data, c, state.ui);
}

/** Today on this device, YYYY-MM-DD: days left in the month count from it (design.md §6). */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The Activity filters the engine applies: a date range and a search (design.md §6). */
function activityParams() {
  const params = {};
  const range = state.ui.range;
  if (range) Object.assign(params, range);
  if (state.ui.q) params.q = state.ui.q;
  return params;
}

/** Reload Activity with the current filters, keeping the search field's focus and caret. */
async function reloadActivity() {
  const field = document.getElementById('act-q');
  const typing = field && document.activeElement === field;
  const caret = typing ? field.selectionStart : null;
  try {
    state.data.act = await backend.get('activity', { today: localToday(), ...activityParams() });
  } catch (error) {
    state.data.act = error instanceof Error ? error : new Error(String(error));
  }
  if (state.tab !== 'act') return;
  renderScreen();
  const again = document.getElementById('act-q');
  if (typing && again) { again.focus(); again.setSelectionRange(caret, caret); }
}

function setRange(range) {
  state.ui.range = range;
  if (state.sheet && state.sheet.kind === 'range') closeSheet();
  reloadActivity();
}

let searchTimer = null;

async function show(tab) {
  state.tab = tab;
  history.replaceState(null, '', `#${tab}`);
  el.scroll.scrollTop = 0;
  renderScreen();
  if (state.labels === undefined) loadProfile().then((p) => { if (p && state.tab === tab) renderScreen(); });
  if (API[tab]) {
    try {
      state.today = localToday();
      const extra = tab === 'act' ? activityParams() : tab === 'home' && state.ui.homeMonth ? { month: state.ui.homeMonth } : {};
      state.data[tab] = await backend.get(API[tab], { today: state.today, ...extra });
      if (tab === 'home' && state.data.home && 'name' in state.data.home) state.profileName = state.data.home.name;
    } catch (error) {
      state.data[tab] = error instanceof Error ? error : new Error(String(error));
    }
    if (state.tab === tab) renderScreen();
  }
}

// ---- Sheets
const desktop = window.matchMedia('(min-width: 1024px)');
let sheetTrigger = null;

function openSheet(sheet) {
  if (!state.sheet) sheetTrigger = document.activeElement;
  state.sheet = sheet;
  const c = ctx();
  el.sheet.innerHTML = `<div class="scrim" data-act="close"></div>
    <div class="sheet" role="dialog" aria-label="${esc(sheet.title)}"><div class="grabber" aria-hidden="true"></div>
      <header><h2>${esc(sheet.title)}</h2><button type="button" class="btn-done" data-act="close">${esc(c.t.done)}</button></header>
      <div class="body">${sheet.body}</div></div>`;
  el.sheet.querySelector('.btn-done').focus();
  wireDropzone();
}

function closeSheet() {
  if (state.sheet && state.sheet.kind === 'tx') state.tx = null;
  state.sheet = null;
  el.sheet.innerHTML = '';
  if (sheetTrigger && document.contains(sheetTrigger)) sheetTrigger.focus();
  sheetTrigger = null;
}

/** On desktop the import sheet takes dropped files too (design.md §10.2). */
function wireDropzone() {
  const zone = document.getElementById('dropzone');
  if (!zone) return;
  zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('over');
    importFiles([...event.dataTransfer.files]);
  });
}

function refreshAppearance() {
  if (state.sheet && state.sheet.kind === 'appearance') {
    const body = el.sheet.querySelector('.body');
    const scroll = body ? body.scrollTop : 0;
    openSheet({ kind: 'appearance', ...settings.appearanceSheet(ctx()) });
    el.sheet.querySelector('.body').scrollTop = scroll;
  }
  renderScreen();
}

function findTransaction(id) {
  const data = state.data.act;
  for (const day of (data && data.days) || []) {
    const item = day.items.find((x) => String(x.id) === id);
    if (item) return [item, day.date];
  }
  return [null, null];
}

// ---- Accounts and imports
async function openAccounts() {
  try {
    openSheet({ kind: 'accounts', ...settings.accountsSheet(await backend.get('accounts'), ctx()) });
  } catch {
    openSheet({ kind: 'accounts', title: ctx().t.accTitle, body: `<div class="empty">${esc(ctx().t.loadError)}</div>` });
  }
}

async function importFiles(files) {
  const c = ctx();
  const results = document.getElementById('import-results');
  const button = el.sheet.querySelector('[data-act="import-pick"]');
  if (!results || !files.length) return;
  results.innerHTML = '';
  button.disabled = true;
  for (const file of files) {
    const line = document.createElement('div');
    line.className = 'muted';
    line.textContent = c.t.accBusy(file.name);
    results.appendChild(line);
    let result;
    try {
      result = await backend.importFile(file);
    } catch {
      result = { error: c.t.loadError };
    }
    const { text, cls, map } = settings.importLine(file.name, result, c);
    line.className = cls;
    line.textContent = text;
    if (map) { // a file no adapter knows, with columns the user can map (design.md §12 item 9)
      pendingMaps.push({ file: result.name, tables: result.preview.tables, table: 0 });
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-soft map-open';
      button.dataset.act = 'map-open';
      button.dataset.arg = String(pendingMaps.length - 1);
      button.textContent = c.t.mapOpen;
      line.appendChild(button);
    }
  }
  button.disabled = false;
  state.data = {}; state.labels = undefined; // every screen reloads with the new data
  autoSync(true);
  try {
    const rows = document.getElementById('accounts-rows');
    if (rows) rows.innerHTML = settings.accountsRows(await backend.get('accounts'), c);
  } catch { /* the sheet keeps its old rows */ }
}

document.addEventListener('change', (event) => {
  if (event.target.id === 'pack-input') {
    packFile = event.target.files[0] || null;
    event.target.value = '';
    if (packFile) showPackForm('receive');
    return;
  }
  if (event.target.id === 'code-saved') {
    document.getElementById('first-run').disabled = !event.target.checked;
    return;
  }
  if (event.target.id === 'import-input') {
    importFiles([...event.target.files]);
    event.target.value = '';
  }
});

// ---- A source of my own: map the columns of an unknown export (design.md §12 item 9)
const pendingMaps = [];
let mapping = null;

function openMap(index) {
  mapping = pendingMaps[Number(index)];
  if (!mapping) return;
  openSheet({ kind: 'map', ...settings.mapSheet(mapping, ctx()) });
}

function mapSeg(arg) {
  const [name, value] = arg.split(':');
  for (const b of el.sheet.querySelectorAll(`[data-seg="${name}"] button`)) b.setAttribute('aria-pressed', String(b.dataset.arg === arg));
  if (name === 'kind') document.getElementById('map-label-field').hidden = value !== 'card';
}

async function saveMap() {
  const c = ctx();
  const box = document.getElementById('map-results');
  const fields = settings.mapFields(mapping, el.sheet);
  mapping.name = fields.name;
  const result = await backend.edit({ kind: 'source_map_save', ...(mapping.id ? { id: mapping.id } : {}), fields, file: mapping.file });
  if (result.error) { box.className = 'results neg'; box.textContent = result.error; return; }
  mapping.id = result.id;
  const done = result.import || {};
  if (done.status !== 'imported') { box.className = 'results neg'; box.textContent = c.t.mapRejected; return; }
  state.data = {}; state.labels = undefined;
  await loadProfile();
  await openAccounts();
  const results = document.getElementById('import-results');
  if (results) {
    results.className = 'results pos';
    results.textContent = ctx().t.resImported(fields.name, done.rows_inserted, done.rows_duplicate);
  }
  autoSync(true);
}

// ---- Between devices: encrypted transfer files
let packAction = null;
let packFile = null;

function packLine(text, cls) {
  const box = document.getElementById('pack-results');
  if (!box) return;
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = text;
  box.appendChild(line);
}

function showPackForm(action) {
  packAction = action;
  const form = document.getElementById('pack-form');
  form.hidden = false;
  form.querySelector('[data-act="pack-go"]').textContent = ctx().t[action === 'send' ? 'packMake' : 'packOpen'];
  document.getElementById('pack-pass').focus();
}

async function packGo() {
  const c = ctx();
  const field = document.getElementById('pack-pass');
  const passphrase = field.value;
  if (!passphrase) { field.focus(); return; }
  const button = el.sheet.querySelector('[data-act="pack-go"]');
  button.disabled = true;
  try {
    if (packAction === 'receive' && packFile) {
      const plain = await finpack.unseal(new Uint8Array(await packFile.arrayBuffer()), passphrase);
      const result = await backend.receivePlain(plain);
      if (result.error) packLine(result.error, 'neg');
      else {
        packLine(c.t.packReceived(result.sender, result.transactions), 'pos');
        if (result.configs && result.configs.length) packLine(c.t.packConfigs, 'pos');
        state.data = {}; state.labels = undefined;
        const rows = document.getElementById('accounts-rows');
        if (rows) rows.innerHTML = settings.accountsRows(await backend.get('accounts'), c);
      }
    } else if (packAction === 'send' && backend.exportPlain) {
      const sealed = await finpack.seal((await backend.exportPlain()).bytes, passphrase);
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File([sealed], `finance-${stamp}.finpack`, { type: 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] }).catch(() => {});
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 10000);
      }
      packLine(c.t.packReady, 'pos');
    }
    field.value = '';
    document.getElementById('pack-form').hidden = true;
  } catch (error) {
    const reason = error && error.message;
    packLine(reason === 'passphrase' ? c.t.packWrongPass : reason === 'format' ? c.t.packNotOurs : String(reason), 'neg');
  } finally {
    button.disabled = false;
  }
}

// ---- Automatic sync with the other device
let lastRound = 0;

async function updateSyncRow(status) {
  const sub = document.getElementById('sync-sub');
  if (!sub) return;
  try {
    const line = settings.syncLine(status || await sync.status(), ctx());
    sub.textContent = line.text;
  } catch { sub.textContent = ''; }
}

/** After a round that brought new transactions, every screen reloads. */
function afterRound(status) {
  const came = status && (status.received || status.changes);
  if (came && !status.error && status.last_sync && status.last_sync !== state.lastMerged) {
    state.lastMerged = status.last_sync;
    state.data = {}; state.labels = undefined;
    if (state.tab !== 'set' && !state.sheet) show(state.tab);
  }
  updateSyncRow(status);
}

/** On the phone: a round when the app opens, comes back, or imports. The Mac's server runs its own. */
async function autoSync(force = false) {
  if (MODE !== 'device' || !sync.available) return;
  if (!force && Date.now() - lastRound < 60000) return;
  lastRound = Date.now();
  try { afterRound(await sync.round(backend)); } catch { /* the next trigger tries again */ }
}

async function openSync() {
  let status;
  try { status = await sync.status(); } catch { status = null; }
  openSheet({ kind: 'sync', ...settings.syncSheet(status, ctx()) });
}

function syncResult(text, cls) {
  const box = document.getElementById('sync-results');
  if (!box) return;
  box.innerHTML = '';
  const line = document.createElement('div');
  line.className = cls;
  line.textContent = text;
  box.appendChild(line);
}

async function syncNow() {
  const button = el.sheet.querySelector('[data-act="sync-now"]');
  if (button) button.disabled = true;
  syncResult(ctx().t.syncBusy, 'muted');
  let status;
  try { status = await sync.round(backend); } catch { status = { configured: true, signed_in: true, error: 'failed' }; }
  lastRound = Date.now();
  afterRound(status);
  if (state.sheet && state.sheet.kind === 'sync') openSheet({ kind: 'sync', ...settings.syncSheet(status, ctx()) });
}

async function syncLogin() {
  const c = ctx();
  const value = (id) => document.getElementById(id).value;
  const [email, password] = [value('sync-email').trim(), value('sync-password')];
  if (!email || !password) { syncResult(c.t.syncFill, 'neg'); return; }
  const button = document.getElementById('sync-login');
  button.disabled = true;
  syncResult(c.t.syncSigningIn, 'muted');
  try {
    await sync.login(email, password);
    document.getElementById('sync-password').value = '';
    await syncNow();
    askNameOnce(); // the first sign-in asks what to call the user
  } catch (error) {
    syncResult(c.t.syncErr[error && error.code] || c.t.syncErr.failed, 'neg');
  } finally {
    button.disabled = false;
  }
}

// ---- A new account from the phone (design.md §12 item 2): the password never leaves it
function syncMode() {
  const c = ctx();
  const form = document.getElementById('sync-form');
  const create = form.dataset.create !== 'true';
  form.dataset.create = String(create);
  document.getElementById('sync-create').hidden = !create;
  document.getElementById('sync-password').autocomplete = create ? 'new-password' : 'current-password';
  document.getElementById('sync-login').textContent = create ? c.t.syncCreate : c.t.syncLogin;
  document.getElementById('sync-mode').textContent = create ? c.t.syncToLogin : c.t.syncToCreate;
  syncResult('', 'muted');
}

async function syncRegister() {
  const c = ctx();
  const value = (id) => document.getElementById(id).value;
  const [email, password, again] = [value('sync-email').trim(), value('sync-password'), value('sync-again')];
  if (!email || !password) { syncResult(c.t.syncFill, 'neg'); return; }
  if (password !== again) { syncResult(c.t.syncMismatch, 'neg'); return; }
  const button = document.getElementById('sync-login');
  button.disabled = true;
  syncResult(c.t.syncCreating, 'muted');
  try {
    const code = await sync.register(email, password, value('sync-invite'), backend.passwordProblem, backend);
    ['sync-password', 'sync-again'].forEach((id) => { document.getElementById(id).value = ''; });
    document.getElementById('sync-form').hidden = true;
    const box = document.getElementById('sync-results');
    box.innerHTML = settings.recoveryShown(code, c);
  } catch (error) {
    syncResult(c.t.syncErr[error && error.code] || c.t.syncErr.failed, 'neg');
  } finally {
    button.disabled = false;
  }
}

/** After the recovery code: the first run asks the name, then opens the import (design.md §12). */
async function firstRun() {
  state.firstRun = true;
  closeSheet();
  await syncNow().catch(() => {});
  localStorage.setItem('fin.askedName', '1');
  openProfile(true);
}

/** A new account password from this phone; the old one is not needed. */
async function syncPassword() {
  const c = ctx();
  const [first, again] = ['pw-new', 'pw-again'].map((id) => document.getElementById(id).value);
  if (!first || first !== again) { syncResult(c.t.syncMismatch, 'neg'); return; }
  const button = document.getElementById('pw-save');
  button.disabled = true;
  syncResult(c.t.syncBusy, 'muted');
  try {
    await sync.changePassword(first, backend.passwordProblem);
    document.getElementById('pw-form').hidden = true;
    syncResult(c.t.syncPasswordDone, 'pos');
  } catch (error) {
    syncResult(c.t.syncErr[error && error.code] || c.t.syncErr.failed, 'neg');
  } finally {
    button.disabled = false;
    ['pw-new', 'pw-again'].forEach((id) => { document.getElementById(id).value = ''; });
  }
}

/** A new recovery code, shown once in the sheet. */
async function syncCode() {
  const c = ctx();
  syncResult(c.t.syncBusy, 'muted');
  try {
    const code = await sync.newRecoveryCode();
    const box = document.getElementById('sync-results');
    box.innerHTML = `<div class="pos">${esc(c.t.syncCodeNew)}</div><code class="recovery-code" dir="ltr">${esc(code)}</code>
      <div class="muted">${esc(c.t.syncCodeKeep)}</div>`;
  } catch (error) {
    syncResult(c.t.syncErr[error && error.code] || c.t.syncErr.failed, 'neg');
  }
}

// ---- The transaction sheet: change a category (with its scope) or edit a manual transaction
async function openTx(id) {
  const [item, day] = findTransaction(id);
  if (!item) return;
  state.tx = { item, day, details: null, pick: {} };
  renderTx();
  try {
    const details = await backend.get('transaction', { tx: item.tx });
    if (state.tx && state.tx.item === item) { state.tx.details = details; renderTx(); }
  } catch {
    txResult(ctx().t.loadError, 'neg');
  }
}

function renderTx() {
  if (!state.tx) return;
  const { item, day, details, pick } = state.tx;
  const view = activity.sheet(item, day, ctx(), details, pick);
  const panel = document.getElementById('tx-panel');
  if (desktop.matches && panel) {
    panel.innerHTML = `<h2 class="title" style="font-size:22px;line-height:28px">${esc(view.title)}</h2>${view.body}`;
  } else if (state.sheet && state.sheet.kind === 'tx') {
    const body = el.sheet.querySelector('.body');
    const top = body.scrollTop;
    body.innerHTML = view.body;
    body.scrollTop = top; // choosing a category must not jump the sheet back to the top
    el.sheet.querySelector('header h2').textContent = view.title;
  } else {
    openSheet({ kind: 'tx', ...view });
  }
}

/** Keep what was typed in a manual transaction's fields when the sheet is drawn again. */
function keepTyped() {
  const field = (id) => document.getElementById(id);
  if (!state.tx) return;
  if (field('tx-note')) state.tx.pick.note = field('tx-note').value;
  if (field('tx-title')) state.tx.pick.title = field('tx-title').value;
  if (field('tx-name')) Object.assign(state.tx.pick, { name: field('tx-name').value, amount: field('tx-amount').value, date: field('tx-date').value });
}

function txResult(text, cls) {
  const box = document.getElementById('tx-results');
  if (box) { box.innerHTML = ''; const line = document.createElement('div'); line.className = cls; line.textContent = text; box.appendChild(line); }
}

async function saveTx() {
  if (!state.tx || !state.tx.details) return;
  keepTyped();
  const { details, pick } = state.tx;
  const category = pick.category || details.category;
  const moved = category !== details.category;
  const parts = [];
  if (details.manual) {
    parts.push({ kind: 'manual_save', id: details.manual_id, date: pick.date ?? details.date, description: (pick.name ?? details.name).trim(),
      amount_text: pick.amount ?? details.amount_text, expense: details.amount < 0, category });
  } else if (moved) {
    parts.push({ kind: 'recategorize', tx_hash: details.tx_hash, category, scope: pick.scope || 'one' });
  }
  const title = (pick.title ?? details.name).trim();
  const retitled = !details.manual && title && title !== details.name;
  if (retitled) parts.push({ kind: 'retitle', tx_hash: details.tx_hash, title, scope: pick.titleScope || 'one' });
  const note = (pick.note ?? details.note ?? '').trim();
  if (note !== (details.note || '')) parts.push({ kind: 'note', tx_hash: details.tx_hash, text: note });
  if (!parts.length) { if (state.sheet) closeSheet(); state.tx = null; return; } // nothing changed
  const result = await backend.edit(parts.length === 1 ? parts[0] : { kind: 'batch', edits: parts });
  if (result.error) { txResult(result.error, 'neg'); return; }
  const c = ctx();
  const message = details.manual ? c.t.toastSaved : moved ? c.t.toastMoved(c.categoryName(category))
    : retitled ? c.t.toastTitle : c.t.toastNote;
  afterEdit(result.undo, message);
}

async function deleteTx() {
  if (!state.tx || !state.tx.details || !state.tx.details.manual) return;
  const result = await backend.edit({ kind: 'manual_delete', id: state.tx.details.manual_id });
  if (result.error) { txResult(result.error, 'neg'); return; }
  afterEdit(result.undo, ctx().t.toastDeleted);
}

/** After an edit: every screen reloads (Home and the budget change at once), then a toast with Undo. */
function afterEdit(undo, message) {
  state.tx = null;
  if (state.sheet) closeSheet();
  state.data = {}; state.labels = undefined;
  show(state.tab);
  showToast(message, undo);
  autoSync(true);
}

let toastTimer = null;
let lastUndo = null;

function showToast(message, undo) {
  let box = document.getElementById('toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    box.className = 'toast';
    box.setAttribute('role', 'status');
    document.body.appendChild(box);
  }
  lastUndo = undo || null;
  box.innerHTML = `<span>${esc(message)}</span>${lastUndo ? `<button type="button" data-act="toast-undo">${esc(ctx().t.undo)}</button>` : ''}`;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.hidden = true; lastUndo = null; }, 6000);
}

async function undoLast() {
  const undo = lastUndo;
  if (!undo) return;
  lastUndo = null;
  const result = await backend.edit(undo);
  state.data = {}; state.labels = undefined;
  if (state.sheet && state.sheet.kind === 'categories') await openCategories(); // the open list shows the undo
  show(state.tab);
  showToast(result.error ? result.error : ctx().t.undone, null);
  autoSync(true);
}

// ---- Profile: the name for the greeting, kept in the encrypted account (design.md §6)
async function loadProfile() {
  try {
    const p = await backend.get('profile');
    state.profileName = p.name || null;
    state.labels = p.labels || {};
    state.sources = p.sources || {};
    const label = document.getElementById('profile-name');
    if (label) label.textContent = p.name || ctx().t.profileAdd;
    return p;
  } catch { return null; }
}

async function openProfile(first = false) {
  const p = await loadProfile();
  openSheet({ kind: 'profile', ...settings.profileSheet(p, ctx(), first) });
  document.getElementById('profile-input')?.focus();
}

/** Asked once on this device, after the first sign-in, when the account has no name yet. */
async function askNameOnce() {
  if (localStorage.getItem('fin.askedName')) return;
  const p = await loadProfile();
  if (!p || !p.editable || p.name) return;
  localStorage.setItem('fin.askedName', '1');
  openProfile(true);
}

async function saveProfile() {
  const name = document.getElementById('profile-input').value.trim();
  const result = await backend.edit({ kind: 'profile', name });
  if (result.error) {
    const box = document.getElementById('profile-results');
    if (box) box.textContent = result.error;
    return;
  }
  state.profileName = result.name || null;
  closeSheet();
  if (state.firstRun) { state.firstRun = false; openAccounts(); } // then the first import
  state.data = {}; state.labels = undefined;
  show(state.tab);
  showToast(ctx().t.toastName, result.undo);
  autoSync(true);
}

// ---- Categories: a name per language and the order inside a group (design.md §13 item 8)
let categoryData = null;
let categoryNameOf = null;

async function openCategories(focusName = null) {
  const scroller = el.sheet.querySelector('.sheet .body');
  const keep = state.sheet && state.sheet.kind === 'categories' && scroller ? scroller.scrollTop : 0;
  try {
    [categoryData] = await Promise.all([backend.get('category-editor'), loadProfile()]);
  } catch {
    openSheet({ kind: 'categories', title: ctx().t.catEdTitle, body: `<div class="empty">${esc(ctx().t.loadError)}</div>` });
    return;
  }
  openSheet({ kind: 'categories', ...settings.categoryEditorSheet(categoryData, ctx()) });
  const body = el.sheet.querySelector('.sheet .body');
  if (body) body.scrollTop = keep;
  if (focusName) [...el.sheet.querySelectorAll('[data-act="cat-up"],[data-act="cat-down"]')]
    .find((b) => b.dataset.arg === focusName && !b.disabled)?.focus();
}

function openCategoryName(name) {
  categoryNameOf = name;
  const c = ctx();
  const defaults = { he: c.defaultCategoryName(name, 'he'), en: c.defaultCategoryName(name, 'en') };
  openSheet({ kind: 'category-name', ...settings.categoryNameSheet(name, c, defaults) });
  document.getElementById(`cat-name-${c.lang}`)?.focus();
}

async function saveCategoryName(reset) {
  const value = (lang) => (reset ? '' : document.getElementById(`cat-name-${lang}`).value.trim());
  const result = await backend.edit({ kind: 'category_label', category: categoryNameOf, he: value('he'), en: value('en') });
  if (result.error) {
    const box = document.getElementById('cat-name-results');
    if (box) box.textContent = result.error;
    return;
  }
  state.data = {}; state.labels = undefined;
  await openCategories();
  showToast(ctx().t.toastCatName, result.undo);
  autoSync(true);
}

async function moveCategory(name, step) {
  const group = categoryData && categoryData.groups.find((g) => g.categories.includes(name));
  if (!group) return;
  const list = group.categories;
  const index = list.indexOf(name);
  if (index + step < 0 || index + step >= list.length) return;
  // Up: after the one two places above (or first); down: after the next one.
  const after = step < 0 ? (index >= 2 ? list[index - 2] : null) : list[index + 1];
  const result = await backend.edit({ kind: 'category_move', category: name, after });
  if (result.error) { showToast(result.error, null); return; }
  state.data = {}; state.labels = undefined;
  await openCategories(name);
  showToast(ctx().t.toastMoved2, result.undo);
  autoSync(true);
}

// ---- Savings: a saving typed in by the user (design.md §5, board C14)
let holding = null; // { row (null for a new one), kind }

function savingRow(id) {
  for (const g of (state.data.sav && state.data.sav.groups) || []) {
    const found = g.rows.find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}

function openHolding(row, kind) {
  holding = { row, kind: row ? row.kind : kind };
  openSheet({ kind: 'saving', ...savings.holdingSheet(holding.row, holding.kind, localToday(), ctx()) });
}

function pickHoldingKind(kind) {
  const name = document.getElementById('hf-name')?.value || '';
  openHolding(null, kind);
  document.getElementById('hf-name').value = name;
}

function pickAvailability(arg) {
  for (const b of el.sheet.querySelectorAll('[data-seg="avail"] button')) b.setAttribute('aria-pressed', String(b.dataset.arg === arg));
  document.getElementById('hf-from-box').hidden = arg !== 'date';
}

async function savingEdit(request, message) {
  const result = await backend.edit(request);
  if (result.error) {
    const box = document.getElementById('sav-results');
    if (box) { box.className = 'results neg'; box.textContent = result.error; }
    return;
  }
  afterEdit(result.undo, message);
}

// ---- Coming up: edit a commitment or a dated event, hide a duplicate card charge (design.md §6)
let comingRow = null;

function openComing(row) {
  comingRow = row;
  state.comingDir = row && row.income ? 'in' : 'out';
  openSheet({ kind: 'coming', ...home.comingSheet(row, ctx()) });
}

function comingError(text) {
  const box = document.getElementById('coming-results');
  if (box) box.textContent = text;
}

async function comingEdit(request, message) {
  const result = await backend.edit(request);
  if (result.error) { comingError(result.error); return; }
  afterEdit(result.undo, message);
}

function saveComing() {
  const value = (id) => (document.getElementById(id)?.value || '').trim();
  const t = ctx().t;
  if (comingRow && comingRow.kind === 'event') {
    comingEdit({ kind: 'event_save', id: comingRow.id, fields: {
      label: value('cf-name'), month: value('cf-month'), amount_text: value('cf-amount'), expense: state.comingDir !== 'in' } }, t.toastSaved);
    return;
  }
  const fields = { name: value('cf-name'), amount_text: value('cf-amount'), from: value('cf-from') };
  if (value('cf-count')) fields.payments = Number(value('cf-count'));
  else fields.until = value('cf-until');
  comingEdit({ kind: 'commitment_save', ...(comingRow ? { id: comingRow.id } : {}), fields }, t.toastSaved);
}

function deleteComing() {
  if (!comingRow || !comingRow.id) return;
  comingEdit({ kind: `${comingRow.kind}_delete`, id: comingRow.id }, ctx().t.toastDeleted);
}

function hideComing() {
  if (!comingRow || !comingRow.key) return;
  comingEdit({ kind: 'hide_charge', key: comingRow.key }, ctx().t.toastHidden);
}

// ---- Goals: add, edit, delete and reorder (design.md §6); the order is the priority
let goalRow = null;

function openGoal(goal) {
  goalRow = goal;
  openSheet({ kind: 'goal', ...goals.goalSheet(goal, ctx()) });
}

async function goalEdit(request, message) {
  const result = await backend.edit(request);
  if (result.error) {
    const box = document.getElementById('goal-results');
    if (box) box.textContent = result.error; else showToast(result.error, null);
    return;
  }
  afterEdit(result.undo, message);
}

function saveGoal() {
  const value = (id) => (document.getElementById(id)?.value ?? '').trim();
  const fields = { name: value('gf-name'), by: value('gf-by') || null };
  const kind = goalRow ? goalRow.kind : 'amount';
  if (kind === 'amount') { fields.amount_text = value('gf-amount'); fields.minimum_text = value('gf-minimum'); }
  if (kind === 'months') fields.months_of_spend = Number(value('gf-months'));
  goalEdit({ kind: 'goal_save', ...(goalRow ? { id: goalRow.id } : {}), fields }, ctx().t.toastSaved);
}

/** Move a goal to a new place; `after` is the goal it follows (null: first). */
function moveGoalTo(from, to) {
  const list = state.data.goals.goals;
  if (to === from || to < 0 || to >= list.length) return;
  const ids = list.map((g) => g.id).filter((id) => id !== list[from].id);
  const after = to === 0 ? null : ids[to - 1];
  goalEdit({ kind: 'goal_move', id: list[from].id, after }, ctx().t.toastMoved2);
}

const moveGoal = (index, step) => moveGoalTo(index, index + step);

// Dragging by the handle: pointer events, the card follows the finger, drop picks the place.
document.addEventListener('pointerdown', (event) => {
  const handle = event.target.closest('[data-act="goal-drag"]');
  if (!handle) return;
  event.preventDefault();
  const card = handle.closest('.goal-card');
  const cards = [...document.querySelectorAll('.goal-card')];
  const from = cards.indexOf(card);
  const startY = event.clientY;
  card.classList.add('dragging');
  try { handle.setPointerCapture(event.pointerId); } catch { /* the window listeners still follow it */ }
  const move = (e) => { card.style.transform = `translateY(${e.clientY - startY}px)`; };
  const up = (e) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    card.classList.remove('dragging');
    card.style.transform = '';
    const centres = cards.map((c) => { const r = c.getBoundingClientRect(); return (r.top + r.bottom) / 2; });
    const y = e.clientY;
    let to = centres.filter((c, i) => i !== from && c < y).length;
    to = Math.max(0, Math.min(cards.length - 1, to));
    moveGoalTo(from, to);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
});

// ---- "+": an expense by hand (design.md §11.2). Card or bank: pending until the file row.
let addState = null;

async function openAdd() {
  let options;
  try { options = await backend.get('add'); } catch { options = null; }
  addState = { options, category: null, via: options && options.sources[0], amount: '', name: '', date: localToday(), note: '' };
  renderAdd(true);
}

function keepAdd() {
  const value = (id) => document.getElementById(id)?.value;
  if (!addState || !document.getElementById('add-form')) return;
  Object.assign(addState, { amount: value('add-amount'), name: value('add-name'), date: value('add-date'), note: value('add-note') });
}

function renderAdd(first = false) {
  const view = activity.addSheet(addState, ctx());
  if (!first && state.sheet && state.sheet.kind === 'add') {
    const body = el.sheet.querySelector('.body');
    const top = body.scrollTop;
    body.innerHTML = view.body;
    body.scrollTop = top;
  } else {
    openSheet({ kind: 'add', ...view });
    document.getElementById('add-amount')?.focus();
  }
}

async function saveAdd() {
  keepAdd();
  const t = ctx().t;
  const box = document.getElementById('add-results');
  const say = (text) => { if (box) box.textContent = text; };
  if (!addState.amount || !addState.name.trim()) { say(t.addFill); return; }
  const result = await backend.edit({ kind: 'manual_save', date: addState.date, amount_text: addState.amount, expense: true,
    description: addState.name.trim(), category: addState.category, via: addState.via });
  if (result.error) { say(result.error); return; }
  if (addState.note.trim()) await backend.edit({ kind: 'note', tx_hash: `manual:${result.id}`, text: addState.note.trim() });
  addState = null;
  afterEdit(result.undo, t.toastAdded);
}

// ---- One click handler for the whole app
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-act]');
  if (!target) return;
  const { act, arg } = target.dataset;
  if (act === 'tab') show(arg);
  else if (act === 'hide') { state.prefs.hide = !state.prefs.hide; savePrefs(); refreshAppearance(); }
  else if (act === 'filter') { state.ui.filter = arg; renderScreen(); }
  else if (act === 'group') { const open = state.ui.openGroup === undefined ? state.data.cat.open : state.ui.openGroup; state.ui.openGroup = open === arg ? null : arg; renderScreen(); }
  else if (act === 'tx') openTx(arg);
  else if (act === 'tx-cat' && state.tx) {
    keepTyped(); state.tx.pick.category = arg; renderTx();
    // the next tap is the scope and Save: bring them into view (design.md §6: two taps and a Save)
    const save = document.querySelector('[data-act="tx-save"]');
    if (save) {
      save.scrollIntoView({ block: 'end' }); // the scope options sit right above Save
      (el.sheet.querySelector('.body') || document.getElementById('tx-panel'))?.scrollBy(0, 28); // clear of the bottom edge
    }
  }
  else if (act === 'tx-scope' && state.tx) { keepTyped(); state.tx.pick.scope = arg; renderTx(); }
  else if (act === 'tx-save') saveTx();
  else if (act === 'tx-delete') deleteTx();
  else if (act === 'tx-title-scope' && state.tx) { keepTyped(); state.tx.pick.titleScope = arg; renderTx(); }
  else if (act === 'tx-restore-title' && state.tx && state.tx.details) {
    backend.edit({ kind: 'restore_title', tx_hash: state.tx.details.tx_hash }).then((result) => {
      if (result.error) txResult(result.error, 'neg'); else afterEdit(result.undo, ctx().t.toastRestored);
    });
  }
  else if (act === 'toast-undo') undoLast();
  else if (act === 'profile') openProfile();
  else if (act === 'cat-editor') openCategories();
  else if (act === 'sav-open') openHolding(savingRow(arg));
  else if (act === 'sav-add') openHolding(null, 'pension');
  else if (act === 'sav-kind') pickHoldingKind(arg);
  else if (act === 'sav-avail') pickAvailability(arg);
  else if (act === 'sav-delete' && holding && holding.row) savingEdit({ kind: 'holding_delete', id: holding.row.id }, ctx().t.toastDeleted);
  else if (act === 'map-open') openMap(arg);
  else if (act === 'map-seg') mapSeg(arg);
  else if (act === 'map-table') { mapping.table = Number(arg); openSheet({ kind: 'map', ...settings.mapSheet(mapping, ctx()) }); }
  else if (act === 'cat-name') openCategoryName(arg);
  else if (act === 'cat-up' || act === 'cat-down') moveCategory(arg, act === 'cat-up' ? -1 : 1);
  else if (act === 'cat-reset') saveCategoryName(true);
  else if (act === 'add-open') openAdd();
  else if (act === 'add-cat') { keepAdd(); addState.category = arg; renderAdd(); }
  else if (act === 'add-via') { keepAdd(); addState.via = arg; renderAdd(); }
  else if (act === 'goal-open' && !event.target.closest('.goal-order')) openGoal(state.data.goals.goals[Number(arg)]);
  else if (act === 'goal-add') openGoal(null);
  else if (act === 'goal-delete') goalEdit({ kind: 'goal_delete', id: goalRow.id }, ctx().t.toastDeleted);
  else if (act === 'goal-up' || act === 'goal-down') moveGoal(Number(arg), act === 'goal-up' ? -1 : 1);
  else if (act === 'coming-open') openComing(state.data.home.coming[Number(arg)]);
  else if (act === 'coming-add') openComing(null);
  else if (act === 'coming-hide') hideComing();
  else if (act === 'coming-delete') deleteComing();
  else if (act === 'cf-dir') { state.comingDir = arg; target.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === target))); }
  else if (act === 'month-open' && state.data.home && state.data.home.months) {
    openSheet({ kind: 'month', ...home.monthSheet(state.data.home, ctx()) });
    // the month being viewed sits in the middle, earlier months above, later below (design.md §6)
    el.sheet.querySelector('.month-row[aria-pressed="true"]')?.scrollIntoView({ block: 'center' });
  }
  else if (act === 'month-pick') {
    const current = state.data.home && state.data.home.current_month;
    state.ui.homeMonth = arg === current ? null : arg; // kept while moving between tabs; reset when the app opens
    closeSheet();
    delete state.data.home;
    show('home');
  }
  else if (act === 'month-transactions') { state.ui.range = { preset: 'month', month: arg }; delete state.data.act; show('act'); }
  else if (act === 'range-open') openSheet({ kind: 'range', ...activity.rangeSheet(state.ui.range, ctx()) });
  else if (act === 'range-set') setRange({ preset: arg });
  else if (act === 'range-clear') setRange(null);
  else if (act === 'range-month') { const m = document.getElementById('range-month').value; if (m) setRange({ preset: 'month', month: m }); }
  else if (act === 'range-custom') {
    const from = document.getElementById('range-from').value;
    const to = document.getElementById('range-to').value;
    if (from && to) setRange({ preset: 'custom', from, to });
  }
  else if (act === 'accounts') openAccounts();
  else if (act === 'import-pick') document.getElementById('import-input')?.click();
  else if (act === 'pack-receive') document.getElementById('pack-input')?.click();
  else if (act === 'pack-send') showPackForm('send');
  else if (act === 'pack-go') packGo();
  else if (act === 'sync') openSync();
  else if (act === 'sync-now') syncNow();
  else if (act === 'sync-logout') { sync.logout().then(() => { updateSyncRow(); openSync(); }); }
  else if (act === 'sync-password') { const form = document.getElementById('pw-form'); form.hidden = !form.hidden; if (!form.hidden) document.getElementById('pw-new').focus(); }
  else if (act === 'sync-code') syncCode();
  else if (act === 'sync-mode') syncMode();
  else if (act === 'first-run') firstRun();
  else if (act === 'appearance') openSheet({ kind: 'appearance', ...settings.appearanceSheet(ctx()) });
  else if (act === 'close') closeSheet();
  else if (act === 'pref') { const [key, value] = arg.split(':'); state.prefs[key] = value; savePrefs(); refreshAppearance(); }
  else if (act === 'reset') { state.prefs = { ...DEFAULTS }; savePrefs(); refreshAppearance(); }
});

document.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'sync-form') (event.target.dataset.create === 'true' ? syncRegister() : syncLogin());
  else if (event.target.id === 'pw-form') syncPassword();
  else if (event.target.id === 'profile-form') saveProfile();
  else if (event.target.id === 'coming-form') saveComing();
  else if (event.target.id === 'goal-form') saveGoal();
  else if (event.target.id === 'add-form') saveAdd();
  else if (event.target.id === 'cat-name-form') saveCategoryName(false);
  else if (event.target.id === 'map-form') saveMap();
  else if (event.target.id === 'sav-form') savingEdit(savings.holdingRequest(holding.row, holding.kind, el.sheet), ctx().t.toastSaved);
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.id === 'tx-title' && state.tx && state.tx.details) { // the scope shows once the title changes
    const changed = target.value.trim() && target.value.trim() !== state.tx.details.name;
    const box = document.getElementById('title-scope');
    if (box) box.hidden = !changed;
    return;
  }
  if (target.id === 'act-q') { // search waits for a short pause in typing
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.ui.q = target.value.trim(); reloadActivity(); }, 300);
    return;
  }
  if (target.dataset.act === 'slider') {
    state.prefs[target.dataset.arg] = Number(target.value);
    savePrefs();
    const head = target.previousElementSibling.lastElementChild;
    const unit = { transparency: '%', radius: 'px', numberWeight: '' }[target.dataset.arg];
    head.textContent = `${target.value}${unit}`;
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[role="button"][data-act]')) { event.preventDefault(); event.target.click(); return; }
  if (event.key === 'Escape' && state.sheet) closeSheet();
});

desktop.addEventListener('change', () => { if (state.sheet && state.sheet.kind === 'tx') closeSheet(); renderScreen(); });

applyTheme(state.prefs);
show(state.tab);
autoSync(true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (state.today && state.today !== localToday()) { state.data = {}; state.labels = undefined; if (!state.sheet) show(state.tab); } // a new day
  autoSync();
});

// On the phone the app keeps itself for offline use (sw.js is written by fin build-web).
if (MODE === 'device' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
