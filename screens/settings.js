// Settings and the Appearance sheet. Preferences stay in this browser (localStorage).

import { icon } from '../icons.js';
import { ACCENTS, CARD_STYLES, PALETTES, SURFACES, accentColour, paletteSwatch } from '../theme.js';
import { amt, esc, tile } from '../ui.js';

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
    <button type="button" class="back-home" data-act="tab" data-arg="home">${icon('chevron', 16, 'class="back-chev" stroke-width="1.8"')}<span>${esc(t.tabHome)}</span></button>
    <h1 class="title" style="padding:0 2px">${esc(t.setTitle)}</h1>
    <button type="button" class="card profile-card" data-act="profile">
      <div style="width:56px;height:56px;border-radius:28px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--on-surface)">${icon('lock', 24)}</div>
      <span class="main"><span class="name" id="profile-name">${esc(ctx.profileName || t.profileAdd)}</span>
        <span class="muted" style="font-size:15px">${esc(t.userSub)}</span></span>
      ${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>
    <section class="group"><h2 class="label">${esc(t.gMoney)}</h2><div class="card">
      <button type="button" class="row" style="min-height:60px" data-act="accounts">${tile('transport', 'bank')}
        <span class="main name">${esc(t.sAcc)}</span><span class="muted" style="font-size:15px">${esc(t.sAccV(3))}</span>
        ${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>
      <button type="button" class="row" style="min-height:60px" data-act="cat-editor">${tile('food', 'pie')}
        <span class="main name">${esc(t.catEdTitle)}</span>
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
      <div class="main"><span class="name">${esc(t.accNames[s.source] || ctx.sourceName(s.source))}</span><span class="sub">${esc(sub)}</span></div>
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
      <input type="file" id="import-input" accept=".xlsx,.xls,.csv,.pdf" multiple hidden>
      <div id="import-results" class="results" aria-live="polite"></div>
      <span class="muted" style="font-size:13px;line-height:18px;text-align:center">${esc(t.accNote)}</span>
      ${packSection(ctx)}`,
  };
}

/** One line per imported file. Counts only, never a row's contents. */
export function importLine(name, result, ctx) {
  const { t } = ctx;
  const src = result.source ? (t.accNames[result.source] || ctx.sourceName(result.source)) : '';
  if (result.error) return { text: t.resError(name, result.error), cls: 'neg' };
  if (result.status === 'imported') return { text: t.resImported(src, result.rows_inserted, result.rows_duplicate), cls: 'pos' };
  if (result.status === 'rejected') return { text: t.resRejected(src), cls: 'neg' };
  if (result.preview) return { text: t.resMappable(name), cls: 'warn', map: true };
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
      <form id="sync-form" class="pack-form" style="flex-direction:column;align-items:stretch" data-create="false">
        ${field('sync-email', 'email', 'username', t.syncEmail)}
        ${field('sync-password', 'password', 'current-password', t.syncPassword)}
        <div id="sync-create" class="create-fields" hidden>
          ${field('sync-again', 'password', 'new-password', t.syncAgain)}
          <span class="muted" style="font-size:13px">${esc(t.syncRule)}</span>
          <input type="text" id="sync-invite" class="text-input" autocomplete="off" autocapitalize="characters" spellcheck="false" dir="ltr"
            placeholder="${esc(t.syncInvite)}" aria-label="${esc(t.syncInvite)}">
          <span class="muted" style="font-size:13px">${esc(t.syncInviteHint)}</span>
        </div>
        <button type="submit" class="btn-primary" id="sync-login">${esc(t.syncLogin)}</button>
        <button type="button" class="btn-soft" data-act="sync-mode" id="sync-mode">${esc(t.syncToCreate)}</button>
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
  // A sign-in or new-account form is saved with its button: "Close" in the header.
  const form = Boolean(status && status.configured && !status.signed_in && ctx.mode !== 'server');
  return { close: form, title: t.syncRow, body: `${body}${note}` };
}

/** Settings > Profile, and the one-time question at the first sign-in (design.md §6). */
export function profileSheet(profile, ctx, first = false) {
  const { t } = ctx;
  if (!profile || !profile.editable) {
    return { title: t.profileTitle, body: `<span class="muted" style="font-size:15px;line-height:21px">${esc(t.profileNeedsAccount)}</span>` };
  }
  return {
    close: true,
    title: first ? t.askName : t.profileTitle,
    body: `<form id="profile-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        <input id="profile-input" class="text-input" maxlength="40" autocomplete="given-name" value="${esc(profile.name || '')}"
          placeholder="${esc(t.profileName)}" aria-label="${esc(t.profileName)}">
        <span class="muted" style="font-size:13px">${esc(t.profileHint)}</span>
        <button type="submit" class="btn-primary">${esc(ctx.t.txSave)}</button>
        ${first ? `<button type="button" class="btn-soft" data-act="close">${esc(t.profileSkip)}</button>` : ''}
      </form>
      <div id="profile-results" class="results" aria-live="polite"></div>`,
  };
}


// ---- Categories and budgets (design.md §6, editor parts one and two): names per language,
// order, the budget per group, move, add, delete and restore. Colours come later. The keys
// the ledger and the rules use never change; every number comes from the engine.
const groupLabel = (g, ctx) => (g.kind === 'expense' ? ctx.bucketName(g.key) : ctx.t.kinds[g.kind] || g.kind);

function budgetRow(g, ctx, editable) {
  const { t } = ctx;
  const value = g.budget == null ? `<span class="muted">${esc(t.catEdNoBudget)}</span>` : amt(g.budget);
  if (!editable) return `<div class="row bud-row"><span class="main muted">${esc(t.catEdBudget)}</span><span class="value">${value}</span></div>`;
  return `<div class="row bud-row"><span class="main muted">${esc(t.catEdBudget)}${g.rent ? ` · ${esc(t.catEdRent)}` : ''}</span>
    <span class="bud-steps">
      <button type="button" class="arrow" data-act="bud-step" data-arg="${esc(g.bucket)}|-1" aria-label="${esc(t.catEdLess)}"${!g.budget ? ' disabled' : ''}>−</button>
      <button type="button" class="bud-value" data-act="bud-type" data-arg="${esc(g.bucket)}" aria-label="${esc(t.catEdType)}">${value}</button>
      <button type="button" class="arrow" data-act="bud-step" data-arg="${esc(g.bucket)}|1" aria-label="${esc(t.catEdMore)}">+</button></span></div>`;
}

export function categoryEditorSheet(data, ctx) {
  const { t } = ctx;
  if (!data) return { title: t.catEdTitle, body: `<div class="empty">${esc(t.loadError)}</div>` };
  const editable = data.editable;
  const rows = (g) => g.categories.map((c, i) => `<div class="row cat-ed-row">
      ${editable ? `<button type="button" class="cat-ed-name" data-act="cat-name" data-arg="${esc(c.name)}">
        <span class="name">${esc(ctx.categoryName(c.name))}</span>${icon('chevron', 14, 'class="chev" stroke-width="1.8"')}</button>
      <span class="cat-ed-order">
        <button type="button" class="arrow" data-act="cat-up" data-arg="${esc(c.name)}" aria-label="${esc(t.goalUp)}"${i === 0 ? ' disabled' : ''}>↑</button>
        <button type="button" class="arrow" data-act="cat-down" data-arg="${esc(c.name)}" aria-label="${esc(t.goalDown)}"${i === g.categories.length - 1 ? ' disabled' : ''}>↓</button></span>`
    : `<span class="name">${esc(ctx.categoryName(c.name))}</span>`}
    </div>`).join('');
  const head = (g) => (editable && g.kind === 'expense'
    ? `<button type="button" class="grp-title" data-act="grp-open" data-arg="${esc(g.bucket)}"><span class="label">${esc(groupLabel(g, ctx))}</span>${icon('chevron', 12, 'class="chev" stroke-width="1.8"')}</button>`
    : `<h3 class="label">${esc(groupLabel(g, ctx))}</h3>`);
  const groups = data.groups.map((g) => `<section class="group">${head(g)}
      <div class="card">${g.kind === 'expense' ? budgetRow(g, ctx, editable) : ''}${rows(g)}
        ${editable && g.kind === 'expense' ? `<button type="button" class="row cat-new" data-act="cat-new" data-arg="${esc(g.bucket)}">+ ${esc(t.catEdNew)}</button>` : ''}</div></section>`).join('');
  const deleted = editable && data.deleted.length ? `<section class="group"><h3 class="label">${esc(t.catEdDeleted)}</h3><div class="card">
      ${data.deleted.map((d) => `<div class="row cat-ed-row"><span class="main"><span class="name">${esc(ctx.categoryName(d.name))}</span>
        ${d.into ? `<span class="sub">${esc(t.catEdInto(ctx.categoryName(d.into)))}</span>` : ''}</span>
        <button type="button" class="btn-soft small" data-act="cat-restore" data-arg="${esc(d.name)}">${esc(t.catEdRestore)}</button></div>`).join('')}
    </div></section>` : '';
  return {
    title: t.catEdTitle,
    body: `<span class="muted" style="font-size:14px;line-height:20px">${esc(editable ? t.catEdHint : t.catEdNeedsAccount)}</span>
      ${groups}${deleted}`,
  };
}

const nameFields = (prefix, own, defaults, t) => ['he', 'en'].map((lang) => `<label class="field"><span class="flabel">${esc(lang === 'he' ? t.catEdHe : t.catEdEn)}</span>
      <input id="${prefix}-${lang}" class="text-input" maxlength="40" lang="${lang}" dir="${lang === 'he' ? 'rtl' : 'ltr'}"
        value="${esc(own[lang] || '')}" placeholder="${esc(defaults[lang])}"></label>`).join('');

/** Where a category lives in the editor's data: its group and its own flags. */
export function findCategory(data, name) {
  for (const g of (data && data.groups) || []) {
    const c = g.categories.find((x) => x.name === name);
    if (c) return { group: g, category: c };
  }
  return null;
}

/** One category: its names, its group (spending ones), and Delete (with where its
 *  transactions go, when it has any). `pickInto` shows the choice of a replacement. */
export function categoryNameSheet(name, ctx, defaults, data, pickInto = false) {
  const { t } = ctx;
  const own = ctx.labels[name] || {};
  const found = findCategory(data, name);
  const changed = own.he || own.en;
  let move = '';
  if (found && found.group.kind === 'expense') {
    move = `<div class="field"><span class="flabel">${esc(t.catEdGroup)}</span><div class="cat-chips">${data.groups.filter((g) => g.kind === 'expense').map((g) =>
      `<button type="button" class="cat-chip" aria-pressed="${g.bucket === found.group.bucket}" data-act="cat-move" data-arg="${esc(g.bucket)}">${esc(groupLabel(g, ctx))}</button>`).join('')}</div></div>`;
  }
  let remove = '';
  if (found && found.category.deletable) {
    if (pickInto) {
      const same = data.groups.filter((g) => g.kind === found.group.kind);
      remove = `<div class="field"><span class="flabel">${esc(t.catEdWhere)}</span>
        ${same.map((g) => `<span class="muted" style="font-size:13px">${esc(groupLabel(g, ctx))}</span><div class="cat-chips">${g.categories.filter((c) => c.name !== name).map((c) =>
          `<button type="button" class="cat-chip" data-act="cat-del-into" data-arg="${esc(c.name)}">${esc(ctx.categoryName(c.name))}</button>`).join('')}</div>`).join('')}</div>`;
    } else {
      remove = `<button type="button" class="btn-soft" data-act="cat-del">${esc(t.catEdDelete)}</button>`;
    }
  }
  return {
    close: true,
    title: ctx.categoryName(name),
    body: `<form id="cat-name-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        ${nameFields('cat-name', own, defaults, t)}
        <span class="muted" style="font-size:13px">${esc(t.catEdNameHint)}</span>
        <button type="submit" class="btn-primary">${esc(t.txSave)}</button>
        ${changed ? `<button type="button" class="btn-soft" data-act="cat-reset">${esc(t.catEdReset)}</button>` : ''}
      </form>
      ${move}${remove}
      <button type="button" class="btn-soft" data-act="cat-editor">${esc(t.catEdBack)}</button>
      <div id="cat-name-results" class="results" aria-live="polite"></div>`,
  };
}

/** A spending group: its names, and Delete (its categories move to another group first). */
export function groupSheet(bucket, ctx, defaults, data, pickInto = false) {
  const { t } = ctx;
  const g = data.groups.find((x) => x.bucket === bucket);
  const own = ctx.groupLabels[bucket] || {};
  let remove = '';
  if (g.deletable) {
    if (g.categories.length && pickInto) {
      remove = `<div class="field"><span class="flabel">${esc(t.grpMoveAll(g.categories.length))}</span><div class="cat-chips">${data.groups.filter((x) => x.kind === 'expense' && x.bucket !== bucket).map((x) =>
        `<button type="button" class="cat-chip" data-act="grp-del-into" data-arg="${esc(x.bucket)}">${esc(groupLabel(x, ctx))}</button>`).join('')}</div></div>`;
    } else {
      remove = `<button type="button" class="btn-soft" data-act="grp-del">${esc(t.grpDelete)}</button>`;
    }
  }
  return {
    close: true,
    title: groupLabel(g, ctx),
    body: `<form id="grp-name-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        ${nameFields('grp-name', own, defaults, t)}
        <span class="muted" style="font-size:13px">${esc(t.grpNameHint)}</span>
        <button type="submit" class="btn-primary">${esc(t.txSave)}</button>
      </form>
      ${remove}
      <button type="button" class="btn-soft" data-act="cat-editor">${esc(t.catEdBack)}</button>
      <div id="grp-results" class="results" aria-live="polite"></div>`,
  };
}

/** Typing a group's monthly budget (the steps of 100 are on the editor itself). */
export function budgetSheet(g, ctx) {
  const { t } = ctx;
  return {
    close: true,
    title: t.catEdBudgetOf(groupLabel(g, ctx)),
    body: `<form id="bud-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        <input id="bud-amount" class="text-input" inputmode="decimal" dir="ltr" value="${esc(g.budget_text || '')}" placeholder="0" aria-label="${esc(t.catEdBudget)}">
        <button type="submit" class="btn-primary">${esc(t.txSave)}</button></form>
      <button type="button" class="btn-soft" data-act="cat-editor">${esc(t.catEdBack)}</button>
      <div id="bud-results" class="results" aria-live="polite"></div>`,
  };
}

/** A new category in a group: one name is enough. */
export function newCategorySheet(g, ctx) {
  const { t } = ctx;
  return {
    close: true,
    title: t.catEdNewIn(groupLabel(g, ctx)),
    body: `<form id="cat-new-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        <input id="cat-new-name" class="text-input" maxlength="40" dir="auto" placeholder="${esc(t.catEdNewPh)}" aria-label="${esc(t.catEdNew)}">
        <span class="muted" style="font-size:13px">${esc(t.catEdNewHint)}</span>
        <button type="submit" class="btn-primary">${esc(t.txSave)}</button></form>
      <button type="button" class="btn-soft" data-act="cat-editor">${esc(t.catEdBack)}</button>
      <div id="cat-new-results" class="results" aria-live="polite"></div>`,
  };
}

// ---- A source of my own (design.md §12 item 9): map the columns of a file no adapter knows.
// The browser only collects the choices; the engine checks them and reads the file.
const MAP_ROLES = ['date', 'description', 'amount', 'debit', 'credit', 'balance', 'billing'];

/** pending: { file, tables, table (index), id (after a first save) } */
export function mapSheet(pending, ctx) {
  const { t } = ctx;
  const table = pending.tables[pending.table];
  const guess = table.guess || {};
  const roleOf = (header) => MAP_ROLES.find((role) => guess[role] === header) || '';
  const options = (header) => ['', ...MAP_ROLES].map((role) =>
    `<option value="${role}"${roleOf(header) === role ? ' selected' : ''}>${esc(role ? t.mapRoles[role] : t.mapUnused)}</option>`).join('');
  const sample = (i) => table.rows.map((row) => row[i]).find((v) => v) || '';
  const columns = table.headers.map((header, i) => header ? `<div class="row map-col">
      <span class="main"><span class="name">${esc(header)}</span><span class="sub" dir="auto">${esc(sample(i))}</span></span>
      <select class="text-input map-role" data-col="${esc(header)}" aria-label="${esc(t.mapRoleOf(header))}">${options(header)}</select></div>` : '').join('');
  const seg = (name, values, chosen) => `<div class="seg small" data-seg="${name}">${values.map(([key, label]) =>
    `<button type="button" aria-pressed="${key === chosen}" data-act="map-seg" data-arg="${name}:${key}">${esc(label)}</button>`).join('')}</div>`;
  const kind = guess.kind || 'bank';
  const tables = pending.tables.length > 1 ? `<div class="field"><span class="flabel">${esc(t.mapSheetL)}</span>
      <div class="cat-chips">${pending.tables.map((x, i) => `<button type="button" class="cat-chip" aria-pressed="${i === pending.table}" data-act="map-table" data-arg="${i}">${esc(x.sheet)}</button>`).join('')}</div></div>` : '';
  const stem = pending.file.replace(/\.[^.]+$/, '');
  return {
    close: true,
    title: t.mapTitle,
    body: `<span class="muted" style="font-size:14px;line-height:20px">${esc(t.mapIntro)}</span>
      <form id="map-form" class="map-form">
        <label class="field"><span class="flabel">${esc(t.mapName)}</span>
          <input id="map-name" class="text-input" maxlength="40" value="${esc(pending.name || stem)}"></label>
        <div class="field"><span class="flabel">${esc(t.mapKind)}</span>${seg('kind', [['bank', t.mapBank], ['card', t.mapCard]], kind)}</div>
        ${tables}
        <div class="field"><span class="flabel">${esc(t.mapColumns)}</span><div class="card">${columns}</div></div>
        <div class="field"><span class="flabel">${esc(t.mapOrder)}</span>${seg('date_order', [['dmy', t.mapDmy], ['mdy', t.mapMdy], ['ymd', t.mapYmd]], guess.date_order || 'dmy')}</div>
        <div class="field"><span class="flabel">${esc(t.mapSign)}</span>${seg('spending', [['negative', t.mapSignNeg], ['positive', t.mapSignPos]], guess.spending || 'negative')}
          <span class="muted" style="font-size:13px">${esc(t.mapSignHint)}</span></div>
        <label class="field" id="map-label-field"${kind === 'card' ? '' : ' hidden'}><span class="flabel">${esc(t.mapLabel)}</span>
          <input id="map-label" class="text-input" maxlength="60" placeholder="${esc(t.mapLabelPh)}">
          <span class="muted" style="font-size:13px">${esc(t.mapLabelHint)}</span></label>
        <button type="submit" class="btn-primary">${esc(t.mapSave)}</button>
      </form>
      <div id="map-results" class="results" aria-live="polite"></div>`,
  };
}

/** The choices on the sheet as the engine's source_map fields. */
export function mapFields(pending, root) {
  const table = pending.tables[pending.table];
  const pressed = (name) => root.querySelector(`[data-seg="${name}"] [aria-pressed="true"]`)?.dataset.arg.split(':')[1];
  const fields = {
    name: root.querySelector('#map-name').value.trim(),
    kind: pressed('kind'),
    sheet: table.sheet,
    headers: table.headers,
    date_order: pressed('date_order'),
    spending: pressed('spending'),
  };
  for (const select of root.querySelectorAll('.map-role')) if (select.value) fields[select.value] = select.dataset.col;
  if (fields.kind === 'card') fields.bank_label = root.querySelector('#map-label').value.trim() || null;
  return fields;
}

/** After a new account: the recovery code, once, and a required "I saved it" before going on. */
export function recoveryShown(code, ctx) {
  const { t } = ctx;
  return `<div class="pos">${esc(t.syncCreated)}</div>
    <code class="recovery-code" dir="ltr">${esc(code)}</code>
    <div class="muted">${esc(t.syncCodeKeep)}</div>
    <label class="check-row"><input type="checkbox" id="code-saved"> <span>${esc(t.syncCodeSaved)}</span></label>
    <button type="button" class="btn-primary" data-act="first-run" id="first-run" disabled>${esc(t.syncContinue)}</button>`;
}
