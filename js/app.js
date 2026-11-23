import { SECTIONS, AWARDS, RULES, DAY_MAX, WEEK_MAX, specialsFor as weekSpecials } from './missions.js';
import * as cal from './calendar.js';
import * as store from './store.js';
import { processImage, PhotoError, blobToDataUrl, dataUrlToBlob } from './photos.js';
import { confetti, bigCelebration, pointsPop, countUp } from './fx.js';

/* ---------- helpers ---------- */

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const EMOJIS = ['🦊', '🐼', '🦄', '🐸', '🐯', '🐙', '🦖', '🐝', '🦋', '🐬', '🦁', '🐨', '🐧', '🐢', '🦉', '🐶', '🐱', '🚀', '⚡', '🌈', '🍕', '🎸', '⚽', '🎨'];
const PLAYER_COLORS = [
  'oklch(0.7 0.2 18)', 'oklch(0.76 0.17 55)', 'oklch(0.84 0.16 92)', 'oklch(0.74 0.19 140)',
  'oklch(0.74 0.13 200)', 'oklch(0.66 0.16 255)', 'oklch(0.66 0.18 300)', 'oklch(0.74 0.15 345)',
];

const defaultState = () => ({
  version: 2,
  players: [],
  currentPlayerId: null,
  progress: {}, // playerId -> missionId -> { done, photoId?, at }
  specials: {}, // playerId -> weekId -> day -> { golden, mystery, choice, kindness }
  awards: {}, // weekId -> awardKey -> playerId
  snapshots: {}, // generated weeks, frozen once opened
});

/** Upgrade saved data from the first version (one fixed Thanksgiving week). */
function migrate(s) {
  if (!s) return s;
  if ((s.version || 1) < 2) {
    const W = cal.SEASON_START;
    const progress = {};
    for (const [pid, ms] of Object.entries(s.progress || {})) {
      progress[pid] = {};
      for (const [k, v] of Object.entries(ms)) progress[pid][k.includes('/') ? k : `${W}/${k}`] = v;
    }
    const specials = {};
    for (const [pid, days] of Object.entries(s.specials || {})) {
      specials[pid] = { [W]: {} };
      for (const [day, sp] of Object.entries(days)) {
        const { turkey, sunClub, ...rest } = sp || {};
        specials[pid][W][day] = { ...rest, ...(turkey ? { golden: true } : {}) };
      }
    }
    const awards = s.awards && Object.keys(s.awards).length ? { [W]: { ...s.awards } } : {};
    s = { ...s, version: 2, progress, specials, awards };
    delete s.settings;
  }
  s.snapshots ||= {};
  return s;
}

let state = defaultState();
const ui = {
  editing: null,
  grownup: false,
  gate: null,
  gwWeek: null,
  gwDay: null,
  timeTravel: null, // grown-up "pretend today is" date, never saved
  tray: null,
  pendingMission: null,
  lastToggled: null,
  shownScores: {},
};
const thumbUrls = new Map();

/* ---------- dates & weeks ---------- */

const todayISO = () => ui.timeTravel || cal.toISO(new Date());
const currentWeekId = () => cal.weekIdFor(todayISO());
const currentWeek = () => cal.getWeek(currentWeekId());
const todayDayIndex = () => {
  const t = todayISO();
  return t < cal.SEASON_START ? 1 : Math.min(7, cal.daysBetween(currentWeekId(), t) + 1);
};
const isOpen = (iso) => iso <= todayISO();
const canView = (iso) => isOpen(iso) || ui.grownup;
const weekVisible = (id) => id <= currentWeekId() || ui.grownup;
const validWeekId = (id) => /^\d{4}-\d{2}-\d{2}$/.test(id || '') && id >= cal.SEASON_START && cal.mondayOf(id) === id;
const dayHref = (weekId, day) => `#/w/${weekId}/${day}`;
const dateHref = (iso) => { const w = cal.mondayOf(iso); return dayHref(w, cal.daysBetween(w, iso) + 1); };
const weekRange = (w) => `${cal.fmt(w.start, { month: 'short', day: 'numeric' })} – ${cal.fmt(w.end, { month: 'short', day: 'numeric' })}`;
const relDay = (iso) => {
  const n = cal.daysBetween(todayISO(), iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n > 1 && n < 7) return cal.weekdayName(iso);
  return cal.fmt(iso);
};
function christmasCountdown() {
  const t = todayISO();
  const xmas = `${t.slice(0, 4)}-12-25`;
  const n = cal.daysBetween(t, xmas);
  if (n === 0) return '🎄 Merry Christmas!';
  if (n > 0 && n <= 31) return `🎄 ${plural(n, 'sleep')} until Christmas`;
  return '';
}

/* ---------- state + scoring ---------- */

const playerById = (id) => (id ? state.players.find((p) => p.id === id) : undefined);
const player = () => playerById(state.currentPlayerId);
const progressFor = (pid) => (state.progress[pid] ||= {});
const rec = (pid, mid) => state.progress[pid]?.[mid];
const specialsRec = (pid, weekId, day) => (((state.specials[pid] ||= {})[weekId] ||= {})[day] ||= {});

const dayScore = (pid, week, day) => week.days[day - 1].missions.reduce((s, m) => s + (rec(pid, m.id)?.done ? m.points : 0), 0);
const dayDone = (pid, week, day) => week.days[day - 1].missions.filter((m) => rec(pid, m.id)?.done).length;
const dayPhotos = (pid, week, day) => week.days[day - 1].missions.filter((m) => rec(pid, m.id)?.photoId).length;
const sunClub = (pid, week, day) => !!(rec(pid, `${week.id}/d${day}-m01`)?.done && rec(pid, `${week.id}/d${day}-m21`)?.done);
function specialScore(pid, week, day) {
  const s = state.specials[pid]?.[week.id]?.[day] || {};
  return (s.golden ? 30 : 0) + (s.mystery ? 25 : 0) + (Number(s.choice) || 0) + (s.kindness ? 20 : 0) + (sunClub(pid, week, day) ? 20 : 0);
}
const weekScore = (pid, week) => week.days.reduce((t, d) => t + dayScore(pid, week, d.day) + specialScore(pid, week, d.day), 0);
const seasonScore = (pid) => cal.unlockedWeekIds(todayISO()).reduce((t, id) => t + weekScore(pid, cal.getWeek(id)), 0);

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.saveState(state).catch((e) => toast(`Couldn't save: ${e.message}`, true)), 80);
}
function commit() { save(); render(); }
function adoptState(next) {
  state = next;
  cal.useSnapshotStore(state.snapshots, save);
}

/* ---------- toast ---------- */

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), isError ? 5000 : 2600);
}

/* ---------- router ---------- */

const route = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

/** The week/day the current route points at, if it is a day page. */
function routeDay() {
  const [v, a, b, c] = route();
  if (v === 'day') return { week: currentWeek(), day: Math.min(7, Math.max(1, Number(a) || 1)), photos: b === 'photos' };
  if (v === 'w' && validWeekId(a) && weekVisible(a) && b) {
    return { week: cal.getWeek(a), day: Math.min(7, Math.max(1, Number(b) || 1)), photos: c === 'photos' };
  }
  return null;
}

