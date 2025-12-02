import { qs } from './dom.js';

/**
 * Accounting Duality Particle System - Isometric Cubes
 *
 * Philosophy:
 * - Cubes represent the dual nature of accounting (debit/credit)
 * - Colors inspired by VBA/Excel financial reports
 * - NO generation without click - cubes only spawn on persistent click
 * - While clicking: spawn at cursor position continuously
 * - While clicking + moving: trail follows cursor path
 * - NO particle limit while clicking - unlimited generation
 * - Without click: cursor pushes existing cubes (force field)
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

  // Configuration - VBA/Excel colors, accounting duality
  const config = {
    maxParticles: Infinity,   // NO LIMIT while clicking
    colors: [
      '#1F4E79',              // Excel dark blue (headers)
      '#2E75B6',              // Excel medium blue
      '#5B9BD5',              // Excel light blue
      '#548235',              // Excel green (positive/credit)
      '#70AD47',              // Excel light green
      '#C65911',              // Excel orange (accent)
      '#843C0C',              // Excel dark red/brown
      '#BF8F00',              // Excel gold (totals)
    ],

    // Physics - natural, grounded
    gravity: 0.025,           // Noticeable but gentle gravity
    friction: 0.995,          // Smooth air resistance
    groundFriction: 0.96,     // Floor friction
    bounciness: 0.4,          // Moderate bounces
    maxVelocity: 4,           // Reasonable speed cap

    // Cursor influence (NO click) - push existing cubes
    cursorPushRadius: 80,
    cursorPushForce: 0.25,

    // Spawning (ONLY with click) - at cursor position
    spawnInterval: 50,        // ms between spawns while holding click
    spawnPerTick: 2,          // Cubes per spawn tick
    dragSpawnDistance: 12,    // Pixels moved before trail spawn

    // Cube sizes
    minSize: 4,
    maxSize: 7,
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
    vx: 0,
    vy: 0,
    isDown: false,
    lastSpawnX: -1000,
    lastSpawnY: -1000,
    lastSpawnTime: 0,        // For continuous spawn while holding
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
      this.mass = 0.5 + this.size * 0.05;
      this.lifeDecay = 0.0015 + Math.random() * 0.001;  // Moderate life

      this.isoHeight = this.size * 0.6;
      this.life = 1;
      this.rotation = Math.random() * PI2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.01;

      // Natural initial velocity - gentle spread from cursor
      const angle = Math.random() * PI2;
      const speed = 0.3 + Math.random() * 0.5;
      this.vx = Math.cos(angle) * speed + (mouse.vx || 0) * 0.15;
      this.vy = Math.sin(angle) * speed + (mouse.vy || 0) * 0.15 - 0.3;  // Slight upward

      // Quick appearance animation
      this.scale = 0.3;
      this.targetScale = 1;

      return this;
    }

    update(w, h) {
      // Scale-in animation
      this.scale += (this.targetScale - this.scale) * 0.12;

      // Life decay
      const decay = this.grounded ? this.lifeDecay * 1.5 : this.lifeDecay;
      this.life -= decay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Fade out when dying
      if (this.life < 0.2) {
        this.targetScale = 0;
      }

      // Natural gravity
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

      // Cursor as FORCE FIELD (only when NOT clicking)
      // Push cubes away based on proximity and cursor movement
      if (mouse.x > 0 && !mouse.isDown) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radius = config.cursorPushRadius;

        if (distSq < radius * radius && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / radius);
          const falloff = t * t;  // Quadratic falloff

          // Push based on cursor movement speed
          const cursorSpeed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
          const force = falloff * config.cursorPushForce * (0.5 + cursorSpeed * 0.3);

          const nx = dx / dist;
          const ny = dy / dist;

          // Push away + inherit cursor direction
          this.vx += nx * force + mouse.vx * falloff * 0.15;
          this.vy += ny * force + mouse.vy * falloff * 0.15;
          this.rotationSpeed += force * 0.008;
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

      // Floor - natural landing with bounce
      if (this.y > h - margin) {
        this.y = h - margin;
        this.vy = -Math.abs(this.vy) * config.bounciness;
        this.vx *= config.groundFriction;
        this.grounded = true;

        // Settle when slow enough
        if (Math.abs(this.vy) < 0.1) {
          this.vy = 0;
          this.vx *= 0.98;
        }
      }

      // Natural rotation with damping
      this.rotationSpeed *= 0.995;
      this.rotation += this.rotationSpeed + this.vx * 0.004;
    }

    draw(ctx) {
      const { x, y, size, isoHeight, colors, life, type, scale } = this;

      // Skip if too small
      if (scale < 0.05) return;

      // Corporate opacity - visible but elegant
      const lifeEased = life * life;
      ctx.globalAlpha = lifeEased * 0.85 * Math.min(scale * 1.5, 1);

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

  // Spawn cubes at cursor position while click is held
  const spawnAtCursor = () => {
    if (!mouse.isDown || mouse.x < 0) return;

    const now = performance.now();
    if (now - mouse.lastSpawnTime < config.spawnInterval) return;
    mouse.lastSpawnTime = now;

    // Spawn at exact cursor position with tiny variance
    for (let i = 0; i < config.spawnPerTick; i++) {
      const ox = (Math.random() - 0.5) * 6;
      const oy = (Math.random() - 0.5) * 6;
      active.push(getParticle(
        mouse.x + ox,
        mouse.y + oy,
        randomColor(),
        'cube',
        0.5
      ));
    }
  };

  // Spawn trail while dragging with click held
  const trySpawnOnDrag = () => {
    if (!mouse.isDown || mouse.x < 0) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.dragSpawnDistance) return;

    // Spawn along the path traveled
    const steps = Math.ceil(dist / config.dragSpawnDistance);
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps;
      const px = mouse.lastSpawnX + dx * t;
      const py = mouse.lastSpawnY + dy * t;
      const ox = (Math.random() - 0.5) * 4;
      const oy = (Math.random() - 0.5) * 4;
      active.push(getParticle(px + ox, py + oy, randomColor(), 'cube', 0.5));
    }

    mouse.lastSpawnX = mouse.x;
    mouse.lastSpawnY = mouse.y;
  };

  // Natural collision physics
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

          // Separate overlapping cubes
          const overlap = (minDist - dist) * 0.4;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Natural velocity exchange
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dot = dvx * nx + dvy * ny;

          if (dot > 0) {
            const restitution = 0.3;
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

    // ONLY spawn when clicking - continuous spawn + trail
    if (mouse.isDown) {
      spawnAtCursor();    // Continuous spawn at cursor position
      trySpawnOnDrag();   // Trail when moving
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
    mouse.lastSpawnTime = 0;  // Reset to spawn immediately
    // NO burst - continuous spawn handled in animation loop
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
