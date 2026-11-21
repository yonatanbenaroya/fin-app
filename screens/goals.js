// Goals: each goal in the engine's order. The future-items concept (design.md §9) comes later.

import { icon } from '../icons.js';
import { amtText, bigAmount, esc, tile } from '../ui.js';

const LOOK = [['check', 'food'], ['shield', 'transport'], ['plane', 'recurring']];

/** What the goal is, in one line (design.md §6 "Goal cards, plain words"). */
function whatItIs(g, ctx) {
  const { t } = ctx;
  const line = g.kind === 'zero' ? t.goalZeroLine
    : g.kind === 'months' ? t.goalMonthsLine(g.months_of_spend, amtText(g.target))
      : g.by ? t.goalByLine(amtText(g.target), ctx.month(g.by, true)) : amtText(g.target);
  return g.first ? `${line} · ${t.goalFirst}` : line;
}

function goalCard(g, i, data, ctx) {
  const { t } = ctx;
  const [ic, tone] = LOOK[i % LOOK.length];
  const order = data.editable && g.id ? `<span class="goal-order">
      <button type="button" class="drag" data-act="goal-drag" aria-label="${esc(t.goalDrag)}" title="${esc(t.goalDrag)}">⋮⋮</button>
      <button type="button" class="arrow" data-act="goal-up" data-arg="${i}" aria-label="${esc(t.goalUp)}"${i === 0 ? ' disabled' : ''}>↑</button>
      <button type="button" class="arrow" data-act="goal-down" data-arg="${i}" aria-label="${esc(t.goalDown)}"${i === data.goals.length - 1 ? ' disabled' : ''}>↓</button></span>` : '';
  const open = data.editable && g.id ? ` data-act="goal-open" data-arg="${i}" role="button" tabindex="0"` : '';
  const big = g.reached
    ? `<span class="goal-done" role="img" aria-label="${esc(t.goalDone)}">${icon('check', 26, 'stroke-width="2.2"')}</span>`
    : `<span class="goal-left">${bigAmount(g.left)}<span class="muted goal-togo">${esc(t.goalToGo)}</span></span>`;
  const ends = g.axis && g.axis.limit ? `<div class="goal-axis muted"><span>${amtText(-g.axis.limit)}</span><span>${amtText(0)}</span></div>` : '';
  const status = g.reached || g.first ? '' : g.waits_for ? t.goalWaits(ctx.goalName(g.waits_for))
    : g.monthly ? t.goalMonthly(amtText(g.monthly)) : '';
  const when = g.reached ? '' : g.expected
    ? `${ctx.month(g.expected, true)}${g.by ? ` · ${g.late ? t.goalLate(g.late_months) : t.goalOnTime}` : ''}` : '';
  const needs = g.late && g.needs_monthly ? `<span class="neg goal-needs">${esc(t.goalNeeds(amtText(g.needs_monthly)))}</span>` : '';
  return `<section class="card padded goal-card" data-index="${i}"${open}>
    <div style="display:flex;align-items:center;gap:14px">${order}${tile(tone, g.kind === 'zero' ? 'shield' : ic)}
      <div class="main" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
        <span style="font-size:17px;font-weight:500">${esc(ctx.goalName(g.name))}</span>
        <span class="muted" style="font-size:13px">${esc(whatItIs(g, ctx))}</span></div></div>
    ${big}
    <div class="bar"><div class="fill" style="width:${g.progress_pct}%"></div></div>${ends}
    <div class="goal-foot muted"><span>${esc(status)}</span><span>${esc(when)}</span></div>
    ${needs}
  </section>`;
}

