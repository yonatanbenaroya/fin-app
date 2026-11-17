// Activity: transactions grouped by day, with a spending total per day.

import { amt, categoryIcon, esc, tile } from '../ui.js';

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
      return `<button type="button" class="row" data-act="tx" data-arg="${item.id}">
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

/** The transaction sheet: read only in this version. */
export function sheet(item, day, ctx) {
  const { t } = ctx;
  const income = item.amount > 0;
  return {
    title: item.name,
    body: `<span class="big amt${income ? ' pos' : ''}" dir="ltr" style="font-size:56px;line-height:60px;letter-spacing:-0.045em">${income ? '+' : '−'}<span class="sym" style="font-size:22px;line-height:24px;margin-top:9px;color:var(--sub)">₪</span>${Math.round(Math.abs(item.amount) / 100).toLocaleString('en-US')}</span>
      <div class="card">
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txDate)}</span><span>${esc(ctx.dayLabel(day))}</span></div>
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txPaid)}</span><span>${esc(ctx.sourceName(item.source))}</span></div>
        <div class="row" style="min-height:52px"><span class="main muted" style="font-size:15px">${esc(t.txCat)}</span>
          <span>${esc(ctx.categoryName(item.category))}${item.bucket !== 'other' ? ` · ${esc(ctx.bucketName(item.bucket))}` : ''}</span></div>
      </div>`,
  };
}
