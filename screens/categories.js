// Categories: spending per budget group this month, against the budget, with a drill-down.

import { icon } from '../icons.js';
import { amt, amtText, bucketIcon, esc, tile } from '../ui.js';

const R = 78;
const CIRC = 2 * Math.PI * R;
const STATUS = { on_track: ['onPace', 'pos'], tight: ['ahead', 'warn'], over: ['overPace', 'neg'] };

function donut(groups) {
  let start = 0;
  const segs = groups.filter((g) => g.share_pct > 0).map((g) => {
    const length = Math.max(2, (CIRC * g.share_pct) / 100 - 4);
    const seg = `<circle cx="110" cy="110" r="${R}" stroke="var(--b-${g.key})" stroke-width="18"
      stroke-dasharray="${length.toFixed(1)} ${(CIRC - length).toFixed(1)}" stroke-dashoffset="${(-start).toFixed(1)}"
      transform="rotate(-90 110 110)"/>`;
    start += (CIRC * g.share_pct) / 100;
    return seg;
  }).join('');
  return `<svg width="220" height="220" viewBox="0 0 220 220" fill="none" aria-hidden="true" class="mirror" style="display:block">
    <circle cx="110" cy="110" r="${R}" stroke="var(--hair)" stroke-width="18"/>${segs}</svg>`;
}

function group(g, open, ctx) {
  const { t } = ctx;
  const pace = g.pace;
  const [statusKey, statusCls] = pace ? STATUS[pace.status] : ['noBudget', 'muted'];
  const bar = pace
    ? `<div class="bar"><div class="fill" style="background:var(--b-${g.key});width:${Math.min(100, pace.spent_pct)}%"></div>
        <div class="tick" style="inset-inline-start:${pace.even_pct}%"></div></div>`
    : '';
  const subs = open
    ? g.categories.map((c) => `<div class="row" style="min-height:40px;padding-inline-start:66px;gap:12px;border:0">
        <span class="dot" style="background:var(--b-${g.key})"></span>
        <span class="main" style="font-size:15px">${esc(ctx.categoryName(c.name))}</span>
        <span class="muted" style="font-size:15px;font-weight:500">${amt(c.spent, { sign: 'auto' })}</span></div>`).join('')
    : '';
  return `<div class="sep-first">
    <button type="button" class="row" style="align-items:flex-start;padding:16px" aria-expanded="${open}" data-act="group" data-arg="${esc(g.name)}">
      ${tile(g.key, bucketIcon(g.key))}
      <div class="main" style="gap:8px">
        <div style="display:flex;align-items:center;gap:8px"><span class="name" style="flex:1">${esc(ctx.bucketName(g.key))}</span>
          <span style="font-size:16px;font-weight:500">${amt(g.spent)}</span>
          ${icon('chevronDown', 16, `stroke-width="1.8" style="flex:none;opacity:.45;transform:${open ? 'rotate(180deg)' : 'none'}"`)}</div>
        ${bar}
        <div style="display:flex;justify-content:space-between;gap:12px;font-size:13px">
          <span class="${statusCls}" style="font-weight:500">${esc(t[statusKey])}</span>
          <span class="muted amt">${pace ? esc(t.of + amtText(pace.ceiling)) : ''}</span></div>
      </div></button>${subs}</div>`;
}

export function render(data, ctx, ui) {
  const { t } = ctx;
  const open = ui.openGroup === undefined ? data.open : ui.openGroup;
  const ceilings = data.budget ? data.budget.total.ceiling : null;
  const rows = data.groups.map((g) => group(g, open === g.name, ctx));
  if (data.rent) {
    rows.push(`<div class="row">${tile('rent', 'home')}<div class="main"><span class="name">${esc(ctx.bucketName('rent'))}</span>
      <span class="sub">${esc(t.rentNote)}</span></div><span class="value small">${amt(data.rent.spent)}</span></div>`);
  }
  const preview = data.budget && data.budget.preview
    ? `<span class="note">${esc(t.preview(ctx.month(data.budget.start_month, true)))}</span>` : '';
  return `<div class="screen">
    <div class="title-block"><h1 class="title">${esc(t.catTitle)}</h1>
      <span class="subtitle">${esc(t.catSub(ctx.month(data.month, true)))}</span></div>
    <section class="hero-card"><div class="donut">${donut(data.groups)}
      <div class="centre"><span class="muted" style="font-size:13px">${esc(t.spentSoFar)}</span>
        <span class="total">${amt(data.spent)}</span>
        <span class="muted amt" style="font-size:13px">${ceilings ? esc(t.ofBudgetFn(amtText(ceilings))) : ''}</span></div></div></section>
    <div class="card card-stack">${rows.join('')}</div>
    <span class="note">${esc(t.paceNote)}</span>${preview}
  </div>`;
}
