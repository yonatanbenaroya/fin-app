// Savings (design.md §5, board C14): net worth on top, then the savings by availability.
// Every number comes from the engine (views.savings); the chart's points arrive as 0..1000.

import { icon } from '../icons.js';
import { amt, amtText, bigAmount, esc, tile } from '../ui.js';

const LOOK = {
  pension: ['recurring', 'shield'], study_fund: ['transport', 'cap'], provident: ['recurring', 'shield'],
  investments: ['leisure', 'trend'], rsu: ['unplanned', 'spark'], other: ['other', 'dots'],
};
const KINDS = ['pension', 'study_fund', 'provident', 'investments', 'rsu', 'other'];
// What "available" a new saving of each kind starts with (as fin.logic.net_worth).
const DEFAULT_AVAILABLE = { pension: 'retirement', study_fund: 'date', provident: 'retirement', investments: 'anytime', other: 'anytime' };
const LTR = '⁦', PDI = '⁩';

/** Dollars as typed into the form: whole dollars with thousands separators, display only. */
function dollars(cents) {
  return `${LTR}$${Math.round(cents / 100).toLocaleString('en-US')}${PDI}`;
}

function chart(data) {
  const w = 300, h = 64, n = data.chart.length;
  const points = data.chart.map((p, i) => `${(n > 1 ? (i * w) / (n - 1) : 0).toFixed(1)},${(h - 4 - (p.y * (h - 8)) / 1000).toFixed(1)}`).join(' ');
  return `<svg class="nw-chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

function worthCard(data, ctx) {
  const { t } = ctx;
  const change = data.change === 0 ? `<span class="muted">${esc(t.nwSame)}</span>`
    : `${amt(data.change, { sign: 'plus', cls: data.change > 0 ? 'pos' : 'neg' })} <span class="muted">${esc(t.nwThisMonth)}</span>`;
  return `<section class="card nw-card" aria-label="${esc(t.nwTitle)}">
    <div class="nw-head"><span class="flabel">${esc(t.nwTitle)}</span>${bigAmount(data.total)}<div class="nw-change">${change}</div></div>
    <div class="nw-chart-box" dir="ltr">${chart(data)}
      <div class="nw-axis muted"><span>${esc(ctx.month(data.chart_from))}</span><span>${esc(ctx.month(data.chart_to))}</span></div></div>
    <div class="nw-split">
      <div class="bar"><div class="fill" style="width:${data.long_term_pct}%"></div></div>
      <div class="nw-split-rows"><span><span class="dot lt"></span>${esc(t.svGroups.long_term)} ${amt(data.long_term)}</span>
        <span><span class="dot acc"></span>${esc(t.svGroups.accessible)} ${amt(data.accessible)}</span></div>
      ${data.long_term_pct ? `<span class="muted nw-note">${esc(t.nwInsight(data.long_term_pct))}</span>` : ''}
    </div>
    <span class="muted nw-note">${esc(t.nwCarried)}</span>
  </section>`;
}

function row(r, ctx) {
  const { t } = ctx;
  if (r.from_files) {
    const negative = r.balance < 0;
    return `<div class="row" style="min-height:64px">${tile(negative ? 'rent' : 'food', negative ? 'minus' : 'bank')}
      <div class="main"><span class="name">${esc(negative ? t.od : t.bal)}</span>
        <span class="sub">${esc(t.fromFiles)} · ${esc(t.asOfDate(ctx.dayMonth(r.as_of)))}</span></div>
      <span class="value">${amt(r.balance)}</span></div>`;
  }
  const [tone, ic] = LOOK[r.kind] || LOOK.other;
  const bits = [r.as_of ? t.asOfDate(ctx.dayMonth(r.as_of)) : t.noBalance];
  if (r.kind === 'rsu') bits.unshift(`${r.usd_cents != null ? dollars(r.usd_cents) : ''}`, t.vests(ctx.month(r.vest)));
  else if (r.deposit) bits.push(`${amtText(r.deposit)}${t.perMo}`);
  return `<button type="button" class="row" style="min-height:64px" data-act="sav-open" data-arg="${esc(r.id)}">${tile(tone, ic)}
      <div class="main"><span class="name">${esc(r.name)}</span><span class="sub">${esc(bits.filter(Boolean).join(' · '))}</span></div>
      <span class="value">${r.kind === 'rsu' ? '≈ ' : ''}${amt(r.balance)}</span>${icon('chevron', 16, 'class="chev" stroke-width="1.8"')}</button>`;
}

export function render(data, ctx) {
  const { t } = ctx;
  const groups = data.groups.map((g) => `<section class="group"><h2 class="label">${esc(t.svGroups[g.key])}${g.key === 'future' ? ` · ${esc(t.notCounted)}` : ''}</h2>
      <div class="card">${g.rows.map((r) => row(r, ctx)).join('')}</div></section>`).join('');
  return `<div class="screen narrow-760">
    <div class="title-block"><h1 class="title">${esc(t.svTitle)}</h1><span class="subtitle">${esc(t.svSub)}</span></div>
    ${worthCard(data, ctx)}
    ${groups}
    ${data.editable ? `<button type="button" class="btn-soft" data-act="sav-add">+ ${esc(t.addHold)}</button>`
      : `<span class="muted tx-note">${esc(t.svNeedsAccount)}</span>`}
    <section class="card sv-remind"><span class="name">${esc(t.svRemindT(ctx.month(data.next_update, true)))}</span>
      <span class="muted">${esc(t.svRemind)}</span></section>
  </div>`;
}

const field = (id, label, value, attrs = '') =>
  `<label class="field"><span class="flabel">${esc(label)}</span><input id="${id}" class="text-input" value="${esc(value ?? '')}" ${attrs}></label>`;

/** The saving sheet: a new one (`r` null, `kind` chosen with the chips) or an existing row. */
export function holdingSheet(r, kind, today, ctx) {
  const { t } = ctx;
  const f = (r && r.fields) || {};
  const chips = r ? `<span class="muted tx-note">${esc(t.kinds2[kind])}</span>`
    : `<div class="field"><span class="flabel">${esc(t.hfType)}</span><div class="cat-chips">${KINDS.map((k) =>
      `<button type="button" class="cat-chip" aria-pressed="${k === kind}" data-act="sav-kind" data-arg="${k}">${esc(t.kinds2[k])}</button>`).join('')}</div></div>`;
  const asOf = field('hf-asof', t.hfAsOf, (r && r.as_of) || today, 'type="date" dir="ltr"');
  let money;
  if (kind === 'rsu') {
    money = `${field('hf-amount', t.hfBalUsd, f.amount_text, 'inputmode="decimal" dir="ltr"')}
      ${field('hf-rate', t.hfRate, f.rate_text, 'inputmode="decimal" dir="ltr"')}
      ${r ? `<span class="muted tx-note">≈ ${amtText(r.balance)}</span>` : ''}
      ${asOf}
      ${field('hf-vest', t.hfVest, r && r.vest, 'type="month" dir="ltr"')}`;
  } else {
    const available = (r && r.available) || DEFAULT_AVAILABLE[kind];
    money = `${field('hf-amount', t.hfBal, f.amount_text, 'inputmode="decimal" dir="ltr"')}
      ${asOf}
      ${field('hf-deposit', t.hfDep, f.deposit_text, 'inputmode="decimal" dir="ltr"')}
      <div class="field"><span class="flabel">${esc(t.hfAvail)}</span><div class="seg small" data-seg="avail">${['anytime', 'date', 'retirement'].map((a) =>
        `<button type="button" aria-pressed="${a === available}" data-act="sav-avail" data-arg="${a}">${esc(t.avail[a])}</button>`).join('')}</div></div>
      <div id="hf-from-box"${available === 'date' ? '' : ' hidden'}>${field('hf-from', t.hfDate, r && r.available_from, 'type="month" dir="ltr"')}</div>`;
  }
  return {
    close: true,
    title: r ? r.name : t.hfNew,
    body: `<form id="sav-form" class="pack-form sav-form" style="flex-direction:column;align-items:stretch" data-kind="${esc(kind)}">
      ${chips}
      ${field('hf-name', t.hfName, r && r.name, `maxlength="40" placeholder="${esc(t.hfNamePh)}"`)}
      ${money}
      <span class="muted" style="font-size:13px">${esc(t.hfNote)}</span>
      <button type="submit" class="btn-primary">${esc(t.txSave)}</button></form>
      <div id="sav-results" class="results" aria-live="polite"></div>
      ${r ? `<button type="button" class="btn-soft" data-act="sav-delete">${esc(t.hfDelete)}</button>` : ''}`,
  };
}

/** The edit request from the sheet: details always, and a balance only when it is new or
 *  changed (so saving a rename does not stamp an old balance with a new date). */
export function holdingRequest(r, kind, root) {
  const value = (id) => (root.querySelector(`#${id}`)?.value || '').trim();
  const fields = { kind, name: value('hf-name') };
  if (kind === 'rsu') fields.vest = value('hf-vest');
  else {
    fields.available = root.querySelector('[data-seg="avail"] [aria-pressed="true"]')?.dataset.arg;
    fields.available_from = fields.available === 'date' ? value('hf-from') : null;
    fields.deposit_text = value('hf-deposit');
  }
  const request = { kind: 'holding_save', ...(r ? { id: r.id } : {}), fields };
  const f = (r && r.fields) || {};
  const changed = !r || value('hf-amount') !== (f.amount_text || '') || value('hf-asof') !== (r.as_of || '')
    || (kind === 'rsu' && value('hf-rate') !== (f.rate_text || ''));
  if (value('hf-amount') && changed) {
    Object.assign(request, { amount_text: value('hf-amount'), as_of: value('hf-asof') });
    if (kind === 'rsu') request.rate_text = value('hf-rate');
  }
  return request;
}
