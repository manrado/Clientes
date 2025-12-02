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

  // Configuration - refined for aesthetic, natural physics
  const config = {
    maxParticles: 100,
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'],
    // Physics - ultra smooth, floaty feel
    gravity: 0.018,          // Very light gravity for graceful fall
    friction: 0.994,         // Minimal air drag - particles glide
    groundFriction: 0.96,    // Smooth ground sliding
    bounciness: 0.45,        // Lively but elegant bounces
    // Cursor interaction - whisper-soft
    cursorRadius: 35,
    cursorForce: 0.08,
    // Spawning - generous
    minSpawnDistance: 12,
    clickSpawnCount: 4,      // More particles per click
    dragSpawnRate: 0.85,     // Higher spawn chance on drag
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

      // Size based on type - more variety
      if (type === 'dust') {
        this.size = 0.8 + Math.random() * 1.5;
        this.mass = 0.15;
        this.lifeDecay = 0.025 + Math.random() * 0.01;
      } else {
        // Cube - varied sizes for visual interest
        const sizeVariant = Math.random();
        if (sizeVariant < 0.3) {
          this.size = 2.5 + Math.random() * 2; // Small
        } else if (sizeVariant < 0.8) {
          this.size = 4 + Math.random() * 3; // Medium
        } else {
          this.size = 6 + Math.random() * 3; // Large
        }
        this.size += intensity * 1.2;
        this.mass = 0.3 + this.size * 0.025;
        this.lifeDecay = 0.0018 + Math.random() * 0.0012; // Much longer life
      }

      this.isoHeight = this.size * 0.5;
      this.life = 1;
      this.rotation = Math.random() * PI2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.015; // Slow spin

      // Initial velocity - graceful, organic movement
      if (type === 'dust') {
        const angle = Math.random() * PI2;
        const speed = 0.15 + Math.random() * 0.4;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 0.15;
      } else {
        // Soft launch with gentle spread
        const angle = Math.random() * PI2;
        const speed = 0.2 + Math.random() * 0.35;
        this.vx = Math.cos(angle) * speed * 0.6 + mouse.vx * 0.08;
        this.vy = Math.sin(angle) * speed * 0.4 - 0.1 + mouse.vy * 0.08;
      }

      return this;
    }

    update(w, h) {
      // Life decay - graceful fade
      const decay = this.grounded ? this.lifeDecay * 1.5 : this.lifeDecay;
      this.life -= decay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Gravity - smooth acceleration
      this.vy += config.gravity * this.mass;

      // Air friction - silky smooth
      this.vx *= config.friction;
      this.vy *= config.friction;

      // Cursor influence - whisper soft
      if (mouse.x > 0) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radius = config.cursorRadius;

        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / radius);
          const falloff = t * t * t * t; // Quartic - even smoother
          const force = falloff * config.cursorForce;
          const nx = dx / dist;
          const ny = dy / dist;
          this.vx += nx * force * 0.2;
          this.vy += ny * force * 0.2;
        }
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Boundary collisions - elegant, lively bounces
      const margin = this.size * 0.6;
      this.grounded = false;

      // Side walls - playful bounce with slight energy retention
      if (this.x < margin) {
        this.x = margin + (margin - this.x) * 0.3;
        this.vx = Math.abs(this.vx) * config.bounciness;
        this.vy *= 0.98; // Tiny vertical damping
      }
      if (this.x > w - margin) {
        this.x = w - margin - (this.x - (w - margin)) * 0.3;
        this.vx = -Math.abs(this.vx) * config.bounciness;
        this.vy *= 0.98;
      }

      // Ceiling - soft absorption
      if (this.y < margin) {
        this.y = margin;
        this.vy = Math.abs(this.vy) * config.bounciness * 0.4;
      }

      // Floor - elegant settle with multiple small bounces
      if (this.y > h - margin) {
        this.y = h - margin;
        const bounceVy = -Math.abs(this.vy) * config.bounciness;
        this.vy = bounceVy;
        this.vx *= config.groundFriction;
        this.grounded = true;

        // Progressive bounce damping
        if (Math.abs(this.vy) < 0.08) {
          this.vy = 0;
          this.vx *= 0.95;
        }
      }

      // Smooth rotation tied to movement
      this.rotation += this.rotationSpeed + this.vx * 0.008;
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

  // Spawn burst of particles on click
  const spawnOnClick = (x, y) => {
    const count = config.clickSpawnCount + Math.floor(Math.random() * 2);
    for (let i = 0; i < count && active.length < config.maxParticles; i++) {
      // Spread in a small circle
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 3 + Math.random() * 6;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      active.push(getParticle(
        x + offsetX,
        y + offsetY,
        randomColor(),
        'cube',
        0.5 + Math.random() * 0.3
      ));
    }
  };

  // Spawn particles while dragging (flowing trail)
  const trySpawnOnDrag = () => {
    if (!mouse.isDown || mouse.x < 0) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.minSpawnDistance) return;

    // More particles along the path
    const steps = Math.min(Math.ceil(dist / config.minSpawnDistance), 5);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps && active.length < config.maxParticles; i++) {
      const t = (i + 1) / steps;
      const spawnX = mouse.lastSpawnX + dx * t;
      const spawnY = mouse.lastSpawnY + dy * t;

      // Perpendicular spread for ribbon effect
      const perpX = -stepY * 0.15;
      const perpY = stepX * 0.15;
      const offsetX = perpX * (Math.random() - 0.5) * 2 + (Math.random() - 0.5) * 4;
      const offsetY = perpY * (Math.random() - 0.5) * 2 + (Math.random() - 0.5) * 4;

      if (Math.random() < config.dragSpawnRate) {
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
