import { qs } from './dom.js';

/**
 * Particle canvas with physics-based isometric cubes.
 * Cubes spawn ONLY while mouse is pressed AND moving.
 * Particles are affected by gravity, cursor influence, and collisions.
 * They bounce off walls, pile up, and fade naturally.
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

  // Configuration
  const config = {
    maxParticles: 80,
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa'],
    gravity: 0.05,           // Gentle gravity pulling down
    friction: 0.992,         // Air resistance (higher = less drag)
    groundFriction: 0.88,    // Friction when touching ground
    bounciness: 0.35,        // How bouncy walls are
    cursorRadius: 60,        // Cursor influence radius
    cursorForce: 0.4,        // How strongly cursor pushes particles
    minSpawnDistance: 15,    // Min distance to spawn new particle
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
        this.mass = 0.3;
        this.lifeDecay = 0.04 + Math.random() * 0.02;
      } else if (type === 'spark') {
        this.size = 2 + Math.random() * 2.5;
        this.mass = 0.5;
        this.lifeDecay = 0.03;
      } else {
        // Cube - main particle
        this.size = 4 + Math.random() * 4 + intensity * 2;
        this.mass = 0.8 + this.size * 0.05;
        this.lifeDecay = 0.004 + Math.random() * 0.003;
      }

      this.isoHeight = this.size * 0.5;
      this.life = 1;
      this.rotation = Math.random() * PI2;

      // Initial velocity - inherit some cursor momentum
      if (type === 'dust') {
        const angle = Math.random() * PI2;
        const speed = 0.3 + Math.random() * 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 0.3;
      } else if (type === 'spark') {
        const angle = Math.random() * PI2;
        const speed = 0.8 + Math.random() * 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 0.5;
      } else {
        // Inherit cursor velocity with gentle spread
        this.vx = mouse.vx * 0.2 + (Math.random() - 0.5) * 0.8;
        this.vy = mouse.vy * 0.2 + (Math.random() - 0.5) * 0.8 - 0.3;
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

      // Cursor influence - gently push particles when cursor passes near
      if (mouse.x > 0) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radius = config.cursorRadius;

        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq);
          // Smooth falloff - stronger near center
          const falloff = 1 - (dist / radius);
          const force = falloff * falloff * config.cursorForce;
          const nx = dx / dist;
          const ny = dy / dist;

          // Push away from cursor smoothly
          this.vx += nx * force * 0.5;
          this.vy += ny * force * 0.5;

          // Add fraction of cursor's momentum
          this.vx += mouse.vx * force * 0.15;
          this.vy += mouse.vy * force * 0.15;
        }
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Boundary collisions - keep particles inside with soft bounces
      const margin = this.size * 0.8;
      this.grounded = false;

      // Left wall
      if (this.x < margin) {
        this.x = margin;
        this.vx = Math.abs(this.vx) * config.bounciness;
        this.vx = Math.min(this.vx, 2); // Limit max bounce velocity
      }
      // Right wall
      if (this.x > w - margin) {
        this.x = w - margin;
        this.vx = -Math.abs(this.vx) * config.bounciness;
        this.vx = Math.max(this.vx, -2);
      }
      // Ceiling
      if (this.y < margin) {
        this.y = margin;
        this.vy = Math.abs(this.vy) * config.bounciness;
      }
      // Floor - particles settle and pile up here
      if (this.y > h - margin) {
        this.y = h - margin;
        this.vy = -Math.abs(this.vy) * config.bounciness;
        this.vx *= config.groundFriction;
        this.grounded = true;

        // Stop micro-bounces
        if (Math.abs(this.vy) < 0.3) {
          this.vy = 0;
        }
      }

      // Subtle rotation based on velocity
      this.rotation += (this.vx + this.vy) * 0.02;
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

  // Spawn particles ONLY when click is held AND cursor is moving
  const trySpawnParticle = () => {
    // CRITICAL: Only spawn when mouse is actively pressed
    if (!mouse.isDown || mouse.x < 0) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // MUST have movement to spawn - no spawning while stationary
    if (dist < config.minSpawnDistance) {
      return; // No spawn without movement
    }

    // Interpolate spawn positions along the path
    const steps = Math.ceil(dist / config.minSpawnDistance);
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 0; i < steps && active.length < config.maxParticles; i++) {
      const spawnX = mouse.lastSpawnX + stepX * (i + 1);
      const spawnY = mouse.lastSpawnY + stepY * (i + 1);

      // Add slight randomness to position
      const offsetX = (Math.random() - 0.5) * 6;
      const offsetY = (Math.random() - 0.5) * 6;

      // Spawn with probability for natural distribution
      if (Math.random() < 0.6) {
        active.push(getParticle(
          spawnX + offsetX,
          spawnY + offsetY,
          randomColor(),
          'cube',
          0.5
        ));
      }
    }

    mouse.lastSpawnX = mouse.x;
    mouse.lastSpawnY = mouse.y;
  };

  // Create spark burst on quick click
  const createSpark = (x, y) => {
    const count = 3 + (Math.random() * 4) | 0;
    for (let i = 0; i < count && active.length < config.maxParticles; i++) {
      active.push(getParticle(x, y, randomColor(), 'spark', 0.5));
    }
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
        const minDist = (a.size + b.size) * 0.6;

        if (distSq < minDist * minDist && distSq > 0.1) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Separate particles
          const overlap = minDist - dist;
          const separateX = nx * overlap * 0.5;
          const separateY = ny * overlap * 0.5;

          a.x -= separateX;
          a.y -= separateY;
          b.x += separateX;
          b.y += separateY;

          // Exchange momentum (soft collision)
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const impulse = (dvx * nx + dvy * ny) * 0.4;

          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;

          // Spawn dust on significant collision
          if (Math.abs(impulse) > 0.5 && active.length < config.maxParticles - 1) {
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            active.push(getParticle(midX, midY, randomColor(), 'dust', 0.2));
          }
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

    // Calculate cursor velocity
    mouse.vx = (mouse.x - mouse.prevX) * 0.5;
    mouse.vy = (mouse.y - mouse.prevY) * 0.5;

    // Try to spawn particles (only if clicking and moving)
    trySpawnParticle();

    // Update previous position
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    // Handle collisions (throttled for performance)
    if (time % 3 === 0) {
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
    clickStart = Date.now();
  };

  const onMouseUp = (e) => {
    const clickDuration = Date.now() - clickStart;

    // Quick click (< 150ms) creates a spark burst
    if (clickDuration < 150 && mouse.x > 0) {
      createSpark(mouse.x, mouse.y);
    }

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
