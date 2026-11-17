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
          <span class="sub">${esc(ctx.categoryName(item.category))} · ${esc(ctx.sourceName(item.source))}</span></div>
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
    <div class="title-block"><h1 class="title">${esc(t.actTitle)}</h1><span class="subtitle">${esc(range)}</span></div>
    <div class="act-grid"><div class="act-list">
      <div class="seg">${filters}</div>
      ${days || `<div class="card"><div class="empty">—</div></div>`}
    </div>
    <aside class="tx-panel" id="tx-panel"><div class="card"><div class="empty">${esc(t.txPick)}</div></div></aside></div>
  </div>`;
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
  const manual = details.manual ? `<form id="tx-manual" class="pack-form" style="flex-direction:column;align-items:stretch">
      <input id="tx-name" class="text-input" value="${esc(pick.name ?? details.name)}" aria-label="${esc(t.txName)}" placeholder="${esc(t.txName)}">
      <input id="tx-amount" class="text-input" inputmode="decimal" dir="ltr" value="${esc(pick.amount ?? details.amount_text)}" aria-label="${esc(t.txAmount)}" placeholder="${esc(t.txAmount)}">
      <input id="tx-date" class="text-input" type="date" dir="ltr" value="${esc(pick.date ?? details.date)}" aria-label="${esc(t.txDate)}">
    </form>` : `<span class="muted tx-note">${esc(t.txFromBank)}</span>`;
  const save = `<button type="button" class="btn-primary" data-act="tx-save"${changed || details.manual ? '' : ' disabled'}>${esc(t.txSave)}</button>`;
  const remove = details.manual ? `<button type="button" class="btn-soft" data-act="tx-delete">${esc(t.txDelete)}</button>` : '';
  return {
    title: details.name,
    body: `${head}${manual}<div id="tx-results" class="results" aria-live="polite"></div>${picker}${scope}${save}${remove}`,
  };
}
