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
  return `<section class="card padded">
    <div style="display:flex;align-items:center;gap:14px">${tile(tone, ic)}
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
    ${cards}
  </div>`;
}