function render() {
  const [view, a] = route();
  const main = $('#main');
  const ctx = routeDay();
  let html;
  let navKey = view || 'home';
  if (!state.players.length && !['grownups', 'rules'].includes(view)) {
    html = viewWelcome();
  } else if (ctx) {
    const date = ctx.week.days[ctx.day - 1].date;
    html = !canView(date) ? viewLocked(ctx.week, ctx.day) : ctx.photos ? viewAlbum(ctx.week, ctx.day) : viewDay(ctx.week, ctx.day);
    navKey = date === todayISO() ? 'today' : 'calendar';
  } else {
    switch (view) {
      case 'w': html = validWeekId(a) && weekVisible(a) ? viewWeek(cal.getWeek(a)) : viewHome(); navKey = 'calendar'; break;
      case 'scoreboard': html = viewScoreboard(validWeekId(a) && weekVisible(a) ? a : currentWeekId()); break;
      case 'calendar': html = viewCalendar(); break;
      case 'players': html = viewPlayers(); break;
      case 'grownups': html = viewGrownups(); break;
      case 'rules': html = viewRules(); break;
      default: html = viewHome(); navKey = 'home';
    }
  }
  const themeDay = ctx ? ctx.week.days[ctx.day - 1] : currentWeek().days[todayDayIndex() - 1];
  document.documentElement.style.setProperty('--day', themeDay.color);
  document.documentElement.style.setProperty('--day-deep', themeDay.deep);
  document.documentElement.style.setProperty('--day-soft', themeDay.soft);
  document.body.dataset.view = navKey;

  main.innerHTML = (ui.timeTravel ? `<div class="time-banner">🕰️ Time machine: pretending today is <b>${esc(cal.fmt(ui.timeTravel))}</b> <button class="btn small ghost" data-action="time-reset">Back to today</button></div>` : '') + html;
  renderPlayerBar();
  renderNav(navKey);
  renderTray(ctx && !ctx.photos && canView(ctx.week.days[ctx.day - 1].date) ? ctx : null);
  hydrateThumbs(main);
  afterRender(ctx);
}

function afterRender(ctx) {
  if (ctx && !ctx.photos) {
    const el = $('[data-score]');
    if (el) {
      const key = `${state.currentPlayerId}-${ctx.week.id}-${ctx.day}`;
      const to = Number(el.dataset.score || 0);
      countUp(el, ui.shownScores[key] ?? to, to);
      ui.shownScores[key] = to;
    }
  }
  if (route()[0] === 'grownups' && ui.grownup) fillUsage();
  if (ui.lastToggled) {
    $(`[data-row="${CSS.escape(ui.lastToggled)}"]`)?.classList.add('just-checked');
    ui.lastToggled = null;
  }
}

/* ---------- shared bits ---------- */

const avatar = (p, size = '') => `<span class="avatar ${size}" style="--pc:${p.color}" aria-hidden="true">${esc(p.emoji)}</span>`;

function ring(score, max, label) {
  const pct = Math.round((score / max) * 100);
  return `<span class="ring" style="--pct:${pct}" role="img" aria-label="${esc(label)}"><span>${pct}%</span></span>`;
}

function renderPlayerBar() {
  const bar = $('#player-bar');
  if (!state.players.length) { bar.innerHTML = ''; return; }
  bar.innerHTML = `
    <div class="chips" role="group" aria-label="Who is playing?">
      ${state.players.map((p) => `
        <button class="chip ${p.id === state.currentPlayerId ? 'on' : ''}" data-action="select-player" data-id="${p.id}"
          style="--pc:${p.color}" aria-pressed="${p.id === state.currentPlayerId}">
          ${avatar(p, 'sm')}<span class="chip-name">${esc(p.name)}</span>
        </button>`).join('')}
      <a class="chip add" href="#/players" aria-label="Players">＋</a>
    </div>`;
}

function renderNav(active) {
  const items = [
    ['home', '#/', '🏠', 'Home'],
    ['today', dayHref(currentWeekId(), todayDayIndex()), '📸', 'Today'],
    ['scoreboard', '#/scoreboard', '🏆', 'Scores'],
    ['calendar', '#/calendar', '📅', 'Calendar'],
    ['grownups', '#/grownups', '🔑', 'Grown-ups'],
  ];
  $('#nav').innerHTML = items.map(([key, href, icon, label]) => `
    <a href="${href}" class="${active === key ? 'on' : ''}" ${active === key ? 'aria-current="page"' : ''}>
      <span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>
    </a>`).join('');
}

async function hydrateThumbs(root) {
  for (const img of $$('img[data-photo]', root)) {
    if (img.getAttribute('src')) continue;
    const id = img.dataset.photo;
    let url = thumbUrls.get(id);
    if (!url) {
      const ph = await store.getPhoto(id);
      if (!ph) continue;
      url = URL.createObjectURL(ph.thumb);
      thumbUrls.set(id, url);
    }
    img.src = url;
  }
}
const thumbImg = (id, alt) => `<img data-photo="${id}" ${thumbUrls.has(id) ? `src="${thumbUrls.get(id)}"` : ''} alt="${esc(alt)}" loading="lazy">`;

function dayTiles(week, p) {
  const t = todayISO();
  return `<div class="days">
    ${week.days.map((d) => {
      const status = d.date === t ? 'today' : d.date < t ? 'past' : 'future';
      const style = `--c:${d.color};--cd:${d.deep};--cs:${d.soft}`;
      if (status === 'future' && !ui.grownup) {
        return `<a class="day-tile locked" href="${dayHref(week.id, d.day)}" style="${style}">
          <span class="day-num">${esc(cal.fmt(d.date, { weekday: 'short' }))}</span>
          <span class="lock" aria-hidden="true">🔒</span>
          <span class="day-title">Mystery day</span>
          <span class="day-date">Unlocks ${esc(relDay(d.date))}</span>
        </a>`;
      }
      const s = dayScore(p.id, week, d.day);
      const sp = specialScore(p.id, week, d.day);
      return `<a class="day-tile ${status}" href="${dayHref(week.id, d.day)}" style="${style}">
        ${status === 'today' ? '<span class="tag">Today</span>' : ''}
        <span class="day-num">${esc(cal.fmt(d.date, { weekday: 'short' }))}</span>
        <span class="day-title">${esc(d.title)}</span>
        <span class="day-date">${esc(cal.fmt(d.date, { month: 'short', day: 'numeric' }))}</span>
        <span class="day-foot">${ring(s, DAY_MAX, `${s} of 400 points`)}
          <span><b>${s}</b>/400${sp ? `<br><span class="star-pts">+${sp} ⭐</span>` : ''}</span></span>
      </a>`;
    }).join('')}
  </div>`;
}

function holidayRibbon(fromIso, toIso) {
  const hs = cal.holidaysBetween(fromIso, toIso);
  const cd = christmasCountdown();
  if (!hs.length && !cd) return '';
  return `<div class="ribbon" aria-label="Coming up">
    ${cd ? `<span class="rib countdown">${cd}</span>` : ''}
    ${hs.map((h) => `<span class="rib ${h.date === todayISO() ? 'now' : ''}">${h.emoji} <b>${esc(relDay(h.date))}</b> ${esc(h.label)}</span>`).join('')}
  </div>`;
}

function leaderboard(week) {
  const ranked = [...state.players].sort((a, b) => weekScore(b.id, week) - weekScore(a.id, week));
  const top = weekScore(ranked[0].id, week);
  return `<ol class="leaders">
    ${ranked.map((pl, i) => {
      const t = weekScore(pl.id, week);
      return `<li style="--pc:${pl.color}">
        <span class="rank">${t > 0 && t === top ? '👑' : i + 1}</span>
        ${avatar(pl, 'sm')}<span class="leader-name">${esc(pl.name)}</span>
        <span class="leader-bar"><span style="width:${top ? (t / top) * 100 : 0}%"></span></span>
        <b>${t.toLocaleString()}</b>
      </li>`;
    }).join('')}
  </ol>`;
}

/* ---------- views ---------- */

