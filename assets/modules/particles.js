import { qs } from './dom.js';

/**
 * Particle canvas with cursor-traced isometric cubes.
 * Cubes spawn along the cursor path while mouse is pressed.
 * Intensity depends on cursor dwell time at each position.
 * Particles interact and create dust when colliding.
 */
export function initParticleCanvas(selector = '#particle-canvas', options = {}) {
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

  // Configuration
  const config = {
    maxParticles: 120,
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'],
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

  // Mouse state with path tracking
  const mouse = {
    x: -1000,
    y: -1000,
    prevX: -1000,
    prevY: -1000,
    isDown: false,
    dwellTime: 0,        // How long cursor stays in same area
    lastSpawnX: -1000,
    lastSpawnY: -1000,
  };

  let time = 0;
  let running = true;
  let rafId = null;

  // Particle types: 'cube' (main), 'dust' (collision effect), 'spark' (quick click)
  class Particle {
    constructor() {
      this.active = false;
    }

    init(x, y, color, type, intensity = 1) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.colors = getColorSet(color);
      this.type = type;
      this.active = true;

      // Size varies by type and intensity
      if (type === 'dust') {
        this.size = 1.5 + Math.random() * 2;
        this.lifeDecay = 0.03 + Math.random() * 0.02;
      } else if (type === 'spark') {
        this.size = 2 + Math.random() * 3;
        this.lifeDecay = 0.025;
      } else {
        // cube - size influenced by intensity (dwell time)
        this.size = 3 + Math.random() * 4 + intensity * 2;
        this.lifeDecay = 0.008 + (1 - intensity * 0.5) * 0.01;
      }

      this.isoHeight = this.size * 0.5;
      this.life = 1;

      // Physics
      this.phase = Math.random() * PI2;
      this.amplitude = 0.05 + Math.random() * 0.15;
      this.frequency = 0.01 + Math.random() * 0.02;

      if (type === 'dust') {
        // Dust spreads outward from collision
        const angle = Math.random() * PI2;
        const speed = 0.5 + Math.random() * 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      } else if (type === 'spark') {
        // Quick burst on click
        const angle = Math.random() * PI2;
        const speed = 1.5 + Math.random() * 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      } else {
        // Cubes float gently upward
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = -0.2 - Math.random() * 0.5;
      }

      return this;
    }

    update(w, h, t) {
      this.life -= this.lifeDecay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Organic oscillation
      const osc = Math.sin(t * this.frequency + this.phase) * this.amplitude;
      this.vx = this.vx * 0.98 + osc * 0.05;
      this.vy = this.vy * 0.98 + Math.cos(t * this.frequency * 0.7 + this.phase) * this.amplitude * 0.03;

      // Soft boundaries
      const s = this.size;
      if (this.x + s > w) { this.x = w - s; this.vx *= -0.3; }
      else if (this.x - s < 0) { this.x = s; this.vx *= -0.3; }
      if (this.y + s > h) { this.y = h - s; this.vy *= -0.3; }
      else if (this.y - s < 0) { this.y = s; this.vy *= -0.3; }

      this.x += this.vx;
      this.y += this.vy;
    }

    draw(ctx) {
      const { x, y, size, isoHeight, colors, life, type } = this;

      ctx.globalAlpha = life * (type === 'dust' ? 0.6 : 0.9);

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

  // Spawn cubes along cursor path with interpolation
  const spawnAlongPath = (x1, y1, x2, y2, intensity) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      // Cursor stationary - spawn at position with higher intensity
      if (Math.random() < 0.3 + intensity * 0.4) {
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;
        active.push(getParticle(x2 + offsetX, y2 + offsetY, randomColor(), 'cube', intensity));
      }
      return;
    }

    // Interpolate along the path
    const step = Math.max(8, 20 - intensity * 10); // Denser spawn with more intensity
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;

      // Probability influenced by intensity
      if (Math.random() < 0.4 + intensity * 0.3) {
        const offsetX = (Math.random() - 0.5) * 6;
        const offsetY = (Math.random() - 0.5) * 6;
        active.push(getParticle(px + offsetX, py + offsetY, randomColor(), 'cube', intensity * 0.7));
      }
    }
  };

  // Create spark burst on quick click
  const createSpark = (x, y) => {
    const count = 3 + (Math.random() * 3) | 0;
    for (let i = 0; i < count; i++) {
      active.push(getParticle(x, y, randomColor(), 'spark', 0.5));
    }
  };

  // Check for particle collisions and spawn dust
  const checkCollisions = () => {
    const len = active.length;
    for (let i = 0; i < len; i++) {
      const a = active[i];
      if (!a.active || a.type === 'dust') continue;

      for (let j = i + 1; j < len; j++) {
        const b = active[j];
        if (!b.active || b.type === 'dust') continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const minDist = (a.size + b.size) * 0.8;

        if (distSq < minDist * minDist && distSq > 0) {
          // Collision detected - spawn dust
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;

          if (active.length < config.maxParticles - 2) {
            active.push(getParticle(midX, midY, randomColor(), 'dust', 0.3));
          }

          // Push particles apart
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          const push = 0.3;
          a.vx += nx * push;
          a.vy += ny * push;
          b.vx -= nx * push;
          b.vy -= ny * push;
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

    // Spawn particles along cursor path while mouse is down
    if (mouse.isDown && mouse.x > 0) {
      // Calculate dwell time (how long cursor stays in same area)
      const moveDist = Math.sqrt(
        (mouse.x - mouse.lastSpawnX) ** 2 +
        (mouse.y - mouse.lastSpawnY) ** 2
      );

      if (moveDist < 5) {
        mouse.dwellTime = Math.min(mouse.dwellTime + 0.02, 1);
      } else {
        mouse.dwellTime = Math.max(mouse.dwellTime - 0.05, 0.1);
      }

      // Spawn along path from previous to current position
      if (time % 2 === 0) { // Every 2 frames
        spawnAlongPath(mouse.prevX, mouse.prevY, mouse.x, mouse.y, mouse.dwellTime);
        mouse.lastSpawnX = mouse.x;
        mouse.lastSpawnY = mouse.y;
      }
    }

    // Update previous position
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    // Collision detection (throttled)
    if (time % 5 === 0) {
      checkCollisions();
    }

    // Enforce particle limit
    while (active.length > config.maxParticles) {
      const removed = active.shift();
      removed.active = false;
      pool.push(removed);
    }

    // Update and draw
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.update(w, h, time);

      if (!p.active) {
        active.splice(i, 1);
        pool.push(p);
      } else {
        p.draw(ctx);
      }
    }
  };

  // Track click duration for spark vs trail
  let clickStart = 0;

  const onMouseDown = (e) => {
    mouse.isDown = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.prevX = e.clientX;
    mouse.prevY = e.clientY;
    mouse.lastSpawnX = e.clientX;
    mouse.lastSpawnY = e.clientY;
    mouse.dwellTime = 0.2;
    clickStart = Date.now();
  };

  const onMouseUp = (e) => {
    const clickDuration = Date.now() - clickStart;

    // Quick click (< 150ms) creates a spark burst
    if (clickDuration < 150 && mouse.x > 0) {
      createSpark(mouse.x, mouse.y);
    }

    mouse.isDown = false;
    mouse.dwellTime = 0;
  };

  const onMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const onMouseLeave = () => {
    mouse.x = -1000;
    mouse.y = -1000;
    mouse.isDown = false;
    mouse.dwellTime = 0;
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!running) {
      running = true;
      animate();
    }
  };

  // Attach listeners
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('visibilitychange', onVisibilityChange);

  animate();

  return {
    stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', resizeCanvas);
      active.length = 0;
      pool.length = 0;
      colorCache.clear();
    }
  };
}
