// Home: answer first. Money left this month, then the overdraft, the goals and what is coming.

import { icon } from '../icons.js';
import { statusColour } from '../theme.js';
import { amt, amtText, bigAmount, bucketIcon, esc, tile } from '../ui.js';

const LEVEL_ICONS = { on_track: 'check', fast: 'clock', over_pace: 'alert' };

function greeting(t) {
  const hour = new Date().getHours();
  return hour < 12 ? t.greetMorning : hour < 18 ? t.greetAfternoon : t.greetEvening;
}

/** One quiet line when the latest data is older than today (design.md §6 "Dates"): "Data up to 12.11". */
function dataLine(data, ctx) {
  if (!data.data_stale || !data.data_date) return '';
  const [, month, day] = data.data_date.split('-');
  return `<span class="lead note">${esc(ctx.t.dataThrough(`${day}.${month}`))}</span>`;
}

function hero(data, ctx) {
  const { t } = ctx;
  const budget = data.budget;
  if (!budget) {
    return `<div class="hero"><span class="lead">${esc(t.noBudgetHint)}</span>${dataLine(data, ctx)}</div>`;
  }
  const p = budget.total;
  const over = p.left < 0;
  const m = Number(budget.month.split('-')[1]);
  const short = t.months[m - 1];
  const fill = Math.min(100, p.spent_pct);
  const today = (p.day * 100) / p.days_in_month;
  // C12: the card's colour shows the pace; the corner icon and its label say the same in words.
  const colour = p.ratio_permille == null ? null : statusColour(p.ratio_permille, ctx.prefs);
  const style = colour ? ` style="background:${colour.bg};--hero:${colour.bg};--hero-sub:${colour.sub}"` : '';
  const label = p.level ? t.levels[p.level] : '';
  const status = p.level
    ? `<span class="status" role="img" aria-label="${esc(label)}" title="${esc(label)}">${icon(LEVEL_ICONS[p.level], 18, 'stroke-width="2"')}</span>`
    : '';
  const preview = budget.preview
    ? `<span class="lead note">${esc(t.preview(ctx.month(budget.start_month, true)))}</span>`
    : '';
  return `<div class="hero"${style}>${status}
    <span class="lead">${esc(over ? t.qOver : t.q1)}</span>
    ${bigAmount(Math.abs(p.left))}
    ${over ? '' : `<span class="lead">${esc(t.q3(Math.max(1, p.days_left)))}</span>`}
    <div class="chips">${over ? '' : `<span class="pace amt">${esc(t.paceFn(amtText(p.daily)))}</span>`}</div>
    <div class="month">
      <div class="track"><div class="line"></div><div class="done" style="width:${fill}%"></div>
        <div class="today" style="inset-inline-start:calc(${today.toFixed(1)}% - 7px)"></div></div>
      <div class="ends"><span>${esc(t.dayMonth(1, short))}</span><span>${esc(t.dayOf(p.day, p.days_in_month))}</span>
        <span>${esc(t.dayMonth(p.days_in_month, short))}</span></div>
    </div>
    ${dataLine(data, ctx)}
    ${preview}
  </div>`;
}

function overview(data, ctx) {
  const { t } = ctx;
  const negative = data.balance < 0;
  const note = negative && data.overdraft_limit
    ? t.odNote(amtText(data.overdraft_limit))
    : t.balNote(ctx.dayMonth(data.balance_date));
  return `<section class="group"><h2 class="label">${esc(t.overview)}</h2><div class="card">
    <div class="row">${tile(negative ? 'rent' : 'food', negative ? 'minus' : 'wallet')}
      <div class="main"><span class="name">${esc(negative ? t.od : t.bal)}</span>
        <span class="sub amt">${esc(note)}</span></div>
      <span class="value">${amt(Math.abs(data.balance), { sign: 'none' })}</span></div>
  </div></section>`;
}

const GOAL_LOOK = [['check', 'food'], ['shield', 'transport'], ['plane', 'recurring']];

function goals(data, ctx) {
  if (!data.goals.length) return '';
  const rows = data.goals.map((g, i) => {
    const [ic, tone] = GOAL_LOOK[i % GOAL_LOOK.length];
    return `<button type="button" class="row" style="min-height:70px;padding-block:12px" data-act="tab" data-arg="goals">
      ${tile(tone, ic)}
      <div class="main" style="gap:9px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
        <span class="name">${esc(ctx.goalName(g.name))}</span><span class="num" dir="ltr" style="font-size:15px;font-weight:500">${g.progress_pct}%</span></div>
        <div class="bar thin"><div class="fill" style="width:${g.progress_pct}%"></div></div></div>
      ${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>`;
  }).join('');
  return `<section class="group"><h2 class="label">${esc(ctx.t.goals)}</h2><div class="card">${rows}</div></section>`;
}

function coming(data, ctx) {
  if (!data.coming.length) return '';
  const { t } = ctx;
  const rows = data.coming.map((c) => {
    const name = c.kind === 'fixed' ? ctx.bucketName(c.bucket)
      : c.kind === 'commitment' ? `${ctx.categoryName(c.name)} · ${t.installment(c.number, c.of)}`
        : c.name;
    const look = c.kind === 'fixed' ? 'home' : c.kind === 'commitment' ? 'repeat' : 'card';
    return `<div class="row">${tile(c.bucket, look)}
      <div class="main"><span class="name">${esc(name)}</span><span class="sub">${esc(ctx.month(c.month))}</span></div>
      <span class="value small">${amt(c.amount, { sign: 'none' })}</span></div>`;
  }).join('');
  return `<section class="group"><h2 class="label">${esc(t.coming)}</h2><div class="card">${rows}</div></section>`;
}

function groups(data, ctx) {
  const budget = data.budget;
  if (!budget) return '';
  const rows = Object.entries(budget.buckets).map(([name, p]) => {
    const key = ctx.bucketKey(name);
    return `<div class="row" style="min-height:64px">${tile(key, bucketIcon(key))}
      <div class="main" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:12px">
        <span class="name">${esc(ctx.bucketName(key))}</span><span class="muted amt" style="font-size:14px">${esc(ctx.t.of + amtText(p.ceiling))}</span></div>
        <div class="bar"><div class="fill" style="background:var(--b-${key});width:${Math.min(100, p.spent_pct)}%"></div>
          <div class="tick" style="inset-inline-start:${p.even_pct}%"></div></div></div>
      <span class="value small">${amt(p.spent)}</span></div>`;
  }).join('');
  return `<section class="group desktop-only"><h2 class="label">${esc(ctx.t.tabCat)}</h2><div class="card">${rows}</div></section>`;
}

export function render(data, ctx) {
  return `<div class="screen home">
    <div class="col-main">
      <section class="group o-hero" style="gap:12px"><h1 class="label greet">${esc(greeting(ctx.t))}</h1>${hero(data, ctx)}</section>
      ${groups(data, ctx)}
      <div class="o-coming">${coming(data, ctx)}</div>
    </div>
    <div class="col-side">
      <div class="o-overview">${overview(data, ctx)}</div>
      <div class="o-goals">${goals(data, ctx)}</div>
    </div>
  </div>`;
}