function viewWelcome() {
  const w = currentWeek();
  return `
  <section class="welcome">
    <div class="welcome-hero">
      <p class="eyebrow">${w.emoji} ${esc(w.name)} · new challenge every week</p>
      <h1 class="display">Photo<br>Scavenger<br>Hunt!</h1>
      <p class="lead">Grab your camera. Every day brings 30 photo missions and 5 bonus missions, and every Monday a brand-new challenge week unlocks. Snap, check off and race up the scoreboard!</p>
    </div>
    <div class="panel sticker">
      <h2>Who's playing?</h2>
      <p class="muted">Add each hunter. You can add more later.</p>
      ${playerForm(null)}
    </div>
  </section>`;
}

function viewHome() {
  const p = player();
  const w = currentWeek();
  const t = todayISO();
  const di = todayDayIndex();
  const d = w.days[di - 1];
  const before = t < cal.SEASON_START;
  const next = cal.getWeek(cal.addDays(w.id, 7), { peek: true });
  const daysToNext = cal.daysBetween(t, next.start);

  return `
  <section class="hero" style="--hero:${d.color}">
    <div class="hero-copy">
      <p class="eyebrow">${w.emoji} ${esc(w.name)} · ${before ? `starts ${esc(cal.fmt(w.start))}` : `Day ${di} of 7 · ${esc(cal.fmt(t))}`}</p>
      <h1 class="display">${esc(d.title)}</h1>
      <p class="lead">${esc(d.tagline)}</p>
      <a class="btn big" href="${dayHref(w.id, di)}">${before ? 'Peek at Day 1 →' : `Start today's hunt, ${esc(p.name)} →`}</a>
    </div>
    <div class="hero-me">
      ${avatar(p, 'xl')}
      <div><span class="hero-total">${seasonScore(p.id).toLocaleString()}</span><span class="muted"> season pts</span></div>
    </div>
  </section>

  ${holidayRibbon(t, cal.addDays(t, 13))}

  ${state.players.length > 1 ? `
  <section class="block">
    <div class="block-head"><h2>This week's leaderboard</h2><a href="#/scoreboard" class="link">Full scoreboard →</a></div>
    ${leaderboard(w)}
  </section>` : ''}

  <section class="block">
    <div class="block-head"><h2>${esc(p.name)}'s week</h2><span class="muted">${esc(weekRange(w))} · ${weekScore(p.id, w).toLocaleString()} / ${WEEK_MAX.toLocaleString()}+</span></div>
    <p class="muted week-blurb">${esc(w.blurb)}</p>
    ${dayTiles(w, p)}
  </section>

  <a class="teaser sticker" href="#/calendar">
    <span class="teaser-gift" aria-hidden="true">🎁</span>
    <span><b>A brand-new challenge unlocks ${daysToNext <= 1 ? 'tomorrow' : esc(cal.weekdayName(next.start))}, ${esc(cal.fmt(next.start, { month: 'short', day: 'numeric' }))}</b>
    <span class="muted">${daysToNext <= 1 ? 'Get ready!' : `${plural(daysToNext, 'day')} to go. It's a secret until then!`}</span></span>
  </a>

  <p class="home-links"><a href="#/calendar" class="link">📖 Memory book &amp; calendar</a><a href="#/rules" class="link">📜 Rules &amp; specials</a><a href="#/players" class="link">🧒 Players</a></p>`;
}

function viewWeek(w) {
  const p = player();
  const current = w.id === currentWeekId();
  return `
  <section class="page-head">
    <div class="day-nav"><a href="#/calendar" class="pill">← Calendar</a><span class="when">${esc(weekRange(w))}</span><a href="#/scoreboard/${w.id}" class="pill">Scores →</a></div>
    <p class="eyebrow">${current ? 'This week' : 'Memory book'} · Week ${w.index + 1}</p>
    <h1 class="display">${w.emoji} ${esc(w.name)}</h1>
    <p class="lead">${esc(w.blurb)}</p>
  </section>
  ${state.players.length > 1 ? `<section class="block"><h2>Leaderboard</h2>${leaderboard(w)}</section>` : ''}
  <section class="block">
    <div class="block-head"><h2>${esc(p.name)}'s days</h2><span class="muted">${weekScore(p.id, w).toLocaleString()} pts</span></div>
    ${dayTiles(w, p)}
  </section>`;
}

function viewLocked(w, day) {
  const d = w.days[day - 1];
  const n = cal.daysBetween(todayISO(), d.date);
  return `
  <section class="locked-page sticker" style="--c:${d.color}">
    <p class="big-emoji" aria-hidden="true">🔒</p>
    <h1 class="display">Not yet!</h1>
    <p class="lead">This day unlocks on <b>${esc(cal.fmt(d.date, { weekday: 'long', month: 'long', day: 'numeric' }))}</b>. ${n === 1 ? "That's tomorrow!" : `Only ${plural(n, 'more sleep')}!`}</p>
    <a class="btn" href="#/">Back to today</a>
  </section>`;
}

function missionRow(m, pid) {
  const r = rec(pid, m.id);
  const done = !!r?.done;
  const photo = r?.photoId;
  return `
  <li class="mission ${done ? 'done' : ''}" data-row="${m.id}">
    <button class="check" data-action="toggle" data-mission="${m.id}" aria-pressed="${done}"
      aria-label="${done ? 'Uncheck' : 'Check off'}: ${esc(m.text)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
    </button>
    <button class="mission-text" data-action="toggle" data-mission="${m.id}" tabindex="-1" aria-hidden="true">
      <span class="num">${m.label}</span>${esc(m.text)}
    </button>
    <span class="pts ${m.points === 20 ? 'bonus' : ''}">${m.points}</span>
    ${photo
      ? `<button class="slot has" data-action="open-photo" data-mission="${m.id}" aria-label="View photo for ${esc(m.text)}">${thumbImg(photo, m.text)}</button>`
      : `<button class="slot" data-action="pick-photo" data-mission="${m.id}" aria-label="Add photo for ${esc(m.text)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>
        </button>`}
  </li>`;
}

function adjacentLinks(w, day) {
  const d = w.days[day - 1];
  const prevIso = cal.addDays(d.date, -1);
  const nextIso = cal.addDays(d.date, 1);
  const prev = prevIso >= cal.SEASON_START ? `<a href="${dateHref(prevIso)}" class="pill" aria-label="Previous day">← ${esc(cal.fmt(prevIso, { weekday: 'short' }))}</a>` : '<span></span>';
  const next = canView(nextIso)
    ? `<a href="${dateHref(nextIso)}" class="pill" aria-label="Next day">${esc(cal.fmt(nextIso, { weekday: 'short' }))} →</a>`
    : `<span class="pill muted" aria-label="Next day is locked">${esc(cal.fmt(nextIso, { weekday: 'short' }))} 🔒</span>`;
  return `<div class="day-nav">${prev}<span class="when">${esc(relDay(d.date) === 'Today' ? 'Today' : cal.fmt(d.date, { weekday: 'long' }))} · ${esc(cal.fmt(d.date, { month: 'short', day: 'numeric' }))}</span>${next}</div>`;
}

function viewDay(w, day) {
  const p = player();
  const d = w.days[day - 1];
  const s = dayScore(p.id, w, day);
  const sp = specialScore(p.id, w, day);
  const done = dayDone(p.id, w, day);
  const photos = dayPhotos(p.id, w, day);
  const hol = w.holidays.filter((h) => h.date === d.date);

  return `
  ${!isOpen(d.date) ? '<div class="time-banner">👀 Grown-up preview — kids can\'t open this day yet.</div>' : ''}
  <section class="day-head">
    ${adjacentLinks(w, day)}
    <p class="eyebrow"><a href="#/w/${w.id}">${w.emoji} ${esc(w.name)}</a> · Day ${day} of 7</p>
    <h1 class="display">${esc(d.title)}</h1>
    <p class="lead">${esc(d.tagline)}</p>
    ${hol.length ? `<div class="ribbon">${hol.map((h) => `<span class="rib now">${h.emoji} ${esc(h.label)}</span>`).join('')}</div>` : ''}
    <div class="scorebox">
      <div class="score-main">${avatar(p, 'lg')}
        <div><span class="score-num" data-score="${s}">${s}</span><span class="score-max">/ 400</span>
        <div class="score-sub">${esc(p.name)} · ${done} of 35 missions${sp ? ` · <b>+${sp} ⭐ specials</b>` : ''}</div></div>
      </div>
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="400" aria-valuenow="${s}"><span style="width:${s / 4}%"></span></div>
      <div class="day-actions">
        <button class="btn" data-action="bulk-upload">📸 Upload photos</button>
        <a class="btn ghost" href="${dayHref(w.id, day)}/photos">🖼️ Photo album (${photos})</a>
      </div>
    </div>
  </section>

  ${SECTIONS.map((sec) => {
    const list = d.missions.filter((m) => m.section === sec.key);
    const secDone = list.filter((m) => rec(p.id, m.id)?.done).length;
    return `<section class="section ${sec.key}">
      <h2><span aria-hidden="true">${sec.emoji}</span> ${sec.label}${sec.note ? `<small>${sec.note}</small>` : ''}
        <span class="sec-count">${secDone}/${list.length}</span></h2>
      <ul class="missions">${list.map((m) => missionRow(m, p.id)).join('')}</ul>
    </section>`;
  }).join('')}

  ${done === 35 ? `<div class="all-done sticker">🎉 ${esc(p.name)} finished every mission today! 🎉</div>` : ''}`;
}

function viewAlbum(w, day) {
  const p = player();
  const d = w.days[day - 1];
  const items = d.missions.filter((m) => rec(p.id, m.id)?.photoId);
  return `
  <section class="day-head compact">
    <div class="day-nav">
      <a href="${dayHref(w.id, day)}" class="pill">← Back to missions</a>
      <span class="when">${esc(cal.fmt(d.date))}</span><span></span>
    </div>
    <h1 class="display">${esc(p.name)}'s album</h1>
    <p class="lead">${plural(items.length, 'photo')} from ${esc(d.title)} · ${esc(w.name)}</p>
  </section>
  ${items.length ? `<div class="album">
    ${items.map((m, i) => `
      <button class="polaroid" style="--tilt:${((i * 37) % 7) - 3}deg" data-action="open-photo" data-mission="${m.id}">
        ${thumbImg(rec(p.id, m.id).photoId, m.text)}
        <span class="cap"><b>${m.label}</b> ${esc(m.text)}</span>
      </button>`).join('')}
  </div>` : `<div class="empty sticker">
      <p class="big-emoji" aria-hidden="true">📷</p>
      <p>No photos yet for this day.</p>
      <p class="muted">Tap <b>📸 Upload photos</b> on the missions page to add the day's pictures from your camera.</p>
      <a class="btn" href="${dayHref(w.id, day)}">Go to missions</a>
    </div>`}`;
}

function weekPicker(selected, action) {
  const ids = cal.unlockedWeekIds(todayISO()).reverse();
  return `<label class="field inline week-pick"><span>Week</span>
    <select data-action-change="${action}">
      ${ids.map((id) => { const w = cal.getWeek(id); return `<option value="${id}" ${id === selected ? 'selected' : ''}>${w.emoji} ${esc(w.name)} (${esc(weekRange(w))})</option>`; }).join('')}
    </select></label>`;
}

function viewScoreboard(weekId) {
  const w = cal.getWeek(weekId);
  const players = state.players;
  const totals = players.map((p) => weekScore(p.id, w));
  const best = Math.max(...totals);
  const season = players.map((p) => seasonScore(p.id));
  const bestSeason = Math.max(...season);
  const awards = state.awards[w.id] || {};
  return `
  <section class="page-head">
    <p class="eyebrow">Official scoreboard</p>
    <h1 class="display">Photo Championship</h1>
  </section>

  <section class="block">
    <h2>Season standings</h2>
    <div class="season-row">
      ${players.map((p, i) => `<div class="season-card sticker ${season[i] === bestSeason && bestSeason > 0 ? 'leader' : ''}" style="--pc:${p.color}">
        ${season[i] === bestSeason && bestSeason > 0 ? '<span class="crown">👑</span>' : ''}${avatar(p)}<b>${esc(p.name)}</b><span class="season-pts">${season[i].toLocaleString()}</span></div>`).join('')}
    </div>
  </section>

  <section class="block">
    <div class="block-head"><h2>${w.emoji} ${esc(w.name)}</h2>${weekPicker(w.id, 'scoreboard-week')}</div>
    <div class="table-wrap sticker">
      <table class="scoreboard">
        <thead><tr><th scope="col">Day</th>${players.map((p) => `<th scope="col">${avatar(p, 'sm')}<span>${esc(p.name)}</span></th>`).join('')}</tr></thead>
        <tbody>
          ${w.days.map((d) => `<tr style="--c:${d.color};--cd:${d.deep}">
            <th scope="row">${canView(d.date) ? `<a href="${dayHref(w.id, d.day)}">` : '<span class="row-locked">'}<span class="dot"></span>${esc(cal.fmt(d.date, { weekday: 'short' }))} · ${canView(d.date) ? esc(d.title) : '🔒'}${canView(d.date) ? '</a>' : '</span>'}</th>
            ${players.map((p) => {
              const s = dayScore(p.id, w, d.day);
              const sp = specialScore(p.id, w, d.day);
              return `<td><b>${s}</b><span class="of">/400</span>${sp ? `<span class="star-pts">+${sp}⭐</span>` : ''}</td>`;
            }).join('')}
          </tr>`).join('')}
        </tbody>
        <tfoot><tr><th scope="row">Week total</th>
          ${players.map((p, i) => `<td class="${totals[i] === best && best > 0 ? 'leader' : ''}">${totals[i] === best && best > 0 ? '<span class="crown">👑</span>' : ''}<b>${totals[i].toLocaleString()}</b></td>`).join('')}
        </tr></tfoot>
      </table>
    </div>
  </section>

  <section class="block">
    <h2>This week's awards</h2>
    <div class="awards">
      ${AWARDS.map((a) => {
        const win = playerById(awards[a.key]);
        return `<div class="award ${win ? 'won' : ''}" ${win ? `style="--pc:${win.color}"` : ''}>
          <span class="award-emoji" aria-hidden="true">${a.emoji}</span>
          <span class="award-label">${a.label}</span>
          <span class="award-winner">${win ? `${avatar(win, 'sm')} ${esc(win.name)}` : 'To be announced'}</span>
        </div>`;
      }).join('')}
    </div>
    <p class="muted small">Grown-ups hand out awards and special points in the 🔑 Grown-ups zone.</p>
  </section>`;
}

function viewCalendar() {
  const t = todayISO();
  const ids = cal.unlockedWeekIds(t).reverse();
  const next = cal.getWeek(cal.addDays(currentWeekId(), 7), { peek: true });
  const upcoming = cal.holidaysBetween(t, cal.addDays(t, 45));
  const cd = christmasCountdown();
  return `
  <section class="page-head">
    <p class="eyebrow">A new challenge every Monday</p>
    <h1 class="display">Season calendar</h1>
  </section>

  ${upcoming.length || cd ? `<section class="block">
    <h2>Coming up</h2>
    <ul class="holiday-list">
      ${cd ? `<li class="sticker countdown"><span aria-hidden="true">🎄</span><b>${esc(cd.replace('🎄 ', ''))}</b></li>` : ''}
      ${upcoming.map((h) => `<li class="sticker"><span aria-hidden="true">${h.emoji}</span><b>${esc(h.label)}</b><span class="muted">${esc(cal.fmt(h.date, { weekday: 'long', month: 'short', day: 'numeric' }))}</span></li>`).join('')}
    </ul>
  </section>` : ''}

  <section class="block">
    <h2>Weeks</h2>
    <div class="week-list">
      <div class="week-card mystery sticker">
        <span class="wk-emoji" aria-hidden="true">🎁</span>
        <div><b>Next week: top secret!</b><span class="muted">Unlocks ${esc(cal.fmt(next.start, { weekday: 'long', month: 'short', day: 'numeric' }))}</span></div>
      </div>
      ${ids.map((id) => {
        const w = cal.getWeek(id);
        const current = id === currentWeekId();
        return `<a class="week-card sticker ${current ? 'current' : ''}" href="#/w/${id}">
          <span class="wk-emoji" aria-hidden="true">${w.emoji}</span>
          <div><b>${esc(w.name)}</b><span class="muted">${current ? 'This week · ' : 'Memory book · '}${esc(weekRange(w))}</span></div>
          <span class="wk-scores">${state.players.map((p) => `<span>${avatar(p, 'sm')}${weekScore(p.id, w).toLocaleString()}</span>`).join('')}</span>
        </a>`;
      }).join('')}
    </div>
  </section>`;
}

function playerForm(p) {
  const isNew = !p;
  const used = new Set(state.players.map((x) => x.emoji));
  const emoji = p?.emoji || EMOJIS.find((e) => !used.has(e)) || EMOJIS[0];
  const usedColors = new Set(state.players.map((x) => x.color));
  const color = p?.color || PLAYER_COLORS.find((c) => !usedColors.has(c)) || PLAYER_COLORS[0];
  return `
  <form class="player-form" data-form="player" data-id="${p?.id || ''}">
    <label class="field"><span>Name</span>
      <input name="name" required maxlength="20" autocomplete="off" value="${esc(p?.name || '')}" placeholder="Type a name">
    </label>
    <fieldset><legend>Pick a buddy</legend>
      <div class="emoji-grid">
        ${EMOJIS.map((e) => `<label class="emoji-opt"><input type="radio" name="emoji" value="${e}" ${e === emoji ? 'checked' : ''}><span>${e}</span></label>`).join('')}
      </div>
    </fieldset>
    <fieldset><legend>Pick a color</legend>
      <div class="color-grid">
        ${PLAYER_COLORS.map((c, i) => `<label class="color-opt" style="--pc:${c}"><input type="radio" name="color" value="${c}" ${c === color ? 'checked' : ''} aria-label="Color ${i + 1}"><span></span></label>`).join('')}
      </div>
    </fieldset>
    <div class="form-actions">
      <button class="btn" type="submit">${isNew ? 'Add player' : 'Save'}</button>
      ${!isNew ? '<button class="btn ghost" type="button" data-action="cancel-edit">Cancel</button>' : ''}
    </div>
  </form>`;
}

function viewPlayers() {
  return `
  <section class="page-head">
    <p class="eyebrow">${plural(state.players.length, 'hunter')}</p>
    <h1 class="display">Players</h1>
  </section>
  <ul class="player-list">
    ${state.players.map((p) => ui.editing === p.id
      ? `<li class="sticker editing">${playerForm(p)}</li>`
      : `<li class="sticker player-card" style="--pc:${p.color}">
          ${avatar(p, 'lg')}
          <div class="pc-info"><b>${esc(p.name)}</b><span class="muted">${seasonScore(p.id).toLocaleString()} season points</span></div>
          <div class="pc-actions">
            <button class="btn small ghost" data-action="edit-player" data-id="${p.id}">Edit</button>
            <button class="btn small danger" data-action="remove-player" data-id="${p.id}">Remove</button>
          </div>
        </li>`).join('')}
  </ul>
  <section class="panel sticker">
    <h2>Add a player</h2>
    ${ui.editing ? '<p class="muted">Finish editing first.</p>' : playerForm(null)}
  </section>`;
}

function viewRules() {
  const w = currentWeek();
  return `
  <section class="page-head">
    <p class="eyebrow">How to play</p>
    <h1 class="display">The rules</h1>
  </section>
  <ul class="rules sticker">
    ${RULES.map((r) => `<li><span aria-hidden="true">${r.emoji}</span>${esc(r.text)}</li>`).join('')}
  </ul>
  <section class="block">
    <h2>Special daily challenges</h2>
    <p class="muted">Extra points on top of the 400 a day. Grown-ups award these. The golden hunt changes every week!</p>
    <ul class="specials-list">
      ${weekSpecials(w).map((s) => `<li class="sticker"><span class="sp-emoji" aria-hidden="true">${s.emoji}</span>
        <div><b>${esc(s.label)}</b><span class="muted">${esc(s.desc)}</span></div><span class="pts bonus">+${s.points}</span></li>`).join('')}
    </ul>
  </section>
  <section class="block">
    <h2>Weekly awards</h2>
    <div class="awards">${AWARDS.map((a) => `<div class="award"><span class="award-emoji" aria-hidden="true">${a.emoji}</span><span class="award-label">${a.label}</span></div>`).join('')}</div>
  </section>`;
}

function viewGrownups() {
  if (!ui.grownup) {
    if (!ui.gate) ui.gate = { a: 6 + ((Math.random() * 7) | 0), b: 11 + ((Math.random() * 8) | 0) };
    return `
    <section class="page-head">
      <p class="eyebrow">Grown-ups only</p>
      <h1 class="display">Grown-ups zone</h1>
    </section>
    <form class="panel sticker gate" data-form="gate">
      <p>Special points, awards, previews and backups live here.</p>
      <label class="field"><span>What is ${ui.gate.a} × ${ui.gate.b}?</span>
        <input name="answer" inputmode="numeric" autocomplete="off" required>
      </label>
      <button class="btn" type="submit">Unlock</button>
    </form>`;
  }
  const weekId = ui.gwWeek && weekVisible(ui.gwWeek) ? ui.gwWeek : currentWeekId();
  const w = cal.getWeek(weekId);
  const day = ui.gwDay || (weekId === currentWeekId() ? todayDayIndex() : 1);
  const d = w.days[day - 1];
  const specials = weekSpecials(w);
  const awards = state.awards[w.id] || {};
  return `
  <section class="page-head">
    <div class="block-head"><p class="eyebrow">Grown-ups zone</p><button class="btn small ghost" data-action="lock-grownups">🔒 Lock</button></div>
    <h1 class="display">Judges' table</h1>
    <p class="muted">While unlocked you can also preview days that haven't opened yet.</p>
  </section>

  <section class="block">
    <div class="block-head"><h2>Special daily challenges</h2>${weekPicker(w.id, 'gw-week')}</div>
    <div class="day-tabs" role="tablist">
      ${w.days.map((x) => `<button role="tab" aria-selected="${x.day === day}" class="day-tab ${x.day === day ? 'on' : ''}" style="--c:${x.color}" data-action="gw-day" data-day="${x.day}">${esc(cal.fmt(x.date, { weekday: 'short' }))}</button>`).join('')}
    </div>
    <p class="muted">${esc(d.title)} · ${esc(cal.fmt(d.date))}</p>
    <div class="specials-grid">
      ${state.players.map((p) => {
        const s = state.specials[p.id]?.[w.id]?.[day] || {};
        return `<div class="sticker special-card" style="--pc:${p.color}">
          <div class="sc-head">${avatar(p, 'sm')}<b>${esc(p.name)}</b><span class="star-pts">+${specialScore(p.id, w, day)} ⭐</span></div>
          ${specials.map((sp) => {
            if (sp.auto) {
              const on = sunClub(p.id, w, day);
              return `<div class="sp-row auto ${on ? 'on' : ''}"><span>${sp.emoji} ${esc(sp.label)}</span><span>${on ? '+20 ✓' : 'needs #01 & #21'}</span></div>`;
            }
            const data = `data-special="${sp.key}" data-pid="${p.id}" data-week="${w.id}" data-day="${day}"`;
            if (sp.scale) {
              const v = Number(s.choice) || 0;
              return `<label class="sp-row"><span>${sp.emoji} ${esc(sp.label)}</span>
                <span class="range"><input type="range" min="0" max="20" step="5" value="${v}" ${data}><output>+${v}</output></span></label>`;
            }
            return `<label class="sp-row toggle"><span>${sp.emoji} ${esc(sp.label)}</span>
              <span class="switch"><input type="checkbox" ${s[sp.key] ? 'checked' : ''} ${data}><i></i><em>+${sp.points}</em></span></label>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>
  </section>

  <section class="block">
    <h2>${w.emoji} Awards for ${esc(w.name)}</h2>
    <div class="award-picks">
      ${AWARDS.map((a) => `<label class="field"><span>${a.emoji} ${a.label}</span>
        <select data-award="${a.key}" data-week="${w.id}"><option value="">Not yet</option>
          ${state.players.map((p) => `<option value="${p.id}" ${awards[a.key] === p.id ? 'selected' : ''}>${esc(p.emoji)} ${esc(p.name)}</option>`).join('')}
        </select></label>`).join('')}
    </div>
  </section>

  <section class="block">
    <h2>🕰️ Time machine</h2>
    <p class="muted">Preview the app as if it were another date (for example, to see how Christmas Day will look). This only changes this screen and resets when the app reloads.</p>
    <div class="form-actions">
      <label class="field inline"><span>Pretend today is</span><input type="date" data-setting="timeTravel" min="${cal.SEASON_START}" value="${esc(todayISO())}"></label>
      ${ui.timeTravel ? '<button class="btn small ghost" data-action="time-reset">Back to today</button>' : ''}
    </div>
  </section>

  <section class="block">
    <h2>Players</h2>
    <p><a class="btn ghost" href="#/players">🧒 Add, edit or remove players</a></p>
  </section>

  <section class="block">
    <h2>Photos &amp; backups</h2>
    <div class="panel sticker backup">
      <p>Photos are saved <b>only on this device</b>, shrunk to about 300 KB each. <span id="usage" class="muted"></span></p>
      <ul class="tips">
        <li>On a phone or iPad, use <b>Share → Add to Home Screen</b>. Safari can clear saved data from websites that aren't added to the Home Screen.</li>
        <li>Export a backup every few days. If a kid plays on a different device, export there and import here to combine everyone.</li>
      </ul>
      <div class="form-actions">
        <button class="btn" data-action="export">⬇️ Export backup</button>
        <button class="btn ghost" data-action="import">⬆️ Import backup</button>
      </div>
    </div>
    <details class="danger-zone">
      <summary>Start over</summary>
      <p>Deletes every player, score and photo on this device.</p>
      <button class="btn danger" data-action="reset">Delete everything</button>
    </details>
  </section>
  <p><a class="link" href="#/rules">Read the rules →</a></p>`;
}

async function fillUsage() {
  const u = await store.usage();
  const el = $('#usage');
  if (el && u?.usage != null) el.textContent = `Using ${(u.usage / 1048576).toFixed(1)} MB so far.`;
}

/* ---------- upload tray (end-of-day DSLR workflow) ---------- */

function renderTray(ctx) {
  const el = $('#tray');
  const t = ui.tray;
  document.body.classList.toggle('assigning', !!(t && t.selected && ctx));
  if (!t || !ctx) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const busy = t.done < t.total;
  const hint = t.selected
    ? 'Now tap the mission this photo belongs to 👇'
    : t.items.length ? 'Tap a photo, then tap its mission.' : busy ? 'Getting your photos ready…' : 'All photos placed! 🎉';
  el.innerHTML = `
    <div class="tray-head">
      <b>${hint}</b>
      ${busy ? `<span class="tray-progress"><span style="width:${(t.done / t.total) * 100}%"></span></span><span class="muted small">${t.done}/${t.total}</span>` : ''}
      <button class="btn small ghost" data-action="tray-more">＋ More</button>
      <button class="btn small" data-action="tray-close">Done</button>
    </div>
    <div class="tray-strip">
      ${t.items.map((it) => `<button class="tray-item ${t.selected === it.key ? 'on' : ''}" data-action="tray-select" data-key="${it.key}" aria-pressed="${t.selected === it.key}">
        <img src="${it.url}" alt="${esc(it.name)}"></button>`).join('')}
    </div>`;
}

const trayCtx = () => { const c = routeDay(); return c && !c.photos && canView(c.week.days[c.day - 1].date) ? c : null; };

async function startBulk(files) {
  if (!files.length) return;
  store.requestPersistence();
  if (!ui.tray) ui.tray = { items: [], selected: null, total: 0, done: 0, errors: [] };
  const t = ui.tray;
  t.total += files.length;
  render();
  for (const f of files) {
    try {
      const r = await processImage(f);
      const item = { key: uid(), ...r, url: URL.createObjectURL(r.thumb) };
      t.items.push(item);
      if (!t.selected) t.selected = item.key;
    } catch (e) {
      t.errors.push(e instanceof PhotoError ? e.message : `Couldn't read ${f.name}`);
    }
    t.done++;
    if (ui.tray === t) renderTray(trayCtx());
  }
  if (t.errors.length) toast(t.errors.slice(-1)[0] + (t.errors.length > 1 ? ` (+${t.errors.length - 1} more)` : ''), true);
  t.errors = [];
  if (ui.tray === t) render();
}

function closeTray(force = false) {
  const t = ui.tray;
  if (!t) return;
  if (!force && t.items.length && !confirm(`${t.items.length} photo${t.items.length === 1 ? ' is' : 's are'} not placed on a mission yet. Close anyway?`)) return;
  t.items.forEach((it) => URL.revokeObjectURL(it.url));
  ui.tray = null;
  render();
}

/* ---------- photo actions ---------- */

async function attachPhoto(missionId, processed, at) {
  const pid = state.currentPlayerId;
  const m = cal.missionById(missionId);
  const p = progressFor(pid);
  const old = p[missionId]?.photoId;
  const wasDone = !!p[missionId]?.done;
  const id = uid();
  await store.putPhoto({
    id, playerId: pid, weekId: m.weekId, missionId, day: m.day, name: processed.name,
    full: processed.full, thumb: processed.thumb, createdAt: Date.now(),
  });
  if (old) await removePhotoBlob(old);
  p[missionId] = { done: true, photoId: id, at: Date.now() };
  store.requestPersistence();
  if (!wasDone) celebrate(m, at);
  commit();
}

async function removePhotoBlob(id) {
  await store.deletePhoto(id);
  const url = thumbUrls.get(id);
  if (url) { URL.revokeObjectURL(url); thumbUrls.delete(id); }
}

function centerOf(el) {
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}

function celebrate(m, at) {
  ui.lastToggled = m.id;
  const { x, y } = at || centerOf($(`[data-row="${CSS.escape(m.id)}"] .check`));
  pointsPop(x, y - 10, `+${m.points}!`);
  confetti(x, y, { count: m.points === 20 ? 50 : 28 });
  setTimeout(() => {
    if (dayDone(state.currentPlayerId, cal.getWeek(m.weekId), m.day) === 35) {
      bigCelebration();
      toast('WOW! Every mission for today is complete! 🏆');
    }
  }, 50);
}

async function toggleMission(missionId, btn) {
  const pid = state.currentPlayerId;
  const p = progressFor(pid);
  const r = p[missionId];
  const m = cal.missionById(missionId);
  if (r?.done) {
    if (r.photoId) {
      if (!confirm(`Uncheck "${m.text}"? Its photo will be removed.`)) return;
      await removePhotoBlob(r.photoId);
    }
    delete p[missionId];
  } else {
    p[missionId] = { done: true, at: Date.now() };
    celebrate(m, centerOf(btn.closest('.mission')?.querySelector('.check')));
  }
  commit();
}

let lightboxUrl = null;
async function openLightbox(missionId) {
  const r = rec(state.currentPlayerId, missionId);
  if (!r?.photoId) return;
  const photo = await store.getPhoto(r.photoId);
  if (!photo) { toast('That photo is missing.', true); return; }
  const m = cal.missionById(missionId);
  const w = cal.getWeek(m.weekId);
  const dlg = $('#lightbox');
  if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
  lightboxUrl = URL.createObjectURL(photo.full);
  const pl = player();
  const fileName = `${pl.name}-${w.days[m.day - 1].date}-${m.label}-${m.text}`.replace(/[^\w-]+/g, '_').slice(0, 90) + '.jpg';
  dlg.innerHTML = `
    <figure>
      <img src="${lightboxUrl}" alt="${esc(m.text)}">
      <figcaption><span class="pts ${m.points === 20 ? 'bonus' : ''}">${m.points}</span> ${esc(cal.fmt(w.days[m.day - 1].date))} · <b>${m.label}</b> ${esc(m.text)}</figcaption>
    </figure>
    <div class="lb-actions">
      <a class="btn small ghost" href="${lightboxUrl}" download="${esc(fileName)}">⬇️ Save</a>
      <button class="btn small ghost" data-action="replace-photo" data-mission="${missionId}">🔁 Replace</button>
      <button class="btn small danger" data-action="remove-photo" data-mission="${missionId}">🗑️ Remove</button>
      <button class="btn small" data-action="close-lightbox">Close</button>
    </div>`;
  dlg.showModal();
}
function closeLightbox() {
  const dlg = $('#lightbox');
  if (dlg.open) dlg.close();
}

/* ---------- backup ---------- */

async function exportBackup() {
  toast('Packing up your backup…');
  const photos = await store.allPhotos();
  const parts = [`{"app":"photo-scavenger-hunt","version":2,"exportedAt":${JSON.stringify(new Date().toISOString())},"state":${JSON.stringify(state)},"photos":[`];
  for (let i = 0; i < photos.length; i++) {
    const { full, thumb, ...meta } = photos[i];
    parts.push((i ? ',' : '') + JSON.stringify({ ...meta, full: await blobToDataUrl(full), thumb: await blobToDataUrl(thumb) }));
  }
  parts.push(']}');
  const blob = new Blob(parts, { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `photo-hunt-backup-${cal.toISO(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Backup saved with ${plural(photos.length, 'photo')} ✅`);
}

async function importBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast("That file isn't a Photo Hunt backup.", true); return; }
  if (data?.app !== 'photo-scavenger-hunt' || !data.state) { toast("That file isn't a Photo Hunt backup.", true); return; }
  toast('Importing…');
  const inc = migrate(structuredClone(data.state));
  const idMap = {};
  for (const ip of inc.players || []) {
    const match = state.players.find((p) => p.id === ip.id) ||
      state.players.find((p) => p.name.trim().toLowerCase() === ip.name.trim().toLowerCase());
    if (match) idMap[ip.id] = match.id;
    else { state.players.push({ ...ip }); idMap[ip.id] = ip.id; }
  }
  const replaced = [];
  for (const [ipid, missions] of Object.entries(inc.progress || {})) {
    const mine = progressFor(idMap[ipid] || ipid);
    for (const [mid, r] of Object.entries(missions)) {
      const cur = mine[mid];
      if (!cur || (r.photoId && !cur.photoId) || ((r.at || 0) > (cur.at || 0) && !(cur.photoId && !r.photoId))) {
        if (cur?.photoId && cur.photoId !== r.photoId) replaced.push(cur.photoId);
        mine[mid] = { ...r };
      }
    }
  }
  for (const [ipid, weeks] of Object.entries(inc.specials || {})) {
    for (const [weekId, days] of Object.entries(weeks)) {
      for (const [day, s] of Object.entries(days)) {
        const mine = specialsRec(idMap[ipid] || ipid, weekId, day);
        for (const [k, v] of Object.entries(s)) if (v && !mine[k]) mine[k] = v;
      }
    }
  }
  for (const [weekId, aw] of Object.entries(inc.awards || {})) {
    const mine = (state.awards[weekId] ||= {});
    for (const [k, v] of Object.entries(aw)) if (v && !mine[k]) mine[k] = idMap[v] || v;
  }
  for (const [weekId, def] of Object.entries(inc.snapshots || {})) if (!state.snapshots[weekId]) state.snapshots[weekId] = def;
  if (!state.currentPlayerId) state.currentPlayerId = state.players[0]?.id || null;

  const wanted = new Set(Object.values(state.progress).flatMap((m) => Object.values(m).map((r) => r.photoId).filter(Boolean)));
  let added = 0;
  for (const ph of data.photos || []) {
    if (!wanted.has(ph.id) || (await store.hasPhoto(ph.id))) continue;
    const missionId = ph.missionId?.includes('/') ? ph.missionId : `${cal.SEASON_START}/${ph.missionId}`;
    await store.putPhoto({
      ...ph, missionId, weekId: missionId.split('/')[0], playerId: idMap[ph.playerId] || ph.playerId,
      full: await dataUrlToBlob(ph.full), thumb: await dataUrlToBlob(ph.thumb),
    });
    added++;
  }
  for (const id of replaced) if (!wanted.has(id)) await removePhotoBlob(id);
  cal.useSnapshotStore(state.snapshots, save);
  await store.saveState(state);
  render();
  toast(`Imported! ${plural(added, 'new photo')} added ✅`);
}

