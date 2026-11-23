// Little celebrations: confetti bursts, "+10!" pops and score count-ups.

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = ['#ff5d73', '#ffc233', '#43c46b', '#3aa0ff', '#a56bff', '#ff8a3d'];

export function confetti(x, y, { count = 36, power = 1 } = {}) {
  if (reduced()) return;
  const canvas = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.className = 'confetti-canvas';
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const parts = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = (6 + Math.random() * 7) * power;
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: Math.random() > 0.5 ? 'rect' : 'dot',
    };
  });

  const start = performance.now();
  const life = 1400 + power * 400;
  function frame(now) {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t / life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (t < life) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

export function bigCelebration() {
  if (reduced()) return;
  const w = innerWidth;
  [0.2, 0.5, 0.8].forEach((fx, i) =>
    setTimeout(() => confetti(w * fx, innerHeight * 0.75, { count: 70, power: 1.5 }), i * 220),
  );
}

export function pointsPop(x, y, text) {
  const el = document.createElement('div');
  el.className = 'points-pop';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1500);
}

export function countUp(el, from, to) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = to; return; }
  const start = performance.now();
  const dur = 650;
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - k, 4);
    el.textContent = Math.round(from + (to - from) * eased);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
