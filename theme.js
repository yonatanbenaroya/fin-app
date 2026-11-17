// Design tokens (docs/design.md §2), applied as CSS variables on <html>.
// Values and formulas follow renderVals() in the prototype.

const PALS = {
  stone: { dark: false, o1: '#E0CFB9', o2: '#CDD6C5', o3: '#E9CEC1', g: '252,249,244', bg: '#EBE6DE', card: '#F6F3EE', raise: '#FFFFFF', soft: 'rgba(38,30,24,.05)', track: 'rgba(38,30,24,.07)', hair: 'rgba(38,30,24,.09)', hs: 'rgba(38,30,24,.22)', line: 'rgba(38,30,24,.08)', ink: '#1D1916', sub: '#5B5248', sh: '60,45,30', pos: '#2A664A', neg: '#9A3B35', warn: '#7C5010',
    hero: '#1F1B18', heroInk: '#F6F1EA', heroSub: '#B3AA9F', heroLine: 'rgba(246,241,234,.18)', hChipBg: 'rgba(166,201,160,.16)', hChipInk: '#BDD9B2',
    nav: '#1F1B18', navInk: '#F6F1EA', navDim: '#A89F94', navOn: 'rgba(246,241,234,.12)', navLine: 'rgba(255,255,255,.05)', sheet: '#F6F3EE', scrim: 'rgba(24,18,12,.38)' },
  bone: { dark: false, o1: '#E6D5BD', o2: '#D5DECB', o3: '#EDD2C5', g: '255,255,255', bg: '#F4F1EC', card: '#FFFFFF', raise: '#FFFFFF', soft: 'rgba(38,30,24,.045)', track: 'rgba(38,30,24,.06)', hair: 'rgba(38,30,24,.08)', hs: 'rgba(38,30,24,.2)', line: 'rgba(38,30,24,.07)', ink: '#1D1916', sub: '#645B51', sh: '60,45,30', pos: '#2E6B4E', neg: '#A2403A', warn: '#8A5A12',
    hero: '#1B1815', heroInk: '#F6F1EA', heroSub: '#B3AA9F', heroLine: 'rgba(246,241,234,.18)', hChipBg: 'rgba(166,201,160,.16)', hChipInk: '#BDD9B2',
    nav: '#1B1815', navInk: '#F6F1EA', navDim: '#A89F94', navOn: 'rgba(246,241,234,.12)', navLine: 'rgba(255,255,255,.05)', sheet: '#FFFFFF', scrim: 'rgba(24,18,12,.36)' },
  mist: { dark: false, o1: '#CDD6E1', o2: '#D4E0DC', o3: '#DFD8E1', g: '255,255,255', bg: '#E8EBEE', card: '#F5F7F8', raise: '#FFFFFF', soft: 'rgba(25,35,45,.05)', track: 'rgba(25,35,45,.07)', hair: 'rgba(25,35,45,.09)', hs: 'rgba(25,35,45,.22)', line: 'rgba(25,35,45,.08)', ink: '#171A1D', sub: '#555D66', sh: '30,45,60', pos: '#2A6A55', neg: '#A33F3F', warn: '#85561A',
    hero: '#1B2127', heroInk: '#F1F4F6', heroSub: '#A9B3BC', heroLine: 'rgba(241,244,246,.18)', hChipBg: 'rgba(150,205,185,.16)', hChipInk: '#B5D9C8',
    nav: '#1B2127', navInk: '#F1F4F6', navDim: '#A3AEB8', navOn: 'rgba(241,244,246,.12)', navLine: 'rgba(255,255,255,.05)', sheet: '#F5F7F8', scrim: 'rgba(14,20,28,.38)' },
  onyx: { dark: true, o1: '#4A3B2F', o2: '#2F4034', o3: '#47303A', g: '40,34,30', bg: '#0F0D0C', card: '#1B1816', raise: '#2C2724', soft: 'rgba(255,255,255,.06)', track: 'rgba(255,255,255,.08)', hair: 'rgba(255,255,255,.09)', hs: 'rgba(255,255,255,.22)', line: 'rgba(255,255,255,.08)', ink: '#F3EEE7', sub: '#A59D93', sh: '0,0,0', pos: '#8FC7A4', neg: '#E58F84', warn: '#DDB36E',
    hero: '#E8E0D4', heroInk: '#1A1613', heroSub: '#5E564C', heroLine: 'rgba(26,22,19,.2)', hChipBg: 'rgba(46,107,78,.16)', hChipInk: '#25573F',
    nav: '#2A2522', navInk: '#F3EEE7', navDim: '#A59D93', navOn: 'rgba(255,255,255,.1)', navLine: 'rgba(255,255,255,.08)', sheet: '#1F1B19', scrim: 'rgba(0,0,0,.58)' },
};
export const PALETTES = Object.keys(PALS);
const ACC = { ink: ['#26211D', '#E7DECF'], cocoa: ['#6A4B3C', '#C9A58F'], moss: ['#4E5B44', '#A9BC96'], slate: ['#405E79', '#9DB7D0'], oxide: ['#8B4531', '#E0A08A'] };
export const ACCENTS = Object.keys(ACC);
export const CARD_STYLES = ['glass', 'tonal', 'line'];
// Dark surfaces (design.md §2): hero card, tab bar, Done and primary buttons, avatar and the ink accent.
// Light palettes only; black is the palette's own hero and nav colour.
export const SURFACES = ['black', 'graphite', 'gray'];
const SURFACE_COLOURS = {
  graphite: { stone: '#3E3833', bone: '#3C3732', mist: '#38404A' },
  gray: { stone: '#615B54', bone: '#605A53', mist: '#5B656F' },
};
// Status colour of the Home hero card (design.md §2, C12): stops by pace ratio in thousandths.
const STATUS_RATIOS = [850, 1000, 1120, 1300, 1600];
const STATUS_STOPS = {
  black: ['#1F3328', '#27301F', '#3A2F14', '#42220F', '#481716'],
  graphite: ['#2C4A39', '#3A4A33', '#55431A', '#613317', '#6A211E'],
  gray: ['#3F6150', '#4F6048', '#7A5F26', '#8A4A26', '#92302B'],
  light: ['#CBDDCB', '#D9DEC3', '#E8D6A6', '#EDC59B', '#EDB0A6'],
};
const BUCKET_COLOURS = { food: '#6E8062', leisure: '#B0714F', transport: '#587A96', recurring: '#94793A', unplanned: '#8A847C', rent: '#8B6477', other: '#8A847C' };