/* ---------- events ---------- */

const singleInput = $('#single-input');
const bulkInput = $('#bulk-input');
const importInput = $('#import-input');

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  const row = e.target.closest('.mission');

  // While a tray photo is selected, tapping any mission row places the photo there.
  if (ui.tray?.selected && row && !e.target.closest('[data-action="open-photo"]')) {
    e.preventDefault();
    const mid = row.dataset.row;
    const t = ui.tray;
    const item = t.items.find((i) => i.key === t.selected);
    if (!item) return;
    if (rec(state.currentPlayerId, mid)?.photoId && !confirm(`"${cal.missionById(mid).text}" already has a photo. Replace it?`)) return;
    t.items = t.items.filter((i) => i !== item);
    t.selected = t.items[0]?.key || null;
    URL.revokeObjectURL(item.url);
    await attachPhoto(mid, item, centerOf(row.querySelector('.check')));
    if (!t.items.length && t.done >= t.total) {
      toast('All photos placed! 🎉');
      setTimeout(() => { if (ui.tray === t && !t.items.length) closeTray(true); }, 1200);
    }
    return;
  }
  if (!el) return;
  switch (el.dataset.action) {
    case 'select-player':
      state.currentPlayerId = el.dataset.id;
      commit();
      break;
    case 'toggle':
      await toggleMission(el.dataset.mission, el);
      break;
    case 'pick-photo':
    case 'replace-photo':
      closeLightbox();
      ui.pendingMission = el.dataset.mission;
      singleInput.value = '';
      singleInput.click();
      break;
    case 'open-photo':
      openLightbox(el.dataset.mission);
      break;
    case 'remove-photo': {
      const r = rec(state.currentPlayerId, el.dataset.mission);
      if (!r?.photoId || !confirm('Remove this photo? The mission stays checked.')) return;
      await removePhotoBlob(r.photoId);
      delete r.photoId;
      closeLightbox();
      commit();
      break;
    }
    case 'close-lightbox':
      closeLightbox();
      break;
    case 'bulk-upload':
    case 'tray-more':
      bulkInput.value = '';
      bulkInput.click();
      break;
    case 'tray-select':
      ui.tray.selected = ui.tray.selected === el.dataset.key ? null : el.dataset.key;
      renderTray(trayCtx());
      break;
    case 'tray-close':
      closeTray();
      break;
    case 'edit-player':
      ui.editing = el.dataset.id;
      render();
      break;
    case 'cancel-edit':
      ui.editing = null;
      render();
      break;
    case 'remove-player': {
      const p = playerById(el.dataset.id);
      if (!confirm(`Remove ${p.name}? This deletes all of ${p.name}'s checkmarks and photos on this device.`)) return;
      await store.deletePhotosForPlayer(p.id);
      for (const r of Object.values(state.progress[p.id] || {})) {
        if (r.photoId && thumbUrls.has(r.photoId)) { URL.revokeObjectURL(thumbUrls.get(r.photoId)); thumbUrls.delete(r.photoId); }
      }
      state.players = state.players.filter((x) => x.id !== p.id);
      delete state.progress[p.id];
      delete state.specials[p.id];
      for (const aw of Object.values(state.awards)) for (const k of Object.keys(aw)) if (aw[k] === p.id) delete aw[k];
      if (state.currentPlayerId === p.id) state.currentPlayerId = state.players[0]?.id || null;
      commit();
      toast(`${p.name} was removed.`);
      break;
    }
    case 'gw-day':
      ui.gwDay = Number(el.dataset.day);
      render();
      break;
    case 'lock-grownups':
      ui.grownup = false;
      ui.gate = null;
      ui.timeTravel = null;
      location.hash = '#/';
      render();
      break;
    case 'time-reset':
      ui.timeTravel = null;
      render();
      toast('Back to today ✅');
      break;
    case 'export':
      exportBackup().catch((err) => toast(`Export failed: ${err.message}`, true));
      break;
    case 'import':
      importInput.value = '';
      importInput.click();
      break;
    case 'reset':
      if (!confirm('Delete ALL players, scores and photos on this device?')) return;
      if (!confirm('Are you really sure? This cannot be undone.')) return;
      await store.clearAll();
      thumbUrls.forEach((u) => URL.revokeObjectURL(u));
      thumbUrls.clear();
      adoptState(defaultState());
      Object.assign(ui, { grownup: false, gate: null, timeTravel: null, gwWeek: null, gwDay: null });
      location.hash = '#/';
      render();
      toast('Everything was deleted.');
      break;
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  e.preventDefault();
  if (form.dataset.form === 'player') {
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;
    const id = form.dataset.id;
    if (id) {
      Object.assign(playerById(id), { name, emoji: fd.get('emoji'), color: fd.get('color') });
      ui.editing = null;
      toast('Saved!');
    } else {
      const p = { id: uid(), name, emoji: fd.get('emoji'), color: fd.get('color') };
      state.players.push(p);
      if (!state.currentPlayerId) state.currentPlayerId = p.id;
      toast(`Welcome, ${name}! ${p.emoji}`);
      store.requestPersistence();
    }
    commit();
  } else if (form.dataset.form === 'gate') {
    const ans = Number(new FormData(form).get('answer'));
    if (ans === ui.gate.a * ui.gate.b) { ui.grownup = true; render(); }
    else { toast('Not quite! Ask a grown-up 😉', true); ui.gate = null; render(); }
  }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.special === 'choice') t.nextElementSibling.textContent = `+${t.value}`;
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.special) {
    const s = specialsRec(t.dataset.pid, t.dataset.week, t.dataset.day);
    s[t.dataset.special] = t.type === 'checkbox' ? t.checked : Number(t.value);
    commit();
  } else if (t.dataset.award !== undefined) {
    const aw = (state.awards[t.dataset.week] ||= {});
    if (t.value) aw[t.dataset.award] = t.value;
    else delete aw[t.dataset.award];
    commit();
  } else if (t.dataset.setting === 'timeTravel' && t.value) {
    ui.timeTravel = t.value === cal.toISO(new Date()) ? null : t.value;
    ui.gwWeek = null;
    ui.gwDay = null;
    render();
  } else if (t.dataset.actionChange === 'scoreboard-week') {
    location.hash = `#/scoreboard/${t.value}`;
  } else if (t.dataset.actionChange === 'gw-week') {
    ui.gwWeek = t.value;
    ui.gwDay = null;
    render();
  }
});

