import { qs } from './dom.js';

/**
 * Interactive Isometric Cube Particles
 *
 * Click  → burst of ephemeral cubes at pointer position.
 * Hold   → continuous emission while button is pressed.
 * Move   → cursor gently pushes nearby cubes (no new cubes).
 * Idle   → canvas empties completely.
 */
export function initParticleCanvas(selector = '#particle-canvas') {
  const canvas = qs(selector);
  if (!canvas) return { stop: () => {} };

  const ctx = canvas.getContext('2d', { alpha: true });

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  };
  window.addEventListener('resize', onResize, { passive: true });

  /* ── Colour palette & face shading ── */
  const colors = ['#60a5fa', '#3b82f6', '#93c5fd', '#34d399', '#6ee7b7', '#fbbf24', '#fcd34d'];
  const colorCache = new Map();

  function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0xff) + amt));
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  function getColorSet(color) {
    if (!colorCache.has(color)) {
      colorCache.set(color, {
        top: color,
        left: shadeColor(color, -25),
        right: shadeColor(color, 15),
      });
    }
    return colorCache.get(color);
  }

  /* ── Tuning knobs ── */
  const POOL_MAX      = 500;
  const BURST_COUNT   = 12;
  const EMIT_RATE     = 50;    // ms between emissions while holding
  const EMIT_COUNT    = 3;     // cubes per emission tick
  const LIFE_BASE     = 2.0;   // seconds
  const LIFE_SPREAD   = 0.8;
  const MIN_SIZE      = 2;
  const MAX_SIZE      = 5.5;
  const DRAG          = 0.97;  // per-frame velocity damping
  const CURSOR_RADIUS = 80;    // px — influence zone around cursor
  const CURSOR_FORCE  = 0.35;  // strength of soft push

  /* ── Particle pool (starts empty) ── */
  const particles = [];

  function createParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 2.5;
    const size  = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
    const color = colors[(Math.random() * colors.length) | 0];
    return {
      x, y, size,
      isoHeight: size * 0.5,
      colors: getColorSet(color),
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5,
      vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      life: LIFE_BASE + (Math.random() - 0.5) * LIFE_SPREAD,
      age: 0,
      baseOpacity: 0.4 + Math.random() * 0.4,
    };
  }

  function emitBurst(x, y, count) {
    const room = POOL_MAX - particles.length;
    const n = Math.min(count, room);
    for (let i = 0; i < n; i++) particles.push(createParticle(x, y));
  }

  /* ── Cursor tracking (always, for physics influence) ── */
  let cursorX = -9999;
  let cursorY = -9999;

  /* ── Animation loop (self-stopping when idle) ── */
  let running = true;
  let rafId   = null;
  let lastTs  = 0;

  function animate(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(animate);

    const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const rSq = CURSOR_RADIUS * CURSOR_RADIUS;

    let i = particles.length;
    while (i--) {
      const p = particles[i];
      p.age += dt;

      if (p.age >= p.life) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }

      // Cursor soft-push — smooth inverse-distance repulsion
      const dx = p.x - cursorX;
      const dy = p.y - cursorY;
      const distSq = dx * dx + dy * dy;
      if (distSq < rSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const factor = CURSOR_FORCE * (1 - dist / CURSOR_RADIUS);
        p.vx += (dx / dist) * factor;
        p.vy += (dy / dist) * factor;
      }

      // Drag — velocity damping each frame
      p.vx *= DRAG;
      p.vy *= DRAG;
      p.x  += p.vx;
      p.y  += p.vy;
      p.rotation += p.rotationSpeed;

      // Fade proportional to remaining life
      const alpha = p.baseOpacity * (1 - p.age / p.life);
      if (alpha < 0.01) continue;

      const { size, isoHeight, colors: c } = p;
      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * 0.05);

      // Top face
      ctx.fillStyle = c.top;
      ctx.beginPath();
      ctx.moveTo(0, -isoHeight);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, isoHeight);
      ctx.lineTo(-size, 0);
      ctx.fill();

      // Left face
      ctx.fillStyle = c.left;
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, isoHeight);
      ctx.lineTo(0, isoHeight + size);
      ctx.lineTo(-size, size);
      ctx.fill();

      // Right face
      ctx.fillStyle = c.right;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(0, isoHeight);
      ctx.lineTo(0, isoHeight + size);
      ctx.lineTo(size, size);
      ctx.fill();

      ctx.restore();
    }

    ctx.globalAlpha = 1;

    // Self-park when nothing left to draw and nobody is holding
    if (particles.length === 0 && !holding) {
      rafId = null;
      lastTs = 0;
    }
  }

  function ensureLoop() {
    if (!rafId && running) rafId = requestAnimationFrame(animate);
  }

  /* ── Interaction state ── */
  let holding   = false;
  let holdX     = 0;
  let holdY     = 0;
  let emitTimer = null;

  function startHold(x, y) {
    holding = true;
    holdX = x;
    holdY = y;
    cursorX = x;
    cursorY = y;
    emitBurst(x, y, BURST_COUNT);
    ensureLoop();
    emitTimer = setInterval(() => {
      if (!holding) return;
      emitBurst(holdX, holdY, EMIT_COUNT);
    }, EMIT_RATE);
  }

  function moveHold(x, y) {
    // Always update cursor for physics push on existing cubes
    cursorX = x;
    cursorY = y;
    // Only update emission origin if actively holding
    if (holding) {
      holdX = x;
      holdY = y;
    }
  }

  function endHold() {
    holding = false;
    if (emitTimer) { clearInterval(emitTimer); emitTimer = null; }
  }

  /* ── Event listeners ── */
  const onMouseDown    = (e) => { startHold(e.clientX, e.clientY); };
  const onMouseMove    = (e) => { moveHold(e.clientX, e.clientY); };
  const onMouseUp      = ()  => { endHold(); };
  const onMouseLeave   = ()  => { endHold(); cursorX = -9999; cursorY = -9999; };
  const onTouchStart   = (e) => { const t = e.touches[0]; if (t) startHold(t.clientX, t.clientY); };
  const onTouchMove    = (e) => { const t = e.touches[0]; if (t) moveHold(t.clientX, t.clientY); };
  const onTouchEnd     = ()  => { endHold(); };
  const onPointerCancel = () => { endHold(); };
  const onBlur         = ()  => { endHold(); };

  document.addEventListener('mousedown',     onMouseDown);
  document.addEventListener('mousemove',     onMouseMove);
  document.addEventListener('mouseup',       onMouseUp);
  document.addEventListener('mouseleave',    onMouseLeave);
  document.addEventListener('touchstart',    onTouchStart, { passive: true });
  document.addEventListener('touchmove',     onTouchMove,  { passive: true });
  document.addEventListener('touchend',      onTouchEnd);
  document.addEventListener('pointercancel', onPointerCancel);
  window.addEventListener('blur',            onBlur);

  /* ── Visibility: pause when tab hidden ── */
  const onVisibilityChange = () => {
    if (document.hidden) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      endHold();
    } else {
      running = true;
      if (particles.length > 0) ensureLoop();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  /* ── Cleanup handle ── */
  return {
    stop() {
      running = false;
      endHold();
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur',   onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('mousedown',     onMouseDown);
      document.removeEventListener('mousemove',     onMouseMove);
      document.removeEventListener('mouseup',       onMouseUp);
      document.removeEventListener('mouseleave',    onMouseLeave);
      document.removeEventListener('touchstart',    onTouchStart);
      document.removeEventListener('touchmove',     onTouchMove);
      document.removeEventListener('touchend',      onTouchEnd);
      document.removeEventListener('pointercancel', onPointerCancel);
      particles.length = 0;
      colorCache.clear();
    }
  };
}