export const DEFAULTS = { palette: 'stone', accent: 'ink', surface: 'gray', cards: 'glass', transparency: 49, radius: 22, numberWeight: 200, lang: 'he', hide: false };

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (h, a) => { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const mix = (a, b, k) => { const x = hexRgb(a), y = hexRgb(b); return '#' + [0, 1, 2].map((i) => Math.round(x[i] * (1 - k) + y[i] * k).toString(16).padStart(2, '0')).join(''); };
const lum = (h) => { const c = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const onColour = (h) => (lum(h) > 0.18 ? '#1A1613' : '#FFFFFF');
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** The softest mix of `ink` toward `bg` that still reads at 4.5:1 or better on `bg`. */
const derivedSub = (ink, bg) => {
  for (let k = 0.55; k > 0; k -= 0.05) { const c = mix(ink, bg, k); if (contrast(c, bg) >= 4.5) return c; }
  return ink;
};

/** The dark-surface colour for the preferences, or null on a dark palette. */
function surfaceOf(prefs) {
  const P = PALS[prefs.palette] || PALS.stone;
  if (P.dark) return null;
  if (prefs.surface === 'black' || !SURFACE_COLOURS[prefs.surface]) return null;
  return SURFACE_COLOURS[prefs.surface][prefs.palette] || SURFACE_COLOURS[prefs.surface].stone;
}

/** The hero card colour for a pace ratio (thousandths), and its secondary text colour. */
export function statusColour(ratioPermille, prefs) {
  const P = PALS[prefs.palette] || PALS.stone;
  const stops = STATUS_STOPS[P.dark ? 'light' : (SURFACE_COLOURS[prefs.surface] ? prefs.surface : 'black')];
  const r = Math.min(STATUS_RATIOS[STATUS_RATIOS.length - 1], Math.max(STATUS_RATIOS[0], ratioPermille));
  let i = 0;
  while (i < STATUS_RATIOS.length - 2 && r > STATUS_RATIOS[i + 1]) i += 1;
  const k = (r - STATUS_RATIOS[i]) / (STATUS_RATIOS[i + 1] - STATUS_RATIOS[i]);
  const bg = mix(stops[i], stops[i + 1], k);
  return { bg, sub: derivedSub(P.heroInk, bg) };
}

// System fonts until the four design fonts are bundled locally (design.md §1).
const BODY = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, 'Arial Hebrew', sans-serif";
const TITLE = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, 'Arial Hebrew', sans-serif";

export function paletteSwatch(key) {
  const p = PALS[key];
  return `linear-gradient(135deg,${p.bg} 0%,${p.bg} 50%,${p.hero} 50%,${p.hero} 100%)`;
}

export function accentColour(key, paletteKey) {
  return ACC[key][PALS[paletteKey].dark ? 1 : 0];
}

/** Apply the preferences to <html> as CSS variables and attributes. */
export function applyTheme(prefs) {
  const P = PALS[prefs.palette] || PALS.stone;
  const surface = surfaceOf(prefs);
  const solid = !!surface; // gray and graphite: a nearly opaque tab bar
  const hero = surface || P.hero;
  const nav = surface || P.nav;
  const accent = prefs.accent === 'ink' && surface ? surface : (ACC[prefs.accent] || ACC.ink)[P.dark ? 1 : 0];
  const alpha = Math.max(0.42, 0.9 - prefs.transparency * 0.006);
  const he = prefs.lang === 'he';
  const vars = {
    '--bg': P.bg, '--card': P.card, '--raise': P.raise, '--soft': P.soft, '--track': P.track,
    '--hair': P.hair, '--hs': P.hs, '--line': P.line, '--ink': P.ink, '--sub': P.sub,
    '--pos': P.pos, '--neg': P.neg, '--warn': P.warn,
    '--pos-chip': rgba(P.pos, P.dark ? 0.16 : 0.13), '--warn-chip': rgba(P.warn, P.dark ? 0.16 : 0.14), '--neg-chip': rgba(P.neg, P.dark ? 0.16 : 0.13),
    '--hero': hero, '--hero-ink': P.heroInk, '--hero-sub': surface ? derivedSub(P.heroInk, hero) : P.heroSub, '--hero-line': P.heroLine,
    '--surface': P.dark ? P.ink : hero, '--on-surface': P.dark ? P.bg : P.heroInk,
    '--hchip-bg': P.hChipBg, '--hchip-ink': P.hChipInk,
    '--nav-glass': rgba(nav, solid ? 0.93 : 0.86), '--nav-ink': P.navInk, '--nav-dim': solid ? derivedSub(P.navInk, nav) : P.navDim,
    '--nav-on': solid ? 'rgba(0,0,0,.2)' : P.navOn, '--nav-line': P.navLine,
    '--sheet-glass': rgba(P.sheet, P.dark ? 0.9 : 0.86), '--sheet': P.sheet, '--scrim': P.scrim,
    '--o1': P.o1, '--o2': P.o2, '--o3': P.o3,
    '--accent': accent, '--on-accent': onColour(accent), '--on-ink': P.dark ? P.bg : P.card,
    '--shadow': `rgba(${P.sh},.22)`,
    '--glass-bg': `rgba(${P.g},${alpha.toFixed(3)})`,
    '--glass-edge': P.dark ? 'rgba(255,255,255,.1)' : `rgba(255,255,255,${Math.min(0.92, alpha + 0.2).toFixed(3)})`,
    '--glass-inset': P.dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.8)',
    '--r1': `${prefs.radius}px`, '--r2': `${prefs.radius - 2}px`, '--rt': `${Math.round(prefs.radius * 0.5)}px`,
    '--font': BODY, '--font-d': TITLE, '--nw': String(prefs.numberWeight),
    '--ls-t': he ? '-0.01em' : '-0.025em', '--ls-l': he ? '0.01em' : '0.09em', '--up': he ? 'none' : 'uppercase',
  };
  for (const [key, c0] of Object.entries(BUCKET_COLOURS)) {
    const c = P.dark ? mix(c0, '#FFFFFF', 0.12) : c0;
    vars[`--b-${key}`] = c;
    vars[`--b-${key}-bg`] = rgba(c, P.dark ? 0.2 : 0.15);
    vars[`--b-${key}-fg`] = P.dark ? mix(c, '#FFFFFF', 0.45) : mix(c, '#1C1917', 0.5);
  }
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  root.lang = prefs.lang;
  root.dir = he ? 'rtl' : 'ltr';
  root.dataset.cards = prefs.cards;
  root.dataset.dark = P.dark ? 'true' : 'false';
  root.classList.toggle('hide-amounts', !!prefs.hide);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', P.bg);
}
