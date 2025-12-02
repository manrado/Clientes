import { qs } from './dom.js';

/**
 * Cosmic Particle System - Elegant Isometric Cubes
 *
 * Philosophy:
 * - Ethereal, contemplative movement like distant stars
 * - Corporate elegance with muted, sophisticated colors
 * - Minimal gravity - elements float gracefully
 * - Slow, deliberate animations - nothing rushed
 * - Click spawns a gentle emergence, not an explosion
 * - Cursor gently guides existing elements
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

  // Configuration - elegant, cosmic, corporate
  const config = {
    maxParticles: 40,         // Few elements - minimalist
    colors: [
      '#64748b',              // Slate gray
      '#475569',              // Darker slate
      '#94a3b8',              // Light slate
      '#6b7280',              // Cool gray
      '#9ca3af',              // Soft gray
      '#60a5fa',              // Accent blue (subtle)
    ],

    // Physics - ethereal, almost weightless
    gravity: 0.003,           // Near-zero gravity - floating in space
    friction: 0.997,          // Very slow deceleration
    groundFriction: 0.99,     // Glides smoothly
    bounciness: 0.3,          // Soft, muted bounces
    maxVelocity: 1.5,         // Slow, contemplative movement

    // Cursor influence (NO click) - gentle guidance
    cursorPushRadius: 120,    // Wide, soft influence
    cursorPushForce: 0.08,    // Very gentle push

    // Cursor SPAWN (WITH click) - gradual emergence
    clickSpawnCount: 3,       // Few at a time - elegant
    dragSpawnDistance: 40,    // Sparse trail
    dragSpawnCount: 1,        // One at a time

    // Cube sizes - varied for depth
    minSize: 3,
    maxSize: 8,
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

      // Varied sizes for depth perception
      this.size = config.minSize + Math.random() * (config.maxSize - config.minSize);
      this.mass = 0.8 + this.size * 0.02;  // Heavier feel, slower response
      this.lifeDecay = 0.0008 + Math.random() * 0.0004;  // Long life - linger gracefully

      this.isoHeight = this.size * 0.6;
      this.life = 1;
      this.rotation = Math.random() * PI2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.003;  // Very slow rotation

      // Ethereal initial velocity - barely moving, drifting
      const angle = Math.random() * PI2;
      const speed = 0.1 + Math.random() * 0.2;  // Very slow emergence
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 0.05;  // Slight upward drift

      // Slow, graceful scale animation
      this.scale = 0;
      this.targetScale = 1;

      return this;
    }

    update(w, h) {
      // Very slow scale-in animation - graceful materialization
      this.scale += (this.targetScale - this.scale) * 0.04;

      // Life decay - long, contemplative existence
      const decay = this.grounded ? this.lifeDecay * 1.2 : this.lifeDecay;
      this.life -= decay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Slow fade out when dying
      if (this.life < 0.25) {
        this.targetScale = 0;
      }

      // Almost no gravity - floating in cosmic space
      this.vy += config.gravity * this.mass;

      // Air friction - silky smooth
      this.vx *= config.friction;
      this.vy *= config.friction;

      // Velocity cap for smooth movement
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > config.maxVelocity) {
        const scale = config.maxVelocity / speed;
        this.vx *= scale;
        this.vy *= scale;
      }

      // Cursor as GENTLE GUIDE (only when NOT clicking)
      // Soft, magnetic-like influence - elements drift around cursor
      if (mouse.x > 0 && !mouse.isDown) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radius = config.cursorPushRadius;

        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / radius);
          // Cubic falloff for softer, more organic feel
          const falloff = t * t * t;

          // Very gentle push - like a soft breeze
          const force = falloff * config.cursorPushForce;

          const nx = dx / dist;
          const ny = dy / dist;

          // Subtle push + slight orbital tendency
          this.vx += nx * force;
          this.vy += ny * force;

          // Add slight perpendicular drift for orbital feel
          this.vx += -ny * force * 0.3;
          this.vy += nx * force * 0.3;

          this.rotationSpeed += force * 0.002;  // Barely perceptible spin
        }
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Boundary collisions - smooth, springy bounces
      const margin = this.size * 0.5;
      this.grounded = false;

      // Side walls - soft, almost invisible interaction
      if (this.x < margin) {
        this.x = margin;
        this.vx = Math.abs(this.vx) * config.bounciness;
      }
      if (this.x > w - margin) {
        this.x = w - margin;
        this.vx = -Math.abs(this.vx) * config.bounciness;
      }

      // Ceiling - gentle redirection
      if (this.y < margin) {
        this.y = margin;
        this.vy = Math.abs(this.vy) * config.bounciness * 0.3;
      }

      // Floor - soft landing, then continue drifting
      if (this.y > h - margin) {
        this.y = h - margin;
        this.vy = -Math.abs(this.vy) * config.bounciness;
        this.vx *= config.groundFriction;
        this.grounded = true;

        // Quick settle - no bouncing, just glide
        if (Math.abs(this.vy) < 0.02) {
          this.vy = 0;
          // Continue horizontal drift slowly
        }
      }

      // Very slow rotation - contemplative, not chaotic
      this.rotationSpeed *= 0.998;
      this.rotation += this.rotationSpeed + this.vx * 0.001;
    }

    draw(ctx) {
      const { x, y, size, isoHeight, colors, life, type, scale } = this;

      // Skip if too small
      if (scale < 0.05) return;

      // Elegant opacity - more transparent, ethereal presence
      const lifeEased = Math.pow(life, 1.5);  // Gentler curve
      ctx.globalAlpha = lifeEased * 0.6 * Math.min(scale * 2, 1);  // More transparent overall

      // Scaled size for smooth appear/disappear
      const s = size * scale;
      const ih = isoHeight * scale;

      // Top face
      ctx.fillStyle = colors.top;
      ctx.beginPath();
      ctx.moveTo(x, y - ih);
      ctx.lineTo(x + s, y);
      ctx.lineTo(x, y + ih);
      ctx.lineTo(x - s, y);
      ctx.fill();

      // Left face
      ctx.fillStyle = colors.left;
      ctx.beginPath();
      ctx.moveTo(x - s, y);
      ctx.lineTo(x, y + ih);
      ctx.lineTo(x, y + ih + s);
      ctx.lineTo(x - s, y + s);
      ctx.fill();

      // Right face
      ctx.fillStyle = colors.right;
      ctx.beginPath();
      ctx.moveTo(x + s, y);
      ctx.lineTo(x, y + ih);
      ctx.lineTo(x, y + ih + s);
      ctx.lineTo(x + s, y + s);
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

  // Spawn emergence on click - gentle, not explosive
  const spawnBurst = (x, y, count) => {
    for (let i = 0; i < count && active.length < config.maxParticles; i++) {
      // Staggered spawn positions - natural cluster
      const angle = (i / count) * PI2 + Math.random() * 0.5;
      const r = 5 + Math.random() * 15;  // Wider, softer spread
      active.push(getParticle(
        x + Math.cos(angle) * r,
        y + Math.sin(angle) * r,
        randomColor(),
        'cube',
        0.3  // Lower intensity
      ));
    }
  };

  // Spawn sparse trail while dragging - deliberate, not frantic
  const trySpawnOnDrag = () => {
    if (!mouse.isDown || mouse.x < 0) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.dragSpawnDistance) return;

    // Single spawn at cursor position - minimal, elegant
    if (active.length < config.maxParticles) {
      const ox = (Math.random() - 0.5) * 10;
      const oy = (Math.random() - 0.5) * 10;
      active.push(getParticle(mouse.x + ox, mouse.y + oy, randomColor(), 'cube', 0.3));
    }

    mouse.lastSpawnX = mouse.x;
    mouse.lastSpawnY = mouse.y;
  };

  // Simple collision - just physics, no spawning
  const handleCollisions = () => {
    const len = active.length;

    for (let i = 0; i < len; i++) {
      const a = active[i];
      if (!a.active) continue;

      for (let j = i + 1; j < len; j++) {
        const b = active[j];
        if (!b.active) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = (a.size + b.size) * 0.5;

        if (distSq < minDist * minDist && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Gentle separation - no harsh bouncing
          const overlap = (minDist - dist) * 0.3;  // Softer separation
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Very soft velocity exchange - like clouds passing
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dot = dvx * nx + dvy * ny;

          if (dot > 0) {
            const restitution = 0.15;  // Much softer interaction
            a.vx -= dot * nx * restitution;
            a.vy -= dot * ny * restitution;
            b.vx += dot * nx * restitution;
            b.vy += dot * ny * restitution;
          }
        }
      }
    }
  };

  // Smoothed cursor velocity
  let smoothVx = 0;
  let smoothVy = 0;

  // Animation loop
  const animate = () => {
    if (!running) return;
    rafId = requestAnimationFrame(animate);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    time++;

    // Smooth cursor velocity
    const rawVx = mouse.x - mouse.prevX;
    const rawVy = mouse.y - mouse.prevY;
    smoothVx += (rawVx - smoothVx) * 0.4;
    smoothVy += (rawVy - smoothVy) * 0.4;
    mouse.vx = smoothVx;
    mouse.vy = smoothVy;

    // Only spawn when clicking
    if (mouse.isDown) {
      trySpawnOnDrag();
    }

    // Update previous position
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    // Collisions every frame for smooth physics
    handleCollisions();

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

    // Spawn burst on click
    spawnBurst(e.clientX, e.clientY, config.clickSpawnCount);
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

  // Attach listeners
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