export function render(data, ctx) {
  const { t } = ctx;
  const cards = data.goals.map((g, i) => goalCard(g, i, data, ctx)).join('');
  return `<div class="screen narrow-760">
    <div class="title-block"><h1 class="title">${esc(t.goalsTitle)}</h1>
      <span class="subtitle">${esc(t.goalsSub(data.goals.filter((g) => !g.reached).length))}</span></div>
    <div class="goal-list">${cards}</div>
    ${data.editable ? `<button type="button" class="btn-soft" data-act="goal-add">+ ${esc(t.goalAdd)}</button>` : ''}
  </div>`;
}

const field = (id, label, value, attrs = '') =>
  `<label class="field"><span class="flabel">${esc(label)}</span><input id="${id}" class="text-input" value="${esc(value ?? '')}" ${attrs}></label>`;

const KINDS = ['amount', 'months', 'zero'];

/** The goal sheet (design.md §6 "Goals, second version"): the type, its own fields, "goes
 * first", and the monthly amount of a goal that does not go first. */
export function goalSheet(goal, ctx, pick = {}) {
  const { t } = ctx;
  const kind = pick.kind || (goal ? goal.kind : 'amount');
  const first = pick.first ?? (goal ? goal.first : kind === 'zero');
  const chips = `<div class="field"><span class="flabel">${esc(t.gfKind)}</span><div class="cat-chips">${KINDS.map((k) =>
    `<button type="button" class="cat-chip" aria-pressed="${k === kind}" data-act="gf-kind" data-arg="${k}">${esc(t.gfKinds[k])}</button>`).join('')}</div></div>`;
  const own = kind === 'amount' ? `${field('gf-amount', t.gfAmount, goal && goal.kind === 'amount' ? goal.amount_text : '', 'inputmode="decimal" dir="ltr"')}
      ${field('gf-by', t.gfBy, goal && goal.by, 'type="month" dir="ltr"')}`
    : kind === 'months' ? `${field('gf-months', t.gfMonths, goal && goal.months_of_spend, 'inputmode="numeric" dir="ltr"')}
      ${field('gf-by', t.gfBy, goal && goal.by, 'type="month" dir="ltr"')}`
      : `<span class="muted tx-note">${esc(t.gfZero)}</span>`;
  const step = goal ? `<span class="bud-steps">
      <button type="button" class="arrow" data-act="gf-step" data-arg="-1" aria-label="${esc(t.catEdLess)}"${goal.monthly ? '' : ' disabled'}>−</button>
      <input id="gf-monthly" class="text-input gf-monthly" value="${esc(goal.monthly_text)}" inputmode="numeric" dir="ltr" aria-label="${esc(t.gfMonthly)}">
      <button type="button" class="arrow" data-act="gf-step" data-arg="1" aria-label="${esc(t.catEdMore)}">+</button></span>`
    : `<input id="gf-monthly" class="text-input" value="" inputmode="numeric" dir="ltr" aria-label="${esc(t.gfMonthly)}">`;
  const pace = goal && !goal.reached && goal.expected ? `<span class="muted tx-note">${esc(t.gfPace(ctx.month(goal.expected, true)))}</span>` : '';
  return {
    close: true,
    title: goal ? ctx.goalName(goal.name) : t.goalAdd,
    body: `<form id="goal-form" class="pack-form" style="flex-direction:column;align-items:stretch" data-kind="${kind}">
      ${field('gf-name', t.gfName, goal && goal.name, 'maxlength="80"')}
      ${chips}
      ${own}
      <label class="check-row"><input id="gf-first" type="checkbox"${first ? ' checked' : ''} data-act="gf-first"> <span>${esc(t.gfFirst)}</span></label>
      <div class="field" id="gf-monthly-box"${first ? ' hidden' : ''}><span class="flabel">${esc(t.gfMonthly)}</span>${step}</div>
      ${pace}
      <button type="submit" class="btn-primary">${esc(t.txSave)}</button></form>
      <div id="goal-results" class="results" aria-live="polite"></div>
      ${goal ? `<button type="button" class="btn-soft" data-act="goal-delete">${esc(t.txDelete)}</button>` : ''}`,
  };
}
