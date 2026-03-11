import { qs } from './dom.js';

/**
 * Interactive Isometric Cube Particles — Burst + Dust Trail
 *
 * Click  → burst of ephemeral cubes at pointer position.
 * Hold   → continuous frame-driven emission while button is pressed.
 * Move   → cursor pushes nearby cubes (repulsion + drag + curl). No new cubes.
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

  /* ── Platform detection ── */
  const isMobile = matchMedia('(pointer: coarse)').matches;

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
  const BURST_COUNT   = isMobile ? 5  : 8;
  const EMIT_COUNT    = isMobile ? 1  : 2;
  const EMIT_INTERVAL = isMobile ? 0.042 : 0.028; // seconds between continuous emissions
  const POOL_MAX      = isMobile ? 110 : 220;
  const LIFE_MIN      = 0.9;
  const LIFE_MAX      = 1.6;
  const MIN_SIZE      = 2;
  const MAX_SIZE      = 5.5;
  const VEL_DRAG      = 0.955;  // base drag per frame @60fps
  const ROT_DRAG      = 0.97;
  const CURSOR_RADIUS = 90;
  const CURSOR_REPUL  = 0.30;   // radial repulsion strength
  const CURSOR_DRAG_F = 0.12;   // cursor-velocity drag strength
  const CURSOR_CURL   = 0.08;   // tangential curl strength
  const SPAWN_JITTER  = 8;      // px scatter around cursor on spawn
  const CURSOR_VEL_INHERIT = 0.35; // fraction of cursor velocity inherited by new cubes

  /* ── Particle pool (starts empty) ── */
  const particles = [];

  /* ── Cursor state ── */
  let cursorX  = -9999;
  let cursorY  = -9999;
  let prevCurX = -9999;
  let prevCurY = -9999;
  let cursorVX = 0;
  let cursorVY = 0;

  function updateCursorVelocity(x, y, dt) {
    if (prevCurX < -9000) { prevCurX = x; prevCurY = y; }
    if (dt > 0) {
      cursorVX = (x - prevCurX) / dt;
      cursorVY = (y - prevCurY) / dt;
    }
    prevCurX = cursorX;
    prevCurY = cursorY;
    cursorX = x;
    cursorY = y;
  }

  /* ── Particle creation ── */
  function createParticle(x, y) {
    const angle  = Math.random() * Math.PI * 2;
    const speed  = 0.4 + Math.random() * 1.8;
    const jAngle = Math.random() * Math.PI * 2;
    const jDist  = Math.random() * SPAWN_JITTER;
    const size   = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
    const color  = colors[(Math.random() * colors.length) | 0];
    // Scale cursor velocity to per-frame units (assume ~60fps for spawn impulse)
    const cvxF = (cursorVX / 60) * CURSOR_VEL_INHERIT;
    const cvyF = (cursorVY / 60) * CURSOR_VEL_INHERIT;
    return {
      x: x + Math.cos(jAngle) * jDist,
      y: y + Math.sin(jAngle) * jDist,
      size,
      isoHeight: size * 0.5,
      colors: getColorSet(color),
      vx: Math.cos(angle) * speed + cvxF + (Math.random() - 0.5) * 0.4,
      vy: Math.sin(angle) * speed + cvyF + (Math.random() - 0.5) * 0.4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.025,
      life: LIFE_MIN + Math.random() * (LIFE_MAX - LIFE_MIN),
      age: 0,
      baseOpacity: 0.45 + Math.random() * 0.35,
    };
  }

  function evictOldest(room) {
    // Soft eviction: remove the particles closest to death
    let removed = 0;
    while (removed < room && particles.length > 0) {
      let worst = 0;
      let worstRatio = -1;
      for (let j = 0; j < particles.length; j++) {
        const ratio = particles[j].age / particles[j].life;
        if (ratio > worstRatio) { worstRatio = ratio; worst = j; }
      }
      particles[worst] = particles[particles.length - 1];
      particles.pop();
      removed++;
    }
  }

  function emitBurst(x, y, count) {
    let room = POOL_MAX - particles.length;
    if (room < count) { evictOldest(count - room); room = POOL_MAX - particles.length; }
    const n = Math.min(count, room);
    for (let i = 0; i < n; i++) particles.push(createParticle(x, y));
  }

  /* ── Fade curve: quick appearance, visible hold, long tail ── */
  function fadeCurve(t) {
    // t in [0,1] where 0=birth 1=death
    if (t < 0.05) return t / 0.05;                   // fast fade-in
    if (t < 0.3) return 1;                            // full visible
    return 1 - ((t - 0.3) / 0.7) * ((t - 0.3) / 0.7); // quadratic fade-out
  }

  /* ── Animation loop (self-stopping when idle) ── */
  let running   = true;
  let rafId     = null;
  let lastTs    = 0;
  let emitAccum = 0; // time accumulator for frame-driven emission

  function animate(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(animate);

    const rawDt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    const dt = Math.min(rawDt, 0.05);
    lastTs = ts;

    // dt-corrected drag: drag^(dt/baseDt) where baseDt = 1/60
    const dtRatio   = dt * 60;
    const velDrag   = Math.pow(VEL_DRAG, dtRatio);
    const rotDrag   = Math.pow(ROT_DRAG, dtRatio);

    /* ── Frame-driven continuous emission ── */
    if (holding) {
      emitAccum += dt;
      while (emitAccum >= EMIT_INTERVAL) {
        emitAccum -= EMIT_INTERVAL;
        emitBurst(holdX, holdY, EMIT_COUNT);
      }
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const rSq = CURSOR_RADIUS * CURSOR_RADIUS;
    // Per-frame cursor velocity in pixels/frame for drag force
    const cvxFrame = cursorVX / 60;
    const cvyFrame = cursorVY / 60;

    let i = particles.length;
    while (i--) {
      const p = particles[i];
      p.age += dt;

      if (p.age >= p.life) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }

      /* ── Cursor interaction: repulsion + drag + curl ── */
      const dx = p.x - cursorX;
      const dy = p.y - cursorY;
      const distSq = dx * dx + dy * dy;
      if (distSq < rSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const t = 1 - dist / CURSOR_RADIUS; // 0 at edge, 1 at center
        const nx = dx / dist;
        const ny = dy / dist;

        // Radial repulsion (smooth falloff)
        p.vx += nx * CURSOR_REPUL * t;
        p.vy += ny * CURSOR_REPUL * t;

        // Drag in cursor movement direction
        p.vx += cvxFrame * CURSOR_DRAG_F * t;
        p.vy += cvyFrame * CURSOR_DRAG_F * t;

        // Tangential curl (perpendicular to radius)
        p.vx += -ny * CURSOR_CURL * t;
        p.vy +=  nx * CURSOR_CURL * t;
      }

      // Velocity & rotation damping (dt-corrected)
      p.vx *= velDrag;
      p.vy *= velDrag;
      p.rotationSpeed *= rotDrag;
      p.x  += p.vx * dtRatio;
      p.y  += p.vy * dtRatio;
      p.rotation += p.rotationSpeed * dtRatio;

      // Opacity via fade curve
      const lifeT = p.age / p.life;
      const alpha = p.baseOpacity * fadeCurve(lifeT);
      if (alpha < 0.005) continue;

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
  let holding = false;
  let holdX   = 0;
  let holdY   = 0;

  function startHold(x, y) {
    holding = true;
    holdX = x;
    holdY = y;
    updateCursorVelocity(x, y, 0.016);
    emitAccum = 0;
    emitBurst(x, y, BURST_COUNT);
    ensureLoop();
  }

  function updateCursor(x, y) {
    // Always track cursor position & velocity for physics on existing cubes
    const now = performance.now() / 1000;
    const dt = lastTs ? Math.min(now - lastTs / 1000, 0.05) : 0.016;
    updateCursorVelocity(x, y, dt > 0 ? dt : 0.016);
    // Update emission origin only while holding
    if (holding) {
      holdX = x;
      holdY = y;
    }
    // Ensure loop runs if there are particles to push
    if (particles.length > 0) ensureLoop();
  }

  function endHold() {
    if (!holding) return;
    holding = false;
    emitAccum = 0;
  }

  /* ── Event listeners ── */
  const onPointerDown = (e) => {
    if (e.button !== 0) return; // only primary button
    startHold(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    updateCursor(e.clientX, e.clientY);
    // Safety: if buttons no longer include primary while we think we're holding, stop
    if (holding && (e.buttons & 1) === 0) endHold();
  };
  const onPointerUp     = () => { endHold(); };
  const onPointerCancel = () => { endHold(); };
  const onMouseLeave    = () => { endHold(); cursorX = -9999; cursorY = -9999; prevCurX = -9999; prevCurY = -9999; cursorVX = 0; cursorVY = 0; };

  // Touch fallbacks for browsers that don't fire pointer events on touch
  const onTouchStart = (e) => { const t = e.touches[0]; if (t) startHold(t.clientX, t.clientY); };
  const onTouchMove  = (e) => { const t = e.touches[0]; if (t) updateCursor(t.clientX, t.clientY); };
  const onTouchEnd   = ()  => { endHold(); };

  const onBlur = () => { endHold(); };

  document.addEventListener('pointerdown',   onPointerDown);
  document.addEventListener('pointermove',   onPointerMove);
  document.addEventListener('pointerup',     onPointerUp);
  document.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('mouseleave',    onMouseLeave);
  document.addEventListener('touchstart',    onTouchStart, { passive: true });
  document.addEventListener('touchmove',     onTouchMove,  { passive: true });
  document.addEventListener('touchend',      onTouchEnd);
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
      document.removeEventListener('pointerdown',   onPointerDown);
      document.removeEventListener('pointermove',   onPointerMove);
      document.removeEventListener('pointerup',     onPointerUp);
      document.removeEventListener('pointercancel', onPointerCancel);
      document.removeEventListener('mouseleave',    onMouseLeave);
      document.removeEventListener('touchstart',    onTouchStart);
      document.removeEventListener('touchmove',     onTouchMove);
      document.removeEventListener('touchend',      onTouchEnd);
      particles.length = 0;
      colorCache.clear();
    }
  };
}
