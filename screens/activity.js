// Activity: transactions grouped by day, with a spending total per day.

import { amt, amtText, categoryIcon, esc, tile } from '../ui.js';

export function render(data, ctx, ui) {
  const { t } = ctx;
  const filter = ui.filter || 'all';
  const keep = (item) => filter === 'all' || (filter === 'out' ? item.amount < 0 : item.amount > 0);
  const lastMonth = data.days.length ? data.days[0].date.slice(0, 7) : data.first_month;
  const range = data.first_month === lastMonth ? ctx.month(lastMonth, true)
    : `${ctx.month(data.first_month, true)} – ${ctx.month(lastMonth, true)}`;
  const filters = [['all', t.fAll], ['out', t.fOut], ['in', t.fIn]].map(([key, label]) =>
    `<button type="button" aria-pressed="${key === filter}" data-act="filter" data-arg="${key}">${esc(label)}</button>`).join('');
  const days = data.days.map((day) => {
    const items = day.items.filter(keep);
    if (!items.length) return '';
    const rows = items.map((item) => {
      const income = item.amount > 0;
      return `<button type="button" class="row" data-act="tx" data-arg="${item.id}" data-tx="${esc(item.tx)}">
        ${tile(item.bucket, categoryIcon(item.category, item.bucket))}
        <div class="main"><span class="name">${esc(item.name)}</span>
          <span class="sub">${item.pending ? `<span class="pending">${esc(t.pending)}</span> · ` : ''}${esc(ctx.categoryName(item.category))} · ${esc(ctx.sourceName(item.source))}</span>
          ${item.note ? `<span class="sub note-line">${esc(item.note)}</span>` : ''}</div>
        <span class="value small${income ? ' pos' : ''}">${amt(item.amount, { sign: income ? 'plus' : 'none' })}</span>
      </button>`;
    }).join('');
    const total = day.spent > 0 && filter !== 'in' ? amt(day.spent, { sign: 'none' }) : '';
    return `<section class="group" style="margin-top:2px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:0 6px">
        <h2 class="label" style="padding:0">${esc(ctx.dayLabel(day.date))}</h2>
        <span class="muted" style="font-size:14px;font-weight:500">${total}</span></div>
      <div class="card">${rows}</div></section>`;
  }).join('');
  return `<div class="screen">
    <div class="title-block"><h1 class="title">${esc(t.actTitle)}</h1><span class="subtitle">${esc(data.range && data.range.from ? rangeLabel(ui.range, data.range, ctx) : range)}</span></div>
    <div class="act-grid"><div class="act-list">
      <div class="act-tools">
        <input type="search" id="act-q" class="text-input search-input" value="${esc(ui.q || '')}" placeholder="${esc(t.searchHint)}" aria-label="${esc(t.searchHint)}" enterkeyhint="search">
        <button type="button" class="btn-soft range-btn" data-act="range-open" aria-haspopup="dialog">${esc(ui.range ? rangeLabel(ui.range, data.range, ctx) : t.rangeAny)} ⌄</button>
      </div>
      ${rangeChip(data.range, ui, ctx)}
      <div class="seg">${filters}</div>
      ${days || `<div class="card"><div class="empty">${esc(data.range ? t.noneInRange : '—')}</div></div>`}
    </div>
    <aside class="tx-panel" id="tx-panel"><div class="card"><div class="empty">${esc(t.txPick)}</div></div></aside></div>
  </div>`;
}

