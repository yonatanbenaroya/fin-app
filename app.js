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
import * as settings from './screens/settings.js';

const PREFS_KEY = 'fin.prefs.v1';
const TABS = [['home', 'tabHome', 'home'], ['act', 'tabAct', 'list'], ['cat', 'tabCat', 'pie'], ['goals', 'tabGoals', 'target'], ['set', 'tabSet', 'gear']];
const API = { home: 'home', act: 'activity', cat: 'categories', goals: 'goals' };
const SCREENS = { home, act: activity, cat: categories, goals };

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
  sheet: document.getElementById('sheet-root'),
};

function ctx() { const c = new Ctx(state.prefs); c.mode = MODE; c.syncAvailable = sync.available; return c; }

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
      ${icon(ic, 23)}<span>${esc(c.t[label])}</span></button>`).join('');
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

async function show(tab) {
  state.tab = tab;
  history.replaceState(null, '', `#${tab}`);
  el.scroll.scrollTop = 0;
  renderScreen();
  if (API[tab]) {
    try {
      state.data[tab] = await backend.get(API[tab]);
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
    const { text, cls } = settings.importLine(file.name, result, c);
    line.className = cls;
    line.textContent = text;
  }
  button.disabled = false;
  state.data = {}; // every screen reloads with the new data
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
  if (event.target.id === 'import-input') {
    importFiles([...event.target.files]);
    event.target.value = '';
  }
});

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
        state.data = {};
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
    state.data = {};
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
  } catch (error) {
    syncResult(c.t.syncErr[error && error.code] || c.t.syncErr.failed, 'neg');
  } finally {
    button.disabled = false;
  }
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

// ---- One click handler for the whole app
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-act]');
  if (!target) return;
  const { act, arg } = target.dataset;
  if (act === 'tab') show(arg);
  else if (act === 'hide') { state.prefs.hide = !state.prefs.hide; savePrefs(); refreshAppearance(); }
  else if (act === 'filter') { state.ui.filter = arg; renderScreen(); }
  else if (act === 'group') { const open = state.ui.openGroup === undefined ? state.data.cat.open : state.ui.openGroup; state.ui.openGroup = open === arg ? null : arg; renderScreen(); }
  else if (act === 'tx') {
    const [item, day] = findTransaction(arg);
    if (!item) return;
    const view = activity.sheet(item, day, ctx());
    const panel = document.getElementById('tx-panel');
    if (desktop.matches && panel) panel.innerHTML = `<h2 class="title" style="font-size:22px;line-height:28px">${esc(view.title)}</h2>${view.body}`;
    else openSheet({ kind: 'tx', ...view });
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
  else if (act === 'appearance') openSheet({ kind: 'appearance', ...settings.appearanceSheet(ctx()) });
  else if (act === 'close') closeSheet();
  else if (act === 'pref') { const [key, value] = arg.split(':'); state.prefs[key] = value; savePrefs(); refreshAppearance(); }
  else if (act === 'reset') { state.prefs = { ...DEFAULTS }; savePrefs(); refreshAppearance(); }
});

document.addEventListener('submit', (event) => {
  event.preventDefault();
  if (event.target.id === 'sync-form') syncLogin();
  else if (event.target.id === 'pw-form') syncPassword();
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.dataset.act === 'slider') {
    state.prefs[target.dataset.arg] = Number(target.value);
    savePrefs();
    const head = target.previousElementSibling.lastElementChild;
    const unit = { transparency: '%', radius: 'px', numberWeight: '' }[target.dataset.arg];
    head.textContent = `${target.value}${unit}`;
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.sheet) closeSheet();
});

desktop.addEventListener('change', () => { if (state.sheet && state.sheet.kind === 'tx') closeSheet(); renderScreen(); });

applyTheme(state.prefs);
show(state.tab);
autoSync(true);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoSync(); });

// On the phone the app keeps itself for offline use (sw.js is written by fin build-web).
if (MODE === 'device' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
