import { qs } from './dom.js';

/**
 * Particle canvas with physics-based isometric cubes.
 * - Single click: spawns a few particles
 * - Click + drag: spawns trail of particles
 * - No click: particles fall naturally and fade
 * Physics: gentle gravity, soft bounces, subtle cursor influence
 */
export function initParticleCanvas(selector = '#particle-canvas') {
  const canvas = qs(selector);
  if (!canvas) return { stop: () => {} };

  const ctx = canvas.getContext('2d', { alpha: true });
  const PI2 = Math.PI * 2;

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Configuration - tuned for natural, subtle physics
  const config = {
    maxParticles: 60,
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'],
    // Physics - softer, more organic feel
    gravity: 0.025,          // Very gentle gravity (was 0.05)
    friction: 0.988,         // Slightly more air drag for floaty feel
    groundFriction: 0.92,    // Less abrupt ground stopping
    bounciness: 0.25,        // Softer bounces (was 0.35)
    // Cursor interaction - subtle influence
    cursorRadius: 45,        // Smaller influence zone
    cursorForce: 0.15,       // Much gentler push (was 0.4)
    // Spawning
    minSpawnDistance: 18,    // Slightly more spacing
    clickSpawnCount: 2,      // Particles per single click
  };

  // Pre-compute shaded colors
  const colorCache = new Map();
  const getColorSet = (color) => {
    if (!colorCache.has(color)) {
      colorCache.set(color, {
        top: color,
        left: shadeColor(color, -25),
        right: shadeColor(color, 15),
      });
    }
    return colorCache.get(color);
  };

  function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0xff) + amt));
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  // Mouse state - tracks click, position, and movement
  const mouse = {
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    vx: 0,                   // Cursor velocity for physics
    vy: 0,
    isDown: false,
    lastSpawnX: -1000,
    lastSpawnY: -1000,
  };

  let time = 0;
  let running = true;
  let rafId = null;

  // Particle class with realistic physics
  class Particle {
    constructor() {
      this.active = false;
    }

    init(x, y, color, type = 'cube', intensity = 1) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.colors = getColorSet(color);
      this.type = type;
      this.active = true;
      this.grounded = false;

      // Size based on type
      if (type === 'dust') {
        this.size = 1 + Math.random() * 2;
        this.mass = 0.2;
        this.lifeDecay = 0.035 + Math.random() * 0.015;
      } else {
        // Cube - main particle with varied sizes
        this.size = 3.5 + Math.random() * 3.5 + intensity * 1.5;
        this.mass = 0.5 + this.size * 0.03;
        this.lifeDecay = 0.003 + Math.random() * 0.002; // Longer life
      }

      this.isoHeight = this.size * 0.5;
      this.life = 1;
      this.rotation = Math.random() * PI2;

      // Initial velocity - natural, organic spread
      if (type === 'dust') {
        const angle = Math.random() * PI2;
        const speed = 0.2 + Math.random() * 0.6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 0.2;
      } else {
        // Gentle initial velocity with slight upward bias
        const spread = 0.4 + Math.random() * 0.3;
        this.vx = (Math.random() - 0.5) * spread + mouse.vx * 0.1;
        this.vy = (Math.random() - 0.5) * spread - 0.15 + mouse.vy * 0.1;
      }

      return this;
    }

    update(w, h) {
      // Life decay - slightly faster when grounded
      const decay = this.grounded ? this.lifeDecay * 1.3 : this.lifeDecay;
      this.life -= decay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Gravity
      this.vy += config.gravity * this.mass;

      // Air friction
      this.vx *= config.friction;
      this.vy *= config.friction;

      // Cursor influence - very subtle, natural displacement
      if (mouse.x > 0) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radius = config.cursorRadius;

        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq);
          // Cubic falloff for smoother transition
          const t = 1 - (dist / radius);
          const falloff = t * t * t;
          const force = falloff * config.cursorForce;
          const nx = dx / dist;
          const ny = dy / dist;

          // Gentle displacement away from cursor
          this.vx += nx * force * 0.3;
          this.vy += ny * force * 0.3;
        }
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Boundary collisions - soft, natural bounces
      const margin = this.size * 0.7;
      this.grounded = false;

      // Left wall - gentle bounce
      if (this.x < margin) {
        this.x = margin;
        this.vx = Math.abs(this.vx) * config.bounciness;
      }
      // Right wall
      if (this.x > w - margin) {
        this.x = w - margin;
        this.vx = -Math.abs(this.vx) * config.bounciness;
      }
      // Ceiling - very soft
      if (this.y < margin) {
        this.y = margin;
        this.vy = Math.abs(this.vy) * config.bounciness * 0.5;
      }
      // Floor - particles settle naturally
      if (this.y > h - margin) {
        this.y = h - margin;
        this.vy = -Math.abs(this.vy) * config.bounciness;
        this.vx *= config.groundFriction;
        this.grounded = true;

        // Stop micro-bounces smoothly
        if (Math.abs(this.vy) < 0.15) {
          this.vy = 0;
        }
      }

      // Very subtle rotation based on horizontal velocity only
      this.rotation += this.vx * 0.01;
    }

    draw(ctx) {
      const { x, y, size, isoHeight, colors, life, type } = this;

      ctx.globalAlpha = life * (type === 'dust' ? 0.5 : 0.85);

      // Top face
      ctx.fillStyle = colors.top;
      ctx.beginPath();
      ctx.moveTo(x, y - isoHeight);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x - size, y);
      ctx.fill();

      // Left face
      ctx.fillStyle = colors.left;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x, y + isoHeight + size);
      ctx.lineTo(x - size, y + size);
      ctx.fill();

      // Right face
      ctx.fillStyle = colors.right;
      ctx.beginPath();
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x, y + isoHeight + size);
      ctx.lineTo(x + size, y + size);
      ctx.fill();
    }
  }

  // Particle management
  const pool = [];
  const active = [];

  const getParticle = (x, y, color, type, intensity) => {
    const p = pool.length > 0 ? pool.pop() : new Particle();
    return p.init(x, y, color, type, intensity);
  };

  const randomColor = () => config.colors[(Math.random() * config.colors.length) | 0];

  // Spawn particles on click (initial) or while dragging (trail)
  const spawnOnClick = (x, y) => {
    if (active.length >= config.maxParticles) return;

    const count = config.clickSpawnCount;
    for (let i = 0; i < count && active.length < config.maxParticles; i++) {
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetY = (Math.random() - 0.5) * 8;
      active.push(getParticle(
        x + offsetX,
        y + offsetY,
        randomColor(),
        'cube',
        0.6
      ));
    }
  };

  // Spawn particles while dragging (movement trail)
  const trySpawnOnDrag = () => {
    if (!mouse.isDown || mouse.x < 0) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Need movement to spawn trail
    if (dist < config.minSpawnDistance) return;

    // Spawn along the path with natural spacing
    const steps = Math.min(Math.ceil(dist / config.minSpawnDistance), 3);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps && active.length < config.maxParticles; i++) {
      const spawnX = mouse.lastSpawnX + stepX * (i + 1);
      const spawnY = mouse.lastSpawnY + stepY * (i + 1);

      // Natural randomness
      const offsetX = (Math.random() - 0.5) * 5;
      const offsetY = (Math.random() - 0.5) * 5;

      // Spawn with slight probability variation
      if (Math.random() < 0.7) {
        active.push(getParticle(
          spawnX + offsetX,
          spawnY + offsetY,
          randomColor(),
          'cube',
          0.4
        ));
      }
    }

    mouse.lastSpawnX = mouse.x;
    mouse.lastSpawnY = mouse.y;
  };

  // Particle-to-particle collisions
  const handleCollisions = () => {
    const len = active.length;
    for (let i = 0; i < len; i++) {
      const a = active[i];
      if (!a.active || a.type === 'dust') continue;

      for (let j = i + 1; j < len; j++) {
        const b = active[j];
        if (!b.active || b.type === 'dust') continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = (a.size + b.size) * 0.55;

        if (distSq < minDist * minDist && distSq > 0.1) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Gentle separation
          const overlap = minDist - dist;
          const separateX = nx * overlap * 0.3;
          const separateY = ny * overlap * 0.3;

          a.x -= separateX;
          a.y -= separateY;
          b.x += separateX;
          b.y += separateY;

          // Soft momentum exchange
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const impulse = (dvx * nx + dvy * ny) * 0.25;

          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }
  };

  // Animation loop
  const animate = () => {
    if (!running) return;
    rafId = requestAnimationFrame(animate);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    time++;

    // Calculate cursor velocity (smoothed)
    mouse.vx = (mouse.x - mouse.prevX) * 0.4;
    mouse.vy = (mouse.y - mouse.prevY) * 0.4;

    // Spawn particles on drag (only if clicking and moving)
    trySpawnOnDrag();

    // Update previous position
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    // Handle collisions (throttled for performance)
    if (time % 4 === 0) {
      handleCollisions();
    }

    // Update and draw particles
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.update(w, h);

      if (!p.active) {
        active.splice(i, 1);
        pool.push(p);
      } else {
        p.draw(ctx);
      }
    }
  };

  const onMouseDown = (e) => {
    mouse.isDown = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.prevX = e.clientX;
    mouse.prevY = e.clientY;
    mouse.lastSpawnX = e.clientX;
    mouse.lastSpawnY = e.clientY;

    // Spawn initial particles on click
    spawnOnClick(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    mouse.isDown = false;
  };

  const onMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const onMouseLeave = () => {
    mouse.x = -1000;
    mouse.y = -1000;
    mouse.isDown = false;
  };

  const onBlur = () => {
    mouse.isDown = false;
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      mouse.isDown = false;
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!running) {
      running = true;
      animate();
    }
  };

  // Attach listeners - use window for mouseup to catch releases outside document
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);

  animate();

  return {
    stop() {
      running = false;
      mouse.isDown = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', resizeCanvas);
      active.length = 0;
      pool.length = 0;
      colorCache.clear();
    }
  };
}