singleInput.addEventListener('change', async () => {
  const file = singleInput.files[0];
  const mid = ui.pendingMission;
  ui.pendingMission = null;
  if (!file || !mid) return;
  const slot = $(`[data-row="${CSS.escape(mid)}"] .slot`);
  slot?.classList.add('busy');
  try {
    const processed = await processImage(file);
    await attachPhoto(mid, processed, centerOf(slot));
  } catch (err) {
    slot?.classList.remove('busy');
    toast(err instanceof PhotoError ? err.message : `Couldn't save that photo: ${err.message}`, true);
  }
});

bulkInput.addEventListener('change', () => startBulk([...bulkInput.files]));
importInput.addEventListener('change', () => importInput.files[0] && importBackup(importInput.files[0]).catch((err) => toast(`Import failed: ${err.message}`, true)));

$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });
$('#lightbox').addEventListener('close', () => { if (lightboxUrl) { URL.revokeObjectURL(lightboxUrl); lightboxUrl = null; } });

window.addEventListener('hashchange', () => {
  ui.editing = null;
  closeLightbox();
  render();
  window.scrollTo(0, 0);
});

// Roll over to the next day/week if the app is left open past midnight.
let lastDay = cal.toISO(new Date());
setInterval(() => {
  const now = cal.toISO(new Date());
  if (now !== lastDay && !ui.timeTravel) { lastDay = now; render(); }
}, 60000);

/* ---------- boot ---------- */

async function migratePhotoRecords() {
  const photos = await store.allPhotos();
  for (const ph of photos) {
    if (ph.missionId && !ph.missionId.includes('/')) {
      const missionId = `${cal.SEASON_START}/${ph.missionId}`;
      await store.putPhoto({ ...ph, missionId, weekId: cal.SEASON_START });
    }
  }
}

(async function boot() {
  let next = defaultState();
  try {
    const saved = await store.loadState();
    if (saved) {
      const wasOld = (saved.version || 1) < 2;
      next = { ...defaultState(), ...migrate(saved) };
      if (wasOld) { await store.saveState(next); await migratePhotoRecords(); }
    }
  } catch (e) {
    toast(`Storage is not available: ${e.message}`, true);
  }
  adoptState(next);
  if (state.players.length && !player()) state.currentPlayerId = state.players[0].id;
  render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
