// Settings and the Appearance sheet. Preferences stay in this browser (localStorage).

import { icon } from '../icons.js';
import { ACCENTS, CARD_STYLES, PALETTES, SURFACES, accentColour, paletteSwatch } from '../theme.js';
import { esc, tile } from '../ui.js';

const LANGS = [['he', 'עברית'], ['en', 'English']];

function langSeg(prefs, small) {
  return `<div class="seg${small ? ' small' : ''}">${LANGS.map(([key, label]) =>
    `<button type="button" aria-pressed="${prefs.lang === key}" data-act="pref" data-arg="lang:${key}">${label}</button>`).join('')}</div>`;
}

function hideSwitch(prefs, label) {
  return `<button type="button" role="switch" class="switch" aria-checked="${!!prefs.hide}" aria-label="${esc(label)}" data-act="hide"><span></span></button>`;
}

export function render(ctx) {
  const { t, prefs } = ctx;
  return `<div class="screen narrow-640">
    <h1 class="title" style="padding:0 2px">${esc(t.setTitle)}</h1>
    <section class="card" style="padding:16px;display:flex;align-items:center;gap:14px">
      <div style="width:56px;height:56px;border-radius:28px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--on-surface)">${icon('lock', 24)}</div>
      <span class="muted" style="font-size:15px">${esc(t.userSub)}</span></section>
    <section class="group"><h2 class="label">${esc(t.gMoney)}</h2><div class="card">
      <button type="button" class="row" style="min-height:60px" data-act="accounts">${tile('transport', 'bank')}
        <span class="main name">${esc(t.sAcc)}</span><span class="muted" style="font-size:15px">${esc(t.sAccV(3))}</span>
        ${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>
    </div></section>
    ${ctx.syncAvailable ? `<section class="group"><h2 class="label">${esc(t.gSync)}</h2><div class="card">
      <button type="button" class="row" style="min-height:60px" data-act="sync">${tile('recurring', 'shield')}
        <span class="main name">${esc(t.syncRow)}</span><span class="muted" id="sync-sub" style="font-size:15px"></span>
        ${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>
    </div></section>` : ''}
    <section class="group"><h2 class="label">${esc(t.gApp)}</h2><div class="card">
      <button type="button" class="row" style="min-height:60px" data-act="appearance">${tile('leisure', 'palette')}
        <span class="main name">${esc(t.appearance)}</span><span class="muted" style="font-size:15px">${esc(t.palettes[prefs.palette])}</span>
        ${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>
      <div class="row" style="min-height:60px">${tile('recurring', 'globe')}<span class="main name">${esc(t.langL)}</span>${langSeg(prefs, true)}</div>
      <div class="row" style="min-height:60px">${tile('transport', 'eye')}<span class="main name">${esc(t.hideRow)}</span>${hideSwitch(prefs, t.hideRow)}</div>
    </div></section>
    <section class="group"><h2 class="label">${esc(t.gPriv)}</h2><div class="card">
      <div class="row" style="min-height:60px">${tile('recurring', 'shield')}<span class="main name">${esc(t.sLocal)}</span></div>
    </div></section>
    <span class="muted" style="text-align:center;font-size:12px">${esc(t.setFoot)}</span>
  </div>`;
}

function slider(label, value, text, min, max, step, key) {
  return `<div class="field slider"><div class="head"><span class="flabel">${esc(label)}</span>
    <span class="muted num" dir="ltr" style="font-size:14px;font-weight:500">${esc(text)}</span></div>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${esc(label)}" data-act="slider" data-arg="${key}"></div>`;
}

export function appearanceSheet(ctx) {
  const { t, prefs } = ctx;
  const palettes = PALETTES.map((key) => `<button type="button" aria-pressed="${prefs.palette === key}" aria-label="${esc(t.palettes[key])}" data-act="pref" data-arg="palette:${key}">
    <span class="sw" style="background:${paletteSwatch(key)}"></span>${esc(t.palettes[key])}</button>`).join('');
  const accents = ACCENTS.map((key) => `<button type="button" aria-pressed="${prefs.accent === key}" aria-label="${esc(t.accents[key])}" data-act="pref" data-arg="accent:${key}">
    <span class="sw small" style="background:${accentColour(key, prefs.palette)}"></span></button>`).join('');
  const surfaces = prefs.palette === 'onyx' ? '' : `<div class="field"><span class="flabel">${esc(t.surfaceL)}</span><div class="seg">${SURFACES.map((key) =>
    `<button type="button" aria-pressed="${prefs.surface === key}" data-act="pref" data-arg="surface:${key}">${esc(t.surfaces[key])}</button>`).join('')}</div></div>`;
  const cards = CARD_STYLES.map((key) => `<button type="button" aria-pressed="${prefs.cards === key}" data-act="pref" data-arg="cards:${key}">${esc(t.cardStyles[key])}</button>`).join('');
  return {
    title: t.appearance,
    body: `<div class="field"><span class="flabel">${esc(t.theme)}</span><div class="swatches">${palettes}</div></div>
      ${surfaces}
      <div class="field" style="gap:6px"><span class="flabel">${esc(t.accentL)}</span><div class="swatches">${accents}</div></div>
      ${slider(t.nwL, prefs.numberWeight, String(prefs.numberWeight), 100, 600, 50, 'numberWeight')}
      <div class="field"><span class="flabel">${esc(t.trL)}</span><div class="seg">${cards}</div></div>
      ${slider(t.glL, prefs.transparency, `${prefs.transparency}%`, 0, 80, 1, 'transparency')}
      ${slider(t.radL, prefs.radius, `${prefs.radius}px`, 12, 36, 1, 'radius')}
      <div class="field"><span class="flabel">${esc(t.langL)}</span>${langSeg(prefs, false)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:44px">
        <span style="font-size:16px">${esc(t.hideRow)}</span>${hideSwitch(prefs, t.hideRow)}</div>
      <button type="button" class="btn-soft" data-act="reset">${esc(t.reset)}</button>`,
  };
}

const SOURCE_LOOK = { hapoalim: ['food', 'bank'], max: ['transport', 'card'], cal: ['recurring', 'card'] };

/** A local date ("2026-11-17") from an ISO time in UTC, for the "last import" line. */
function localDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function accountsRows(data, ctx) {
  const { t } = ctx;
  return data.sources.map((s) => {
    const [tone, ic] = SOURCE_LOOK[s.source] || ['other', 'card'];
    const sub = s.last_import ? t.accLast(ctx.dayMonth(localDate(s.last_import))) : t.accNever;
    const end = s.newest_transaction ? t.accThrough(ctx.dayMonth(s.newest_transaction)) : '';
    return `<div class="row" style="min-height:64px">${tile(tone, ic)}
      <div class="main"><span class="name">${esc(t.accNames[s.source] || s.source)}</span><span class="sub">${esc(sub)}</span></div>
      <span class="muted" style="font-size:13px">${esc(end)}</span></div>`;
  }).join('');
}

const MODE_BUTTONS = {
  device: [['pack-receive', 'packRecvMac'], ['pack-send', 'packSendMac']],
  server: [['pack-receive', 'packRecvPhone']],
};

/** Moving the ledger between the Mac and the iPhone in an encrypted file. */
function packSection(ctx) {
  const { t } = ctx;
  const buttons = (MODE_BUTTONS[ctx.mode] || []).map(([act, key]) =>
    `<button type="button" aria-pressed="false" data-act="${act}">${esc(t[key])}</button>`).join('');
  return `<div class="field"><span class="flabel">${esc(t.packTitle)}</span>
      <div class="seg">${buttons}</div>
      <input type="file" id="pack-input" accept=".finpack" hidden>
      <div id="pack-form" class="pack-form" hidden>
        <input type="password" id="pack-pass" class="text-input" autocomplete="off" placeholder="${esc(t.packPass)}" aria-label="${esc(t.packPass)}">
        <button type="button" class="btn-primary" data-act="pack-go"></button>
      </div>
      <div id="pack-results" class="results" aria-live="polite"></div>
      <span class="muted" style="font-size:13px;line-height:18px">${esc(t.packNote)}</span></div>`;
}

export function accountsSheet(data, ctx) {
  const { t } = ctx;
  return {
    title: t.accTitle,
    body: `<span class="muted" style="font-size:15px;line-height:21px">${esc(t.accIntro)}</span>
      <div class="card" id="accounts-rows">${accountsRows(data, ctx)}</div>
      <div class="dropzone" id="dropzone">${esc(t.dropHint)}</div>
      <button type="button" class="btn-primary" data-act="import-pick">${esc(t.accBtn)}</button>
      <input type="file" id="import-input" accept=".xlsx,.xls,.pdf" multiple hidden>
      <div id="import-results" class="results" aria-live="polite"></div>
      <span class="muted" style="font-size:13px;line-height:18px;text-align:center">${esc(t.accNote)}</span>
      ${packSection(ctx)}`,
  };
}

/** One line per imported file. Counts only, never a row's contents. */
export function importLine(name, result, ctx) {
  const { t } = ctx;
  const src = result.source ? (t.accNames[result.source] || result.source) : '';
  if (result.error) return { text: t.resError(name, result.error), cls: 'neg' };
  if (result.status === 'imported') return { text: t.resImported(src, result.rows_inserted, result.rows_duplicate), cls: 'pos' };
  if (result.status === 'rejected') return { text: t.resRejected(src), cls: 'neg' };
  return { text: t.resUnrecognized(name), cls: 'warn' };
}

/** The sync status in one short line: an error, the last round, or never. */
export function syncLine(status, ctx) {
  const { t } = ctx;
  if (!status || !status.configured) return { text: t.syncOff, cls: 'muted' };
  if (!status.signed_in) return { text: t.syncSignedOut, cls: 'muted' };
  if (status.error) return { text: t.syncErr[status.error] || t.syncErr.failed, cls: 'neg' };
  if (!status.last_sync) return { text: t.syncNever, cls: 'muted' };
  const d = new Date(status.last_sync);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { text: t.syncLast(ctx.dayMonth(date), time), cls: 'pos' };
}

/** The encrypted account: sign in once; then every device syncs through it. */
export function syncSheet(status, ctx) {
  const { t } = ctx;
  const line = syncLine(status, ctx);
  const counts = status && status.signed_in && !status.error
    ? [status.received ? t.syncReceived(status.received) : '', status.changes ? t.syncChanges(status.changes) : ''].filter(Boolean)
    : [];
  const head = `<div id="sync-results" class="results" aria-live="polite"><div class="${line.cls}">${esc(line.text)}</div>
    ${counts.map((c) => `<div class="pos">${esc(c)}</div>`).join('')}</div>`;
  const note = `<span class="muted" style="font-size:13px;line-height:18px">${esc(t.syncNote)}</span>`;
  const field = (id, type, auto, label) =>
    `<input type="${type}" id="${id}" class="text-input" autocomplete="${auto}" placeholder="${esc(label)}" aria-label="${esc(label)}"${type === 'email' ? ' dir="ltr"' : ''}>`;
  let body;
  if (!status || !status.configured) {
    body = `<span class="muted" style="font-size:15px;line-height:21px">${esc(ctx.mode === 'server' ? t.syncSetupMac : t.syncSetupPhone)}</span>`;
  } else if (!status.signed_in && ctx.mode === 'server') {
    body = `${head}<span class="muted" style="font-size:15px;line-height:21px">${esc(t.syncLoginMac)}</span>
      <code dir="ltr" style="font-size:14px">uv run fin sync create</code>
      <span class="muted" style="font-size:15px;line-height:21px">${esc(t.syncLoginMac2)}</span>
      <code dir="ltr" style="font-size:14px">uv run fin sync login</code>`;
  } else if (!status.signed_in) {
    body = `<span class="muted" style="font-size:15px;line-height:21px">${esc(t.syncIntro)}</span>
      <form id="sync-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        ${field('sync-email', 'email', 'username', t.syncEmail)}
        ${field('sync-password', 'password', 'current-password', t.syncPassword)}
        <button type="submit" class="btn-primary" id="sync-login">${esc(t.syncLogin)}</button>
      </form>
      <div id="sync-results" class="results" aria-live="polite"></div>`;
  } else if (ctx.mode === 'server') {
    body = `${head}<button type="button" class="btn-primary" data-act="sync-now">${esc(t.syncNow)}</button>`;
  } else {
    body = `${head}<button type="button" class="btn-primary" data-act="sync-now">${esc(t.syncNow)}</button>
      <button type="button" class="btn-soft" data-act="sync-password">${esc(t.syncChangePassword)}</button>
      <form id="pw-form" class="pack-form" style="flex-direction:column;align-items:stretch" hidden>
        ${field('pw-new', 'password', 'new-password', t.syncNewPassword)}
        ${field('pw-again', 'password', 'new-password', t.syncAgain)}
        <button type="submit" class="btn-primary" id="pw-save">${esc(t.syncSavePassword)}</button>
      </form>
      <button type="button" class="btn-soft" data-act="sync-code">${esc(t.syncNewCode)}</button>
      <button type="button" class="btn-soft" data-act="sync-logout">${esc(t.syncLogout)}</button>`;
  }
  return { title: t.syncRow, body: `${body}${note}` };
}
