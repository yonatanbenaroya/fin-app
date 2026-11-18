// Goals: each goal in the engine's order. The future-items concept (design.md §9) comes later.

import { amtText, esc, tile } from '../ui.js';

const LOOK = [['check', 'food'], ['shield', 'transport'], ['plane', 'recurring']];

function goalCard(g, i, data, ctx) {
  const { t } = ctx;
  const [ic, tone] = LOOK[i % LOOK.length];
  const sub = g.threshold > 0 ? t.goalBalance(amtText(g.threshold)) : '';
  const until = g.dated ? g.target_month : data.last_month;
  const eta = g.already ? t.goalDone : g.reached ? t.by(ctx.month(g.reached)) : t.notInRange(ctx.month(until));
  const need = g.already ? '' : g.required_monthly > 0 ? t.perMonthMore(amtText(g.required_monthly)) : t.onPlan;
  const order = data.editable && g.id ? `<span class="goal-order">
      <button type="button" class="drag" data-act="goal-drag" aria-label="${esc(t.goalDrag)}" title="${esc(t.goalDrag)}">⋮⋮</button>
      <button type="button" class="arrow" data-act="goal-up" data-arg="${i}" aria-label="${esc(t.goalUp)}"${i === 0 ? ' disabled' : ''}>↑</button>
      <button type="button" class="arrow" data-act="goal-down" data-arg="${i}" aria-label="${esc(t.goalDown)}"${i === data.goals.length - 1 ? ' disabled' : ''}>↓</button></span>` : '';
  const open = data.editable && g.id ? ` data-act="goal-open" data-arg="${i}" role="button" tabindex="0"` : '';
  return `<section class="card padded goal-card" data-index="${i}"${open}>
    <div style="display:flex;align-items:center;gap:14px">${order}${tile(tone, ic)}
      <div class="main" style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
        <span style="font-size:17px;font-weight:500">${esc(ctx.goalName(g.name))}</span>
        <span class="muted amt" style="font-size:13px">${esc(sub)}</span></div>
      <span class="num" dir="ltr" style="font-size:30px;line-height:34px;font-weight:var(--nw);letter-spacing:-0.03em">${g.progress_pct}%</span></div>
    <div class="bar"><div class="fill" style="width:${g.progress_pct}%"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:13px" class="muted">
      <span class="amt">${esc(need)}</span>
      <span>${esc(eta)}</span></div>
  </section>`;
}

export function render(data, ctx) {
  const { t } = ctx;
  const cards = data.goals.map((g, i) => goalCard(g, i, data, ctx)).join('');
  return `<div class="screen narrow-760">
    <div class="title-block"><h1 class="title">${esc(t.goalsTitle)}</h1>
      <span class="subtitle">${esc(t.goalsSub(data.goals.filter((g) => !g.already).length))}</span></div>
    <div class="goal-list">${cards}</div>
    ${data.editable ? `<button type="button" class="btn-soft" data-act="goal-add">+ ${esc(t.goalAdd)}</button>` : ''}
  </div>`;
}

const field = (id, label, value, attrs = '') =>
  `<label class="field"><span class="flabel">${esc(label)}</span><input id="${id}" class="text-input" value="${esc(value ?? '')}" ${attrs}></label>`;

/** The goal sheet (design.md §6 "Goals editing"): name, target amount, optional month. A goal
 * of months of spending keeps its months; "back to zero" has no amount. */
export function goalSheet(goal, ctx) {
  const { t } = ctx;
  const kind = goal ? goal.kind : 'amount';
  const amountField = kind === 'amount' ? `${field('gf-amount', t.gfAmount, goal && goal.amount_text, 'inputmode="decimal" dir="ltr"')}
      ${field('gf-minimum', t.gfMinimum, goal && goal.minimum_text, 'inputmode="decimal" dir="ltr"')}`
    : kind === 'months' ? field('gf-months', t.gfMonths, goal.months_of_spend, 'inputmode="numeric" dir="ltr"')
      : `<span class="muted tx-note">${esc(t.gfZero)}</span>`;
  return {
    title: goal ? ctx.goalName(goal.name) : t.goalAdd,
    body: `<form id="goal-form" class="pack-form" style="flex-direction:column;align-items:stretch">
      ${field('gf-name', t.gfName, goal && goal.name, 'maxlength="80"')}
      ${amountField}
      ${field('gf-by', t.gfBy, goal && goal.by, 'type="month" dir="ltr"')}
      <button type="submit" class="btn-primary">${esc(t.txSave)}</button></form>
      <div id="goal-results" class="results" aria-live="polite"></div>
      ${goal ? `<button type="button" class="btn-soft" data-act="goal-delete">${esc(t.txDelete)}</button>` : ''}`,
  };
}