/** The chosen range in words: a preset's name, a month, or "12.10 – 3.11". */
function rangeLabel(range, totals, ctx) {
  const { t } = ctx;
  if (!range) return t.rangeAny;
  if (range.preset === 'month') return ctx.month(range.month, true);
  if (range.preset === 'custom' && totals && totals.from) {
    const short = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)}.${Number(m)}`; };
    return `${short(totals.from)} – ${short(totals.to)}`;
  }
  return t.rangePresets[range.preset] || '';
}

/** The range's (or search's) totals from the engine, and one tap to clear it. */
function rangeChip(totals, ui, ctx) {
  const { t } = ctx;
  if (!totals) return '';
  const filter = ui.filter || 'all';
  const parts = [];
  if (filter !== 'in') parts.push(t.rangeOut(amtText(totals.out)));
  if (filter !== 'out') parts.push(t.rangeIn(amtText(totals.in)));
  const clear = ui.range ? `<button type="button" class="chip-clear" data-act="range-clear" aria-label="${esc(t.rangeClear)}">✕</button>` : '';
  return `<div class="range-chip"><span>${esc(t.rangeCount(totals.count))} · ${esc(parts.join(' · '))}</span>${clear}</div>`;
}

/** The date filter sheet: presets, one month, or a custom from-to. */
export function rangeSheet(range, ctx) {
  const { t } = ctx;
  const presets = ['this_month', 'last_month', 'last_3_months', 'this_year'].map((key) =>
    `<button type="button" class="cat-chip" aria-pressed="${!!range && range.preset === key}" data-act="range-set" data-arg="${key}">${esc(t.rangePresets[key])}</button>`).join('');
  return {
    title: t.rangeTitle,
    body: `<div class="cat-chips">${presets}</div>
      <div class="field"><span class="flabel">${esc(t.rangeMonth)}</span>
        <div class="pack-form"><input type="month" id="range-month" class="text-input" dir="ltr" value="${esc(range && range.preset === 'month' ? range.month : '')}" aria-label="${esc(t.rangeMonth)}">
        <button type="button" class="btn-soft" data-act="range-month">${esc(t.rangeShow)}</button></div></div>
      <div class="field"><span class="flabel">${esc(t.rangeCustom)}</span>
        <div class="pack-form"><input type="date" id="range-from" class="text-input" dir="ltr" value="${esc(range && range.from || '')}" aria-label="${esc(t.rangeFrom)}">
        <input type="date" id="range-to" class="text-input" dir="ltr" value="${esc(range && range.to || '')}" aria-label="${esc(t.rangeTo)}"></div>
        <button type="button" class="btn-primary" data-act="range-custom">${esc(t.rangeShow)}</button></div>
      ${range ? `<button type="button" class="btn-soft" data-act="range-clear">${esc(t.rangeClear)}</button>` : ''}`,
  };
}

const SCOPES = ['one', 'merchant', 'merchant_amount'];

/**
 * The transaction sheet (design.md §5 "Transaction sheet", §6 "Wrong category").
 * `details` comes from the engine (views.transaction) and is null while it loads; `pick`
 * holds what the user chose in the sheet: { category, scope }.
 */
export function sheet(item, day, ctx, details = null, pick = {}) {
  const { t } = ctx;
  const income = item.amount > 0;
  const head = `<span class="big amt${income ? ' pos' : ''}" dir="ltr" style="font-size:56px;line-height:60px;letter-spacing:-0.045em">${income ? '+' : '−'}<span class="sym" style="font-size:22px;line-height:24px;margin-top:9px;color:var(--sub)">₪</span>${Math.round(Math.abs(item.amount) / 100).toLocaleString('en-US')}</span>
      <div class="card">
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txDate)}</span><span>${esc(ctx.dayLabel(day))}</span></div>
        ${details && details.installment ? `<div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txInstallment)}</span>
          <span>${esc(t.txOf(details.installment.number, details.installment.of))}</span></div>
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txBoughtCharged)}</span>
          <span>${esc(`${ctx.dayMonth(details.installment.bought)} · ${ctx.dayMonth(details.installment.charged)}`)}</span></div>` : ''}
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txPaid)}</span><span>${esc(ctx.sourceName(item.source))}</span></div>
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txCat)}</span>
          <span>${esc(ctx.categoryName(item.category))}${item.bucket !== 'other' ? ` · ${esc(ctx.bucketName(item.bucket))}` : ''}</span></div>
      </div>`;
  if (!details) return { title: item.name, body: `${head}<span class="muted tx-note">${esc(t.loading)}</span>` };
  if (!details.editable) return { title: item.name, body: `${head}<span class="muted tx-note">${esc(t.txNeedsAccount)}</span>` };
  const chosen = pick.category || details.category;
  const changed = chosen !== details.category;
  const groupLabel = (g) => (g.kind === 'expense' ? ctx.bucketName(g.key) : t.kinds[g.kind] || g.kind);
  const picker = details.groups.map((g) => `<div class="field"><span class="flabel">${esc(groupLabel(g))}</span>
      <div class="cat-chips">${g.categories.map((name) => `<button type="button" class="cat-chip" aria-pressed="${name === chosen}" data-act="tx-cat" data-arg="${esc(name)}">${esc(ctx.categoryName(name))}</button>`).join('')}</div></div>`).join('');
  let scope = '';
  if (changed && !details.manual) {
    const current = pick.scope || 'one';
    const labels = {
      one: [t.scopeOne, true],
      merchant: [t.scopeMerchant(details.name, details.merchant_count), details.merchant_count > 1],
      merchant_amount: [t.scopeAmount(details.name, amtText(details.amount), details.merchant_amount_count), details.merchant_amount_count > 1],
    };
    scope = `<div class="field"><span class="flabel">${esc(t.scopeTitle)}</span><div class="scope-list" role="radiogroup">
      ${SCOPES.map((key) => `<button type="button" role="radio" aria-checked="${key === current}" data-act="tx-scope" data-arg="${key}"${labels[key][1] ? '' : ' disabled'}>${esc(labels[key][0])}</button>`).join('')}</div></div>`;
  }
  // The title (design.md §5): any imported transaction can get its own name; the bank's text stays.
  const titleNow = pick.title ?? details.name;
  const titleChanged = titleNow.trim() && titleNow.trim() !== details.name;
  const titleScope = pick.titleScope || 'one';
  const titleScopes = {
    one: [t.scopeOne, true],
    merchant: [t.titleScopeMerchant(details.original, details.merchant_count), details.merchant_count > 1],
    merchant_amount: [t.titleScopeAmount(details.original, amtText(details.amount), details.merchant_amount_count), details.merchant_amount_count > 1],
  };
  const title = details.manual ? '' : `<div class="field"><span class="flabel">${esc(t.txTitle)}</span>
      <input id="tx-title" class="text-input" maxlength="80" value="${esc(titleNow)}" aria-label="${esc(t.txTitle)}">
      ${details.renamed ? `<span class="muted tx-note">${esc(t.bankName(details.original))}
        <button type="button" class="link-btn" data-act="tx-restore-title">${esc(t.restoreOriginal)}</button></span>` : ''}
      <div id="title-scope" class="scope-list" role="radiogroup"${titleChanged ? '' : ' hidden'}>
        ${SCOPES.map((key) => `<button type="button" role="radio" aria-checked="${key === titleScope}" data-act="tx-title-scope" data-arg="${key}"${titleScopes[key][1] ? '' : ' disabled'}>${esc(titleScopes[key][0])}</button>`).join('')}</div></div>`;
  const manual = details.manual ? `<form id="tx-manual" class="pack-form" style="flex-direction:column;align-items:stretch">
      <input id="tx-name" class="text-input" value="${esc(pick.name ?? details.name)}" aria-label="${esc(t.txName)}" placeholder="${esc(t.txName)}">
      <input id="tx-amount" class="text-input" inputmode="decimal" dir="ltr" value="${esc(pick.amount ?? details.amount_text)}" aria-label="${esc(t.txAmount)}" placeholder="${esc(t.txAmount)}">
      <input id="tx-date" class="text-input" type="date" dir="ltr" value="${esc(pick.date ?? details.date)}" aria-label="${esc(t.txDate)}">
    </form>` : `<span class="muted tx-note">${esc(t.txFromBank)}</span>`;
  const note = `<div class="field"><span class="flabel">${esc(t.txNote)}</span>
      <textarea id="tx-note" class="text-input note-input" rows="2" maxlength="500" placeholder="${esc(t.txNoteHint)}" aria-label="${esc(t.txNote)}">${esc(pick.note ?? details.note ?? '')}</textarea></div>`;
  const save = `<button type="button" class="btn-primary" data-act="tx-save">${esc(t.txSave)}</button>`;
  const remove = details.manual ? `<button type="button" class="btn-soft" data-act="tx-delete">${esc(t.txDelete)}</button>` : '';
  return {
    close: true,
    title: details.name,
    body: `${head}${title}${manual}${note}<div id="tx-results" class="results" aria-live="polite"></div>${picker}${scope}${save}${remove}`,
  };
}

/** The "+" sheet (design.md §11.2): amount first, description, category, date, source, note. */
export function addSheet(add, ctx) {
  const { t } = ctx;
  if (!add || !add.options || !add.options.editable) {
    return { title: t.addTitle, body: `<span class="muted tx-note">${esc(t.txNeedsAccount)}</span>` };
  }
  const groupLabel = (g) => (g.kind === 'expense' ? ctx.bucketName(g.key) : t.kinds[g.kind] || g.kind);
  const picker = add.options.groups.filter((g) => g.kind === 'expense').map((g) => `<div class="field"><span class="flabel">${esc(groupLabel(g))}</span>
      <div class="cat-chips">${g.categories.map((name) => `<button type="button" class="cat-chip" aria-pressed="${name === add.category}" data-act="add-cat" data-arg="${esc(name)}">${esc(ctx.categoryName(name))}</button>`).join('')}</div></div>`).join('');
  const sources = add.options.sources.map((key) => `<button type="button" class="cat-chip" aria-pressed="${key === add.via}" data-act="add-via" data-arg="${esc(key)}">${esc(t.viaNames[key] || ctx.sourceName(key))}</button>`).join('');
  return {
    close: true,
    title: t.addTitle,
    body: `<form id="add-form" class="pack-form" style="flex-direction:column;align-items:stretch">
        <input id="add-amount" class="text-input add-amount" inputmode="decimal" dir="ltr" placeholder="₪0" value="${esc(add.amount)}" aria-label="${esc(t.txAmount)}">
        <input id="add-name" class="text-input" maxlength="200" placeholder="${esc(t.addName)}" value="${esc(add.name)}" aria-label="${esc(t.addName)}">
        <label class="field"><span class="flabel">${esc(t.txDate)}</span><input id="add-date" class="text-input" type="date" dir="ltr" value="${esc(add.date)}"></label>
        <div class="field"><span class="flabel">${esc(t.addVia)}</span><div class="cat-chips">${sources}</div>
          <span class="muted tx-note">${esc(['cash', 'other'].includes(add.via) ? t.addPermanent : t.addPending)}</span></div>
        <div class="field"><span class="flabel">${esc(t.txNote)}</span>
          <textarea id="add-note" class="text-input note-input" rows="2" maxlength="500" placeholder="${esc(t.txNoteHint)}">${esc(add.note)}</textarea></div>
        ${picker}
        <div id="add-results" class="results neg" aria-live="polite"></div>
        <button type="submit" class="btn-primary">${esc(t.txSave)}</button>
      </form>`,
  };
}

