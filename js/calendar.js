// The season calendar: Monday–Sunday challenge weeks tied to real dates.
// Hand-written weeks (Thanksgiving, Christmas season) come first; after that a new
// evergreen week is generated every Monday, forever.

import { THANKSGIVING_WEEK, PALETTES } from './missions.js';
import { DECEMBER_WEEKS } from './weeks-december.js';
import { generateWeekDef } from './evergreen.js';

export const SEASON_START = THANKSGIVING_WEEK.id; // Monday, Nov 23, 2026
const AUTHORED = new Map([THANKSGIVING_WEEK, ...DECEMBER_WEEKS].map((w) => [w.id, w]));
const DAY_MS = 86400000;

/* ---------- dates (local time, YYYY-MM-DD strings) ---------- */

export const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const toISO = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
export const addDays = (iso, n) => { const dt = parseISO(iso); dt.setDate(dt.getDate() + n); return toISO(dt); };
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY_MS);
export const mondayOf = (iso) => { const dt = parseISO(iso); const dow = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - dow); return toISO(dt); };
export const fmt = (iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) => parseISO(iso).toLocaleDateString(undefined, opts);
export const weekdayName = (iso) => fmt(iso, { weekday: 'long' });

/* ---------- weeks ---------- */

let snapshots = {};
let onSnapshot = () => {};
const cache = new Map();

/** Generated weeks are frozen into saved data the first time they're opened. */
export function useSnapshotStore(store, onChange) {
  snapshots = store;
  onSnapshot = onChange;
  for (const id of [...cache.keys()]) if (!AUTHORED.has(id)) cache.delete(id);
}

export const weekIndex = (weekId) => Math.round(daysBetween(SEASON_START, weekId) / 7);

function buildWeek(def) {
  const missionsById = new Map();
  const days = def.days.map((d, i) => {
    const day = i + 1;
    const pal = PALETTES[d.palette] || PALETTES.lime;
    const missions = [];
    ['morning', 'afternoon', 'evening'].forEach((section, s) => {
      d[section].forEach((text, j) => {
        const num = s * 10 + j + 1;
        const n2 = String(num).padStart(2, '0');
        missions.push({ id: `${def.id}/d${day}-m${n2}`, weekId: def.id, day, num, label: n2, text, section, points: 10 });
      });
    });
    d.bonus.forEach((text, j) => {
      missions.push({ id: `${def.id}/d${day}-b${j + 1}`, weekId: def.id, day, num: 31 + j, label: `B${j + 1}`, text, section: 'bonus', points: 20 });
    });
    missions.forEach((m) => missionsById.set(m.id, m));
    return { day, date: addDays(def.id, i), title: d.title, tagline: d.tagline, ...pal, missions };
  });
  return {
    id: def.id,
    start: def.id,
    end: addDays(def.id, 6),
    index: weekIndex(def.id),
    name: def.name,
    emoji: def.emoji,
    blurb: def.blurb,
    golden: def.golden,
    holidays: def.holidays || [],
    generated: !!def.generated,
    days,
    missionsById,
  };
}

/** Get a week by its Monday date. `peek` reads a generated week without freezing it. */
export function getWeek(weekId, { peek = false } = {}) {
  if (cache.has(weekId)) return cache.get(weekId);
  let def = AUTHORED.get(weekId) || snapshots[weekId];
  if (!def) {
    def = generateWeekDef(weekId, weekIndex(weekId));
    if (peek) return buildWeek(def);
    snapshots[weekId] = def;
    onSnapshot();
  }
  const w = buildWeek(def);
  cache.set(weekId, w);
  return w;
}

export const weekIdFor = (iso) => (iso < SEASON_START ? SEASON_START : mondayOf(iso));

/** Every week that has started by `todayIso` (newest last). */
export function unlockedWeekIds(todayIso) {
  const last = weekIdFor(todayIso);
  const ids = [];
  for (let id = SEASON_START; id <= last; id = addDays(id, 7)) ids.push(id);
  return ids;
}

export function missionById(id) {
  const weekId = id.split('/')[0];
  return getWeek(weekId).missionsById.get(id);
}

/** Holidays on the calendar between two dates (inclusive), from the hand-written weeks. */
export function holidaysBetween(fromIso, toIso) {
  return [...AUTHORED.values()]
    .flatMap((w) => w.holidays || [])
    .filter((h) => h.date >= fromIso && h.date <= toIso)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const isAuthored = (weekId) => AUTHORED.has(weekId);
export const CHRISTMAS = '2026-12-25';
