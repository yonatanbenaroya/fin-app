// Small helpers shared by the screens: escaping, formatting and naming.
// Formatting only: amounts arrive in agorot from the engine, already computed.

import { T, nameIn } from './i18n.js';
import { icon } from './icons.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escape text for HTML. Every value that comes from data goes through this. */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const LRI = '⁦', PDI = '⁩', MINUS = '−';

/** Whole shekels with thousands separators, e.g. "₪1,234"; the sign is handled by the caller. */
export function shekels(agorot) {
  return '₪' + Math.round(Math.abs(agorot) / 100).toLocaleString('en-US');
}

/** An amount as a blurrable, left-to-right span. `sign`: 'auto' (minus when negative), 'plus' (+ when positive), 'none'. */
export function amt(agorot, { sign = 'auto', cls = '' } = {}) {
  const prefix = agorot < 0 && sign !== 'none' ? MINUS : agorot > 0 && sign === 'plus' ? '+' : '';
  return `<span class="amt num ${cls}" dir="ltr">${prefix}${shekels(agorot)}</span>`;
}

/** An amount inside a sentence: isolated so its sign stays attached in Hebrew text. */
export function amtText(agorot) {
  const prefix = agorot < 0 ? MINUS : '';
  return LRI + prefix + shekels(agorot) + PDI;
}

/** The large number pattern: a small separate shekel sign, then the digits. */
export function bigAmount(agorot, cls = '') {
  const digits = Math.round(Math.abs(agorot) / 100).toLocaleString('en-US');
  const sign = agorot < 0 ? MINUS : '';
  const long = digits.length > 5 ? ' long' : '';
  return `<span class="big amt${long} ${cls}" dir="ltr">${sign}<span class="sym">₪</span>${digits}</span>`;
}

export class Ctx {
  constructor(prefs) {
    this.prefs = prefs;
    this.lang = prefs.lang;
    this.mode = 'server';
    this.t = T[prefs.lang];
    this.en = T.en;
    this.labels = {};
    this.sources = {};
    this.groupLabels = {};
  }

  /** "Nov 2026" (short) or "November 2026" (long) from "2026-11". */
  month(ym, long = false) {
    if (!ym) return '';
    const [y, m] = ym.split('-').map(Number);
    return `${(long ? this.t.monthsLong : this.t.months)[m - 1]} ${y}`;
  }

  /** "13 Nov" / "13 בנוב׳" from "2026-11-13". */
  dayMonth(date) {
    const [, m, d] = date.split('-').map(Number);
    return this.t.dayMonth(d, this.t.months[m - 1]);
  }

  /** "Today", "Yesterday", or "Friday, 13 Nov". */
  dayLabel(date) {
    const today = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (date === iso(today)) return this.t.dToday;
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (date === iso(yesterday)) return this.t.dYday;
    const [y, m, d] = date.split('-').map(Number);
    return `${this.t.weekdays[new Date(y, m - 1, d).getDay()]}, ${this.dayMonth(date)}`;
  }

  /** A spending group's name: the user's own in this language (design.md §6), else the default. */
  bucketName(key) {
    const bucket = Object.keys(BUCKET_KEYS).find((b) => BUCKET_KEYS[b] === key);
    const own = bucket && this.groupLabels[bucket] && this.groupLabels[bucket][this.lang];
    return own || nameIn(this.t.buckets, key);
  }
  /** A group's default name in one language, before the user's own. */
  defaultBucketName(key, lang) { return nameIn(T[lang].buckets, key); }
  /** The design's key for an engine bucket name (the engine's names are Hebrew). */
  bucketKey(name) { return BUCKET_KEYS[name] || 'other'; }
  /** The user's own name for a category in this language (design.md §13 item 8), else the
   *  default: engine keys are Hebrew; English looks them up, Hebrew shows them as they are. */
  categoryName(name) {
    if (!name) return '';
    const own = this.labels[name] && this.labels[name][this.lang];
    return own || nameIn(this.t.categories, name);
  }
  /** The default name of a category in one language, before the user's own. */
  defaultCategoryName(name, lang) { return nameIn(T[lang].categories, name); }
  goalName(name) { return nameIn(this.t.goalNames, name); }
  /** A source's name: the known ones by language, a source mapped by hand by the user's name. */
  sourceName(source) { return this.sources[source] || nameIn(this.t.sources, source); }
}

/** A coloured icon tile for a budget bucket. */
export function tile(bucketKey, iconName) {
  const k = bucketKey || 'other';
  return `<div class="tile" style="background:var(--b-${k}-bg);color:var(--b-${k}-fg)">${icon(iconName)}</div>`;
}

const BUCKET_KEYS = { 'אוכל': 'food', 'פנאי': 'leisure', 'רכב ותחבורה': 'transport', 'קבועות': 'recurring', 'בלת"מ': 'unplanned', 'שכר דירה': 'rent' };
const BUCKET_ICONS = { food: 'cart', leisure: 'spark', transport: 'car', recurring: 'repeat', unplanned: 'dots', rent: 'home', other: 'dots' };
const CATEGORY_ICONS = {
  'אוכל בבית': 'cart', 'אוכל בחוץ': 'coffee', 'דלק': 'fuel', 'חניה': 'car', 'תחבורה ציבורית': 'car',
  'תחזוקת רכב': 'car', 'תחבורה': 'car', 'שטיפת רכב': 'car', 'בריאות': 'heart', 'אימונים אישיים': 'heart',
  'טיפוח': 'heart', 'תקשורת': 'phone', 'דירה': 'home', 'שכר דירה': 'home', 'בנק': 'bank', 'לימודים': 'cap',
  'בגדים': 'shirt', 'בילויים': 'spark', 'חו"ל': 'plane', 'קניות': 'bag', 'ריהוט ובית': 'home', 'מתנות': 'gift',
  'חתונה': 'gift', 'מסיבות': 'spark', 'חוויה': 'spark', 'העברות לאנשים': 'swap', 'מזומן': 'cash',
  'משכורת': 'inbox', 'הכנסה אחרת': 'inbox', 'קבלות מאנשים': 'swap', 'תמיכה משפחתית': 'gift', 'השקעות': 'trend',
  'חיוב כרטיס ללא פירוט': 'card',
};
export const bucketIcon = (key) => BUCKET_ICONS[key] || 'dots';
export const categoryIcon = (name, bucketKey) => CATEGORY_ICONS[name] || bucketIcon(bucketKey);
