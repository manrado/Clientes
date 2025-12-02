import { qs } from './dom.js';

/**
 * Particle canvas with click-triggered isometric cubes.
 * Cubes appear on click, float organically, and fade away gradually.
 * @param {string} selector - Canvas element selector
 * @param {Object} options - Configuration options
 * @param {number} [options.maxParticles=80] - Maximum particles allowed
 * @param {string[]} [options.colors] - Array of hex color strings
 * @param {number} [options.mouseRadius=60] - Interaction radius for agitation
 */
export function initParticleCanvas(selector = '#particle-canvas', options = {}) {
  const canvas = qs(selector);
  if (!canvas) return { stop: () => {} };

  const ctx = canvas.getContext('2d', { alpha: true });
  const PI2 = Math.PI * 2;

  // Canvas resize handler
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Configuration
  const config = {
    maxParticles: Number(options.maxParticles ?? canvas.dataset?.maxParticles ?? 80),
    colors: options.colors ?? (canvas.dataset?.colors?.split(',') ?? ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa']),
    mouseRadius: Number(options.mouseRadius ?? canvas.dataset?.mouseRadius ?? 60),
  };

  // Pre-compute shaded colors for each base color
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

  const mouse = { x: -1000, y: -1000, isDown: false };
  let time = 0;
  let frameCounter = 0;
  let running = true;
  let rafId = null;

  // Utility: shade a hex color
  function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0xff) + amt));
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  // Particle class with pooling support
  class Particle {
    constructor() {
      this.active = false;
    }

    init(x, y, color, isBurst) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.colors = getColorSet(color);
      this.size = 3 + Math.random() * 5;
      this.isoHeight = this.size * 0.5;
      this.life = 1;
      this.active = true;

      // Physics
      this.phase = Math.random() * PI2;
      this.amplitude = 0.05 + Math.random() * 0.2;
      this.frequency = 0.01 + Math.random() * 0.03;

      if (isBurst) {
        const angle = Math.random() * PI2;
        const speed = 1 + Math.random() * 2.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.lifeDecay = 0.012;
      } else {
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2 - 0.3;
        this.lifeDecay = 0.018;
      }
      return this;
    }

    update(w, h, mouseX, mouseY, mouseDown, t) {
      this.life -= this.lifeDecay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Mouse agitation
      if (mouseDown && mouseX > 0) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const distSq = dx * dx + dy * dy;
        const maxDist = config.mouseRadius + this.size;

        if (distSq < maxDist * maxDist && distSq > 0) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / maxDist) * 2;
          const invDist = 1 / dist;
          this.vx += dx * invDist * force;
          this.vy += dy * invDist * force;
        }
      }

      // Damping + oscillation
      this.vx = this.vx * 0.97 + Math.sin(t * this.frequency + this.phase) * this.amplitude * 0.1;
      this.vy = this.vy * 0.97 + Math.cos(t * this.frequency * 0.7 + this.phase) * this.amplitude * 0.05;

      // Boundary bounce
      const s = this.size;
      if (this.x + s > w) { this.x = w - s; this.vx *= -0.5; }
      else if (this.x - s < 0) { this.x = s; this.vx *= -0.5; }
      if (this.y + s > h) { this.y = h - s; this.vy *= -0.5; }
      else if (this.y - s < 0) { this.y = s; this.vy *= -0.5; }

      this.x += this.vx;
      this.y += this.vy;
    }

    draw(ctx) {
      const { x, y, size, isoHeight, colors, life } = this;

      ctx.globalAlpha = life * 0.9;

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

  // Particle pool for object reuse
  const pool = [];
  const active = [];

  const getParticle = (x, y, color, isBurst) => {
    const p = pool.length > 0 ? pool.pop() : new Particle();
    return p.init(x, y, color, isBurst);
  };

  const createBurst = (x, y) => {
    const count = 5 + (Math.random() * 4) | 0;
    for (let i = 0; i < count; i++) {
      const color = config.colors[(Math.random() * config.colors.length) | 0];
      active.push(getParticle(x, y, color, true));
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

    // Generate dust while holding click
    if (mouse.isDown && mouse.x > 0 && ++frameCounter % 8 === 0) {
      const color = config.colors[(Math.random() * config.colors.length) | 0];
      active.push(getParticle(mouse.x, mouse.y, color, false));
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
      p.update(w, h, mouse.x, mouse.y, mouse.isDown, time);

      if (!p.active) {
        active.splice(i, 1);
        pool.push(p);
      } else {
        p.draw(ctx);
      }
    }
  };

  // Event handlers
  const onClick = (e) => createBurst(e.clientX, e.clientY);
  const onMouseMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
  const onMouseDown = (e) => { mouse.isDown = true; mouse.x = e.clientX; mouse.y = e.clientY; };
  const onMouseUp = () => { mouse.isDown = false; };
  const onMouseLeave = () => { mouse.x = -1000; mouse.y = -1000; mouse.isDown = false; };
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
  document.addEventListener('click', onClick);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave);
  document.addEventListener('visibilitychange', onVisibilityChange);

  animate();

  // Cleanup function
  return {
    stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('click', onClick);
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
