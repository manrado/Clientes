import { qs } from './dom.js';

/**
 * Cosmic Particle System - Isometric Cubes
 *
 * Philosophy:
 * - CLICK: Cursor becomes a cosmic generator, spawning cubes
 * - COLLISION (while clicking): Cubes colliding create explosions, spawning more
 * - NO CLICK: Cursor is a force field, pushing existing cubes away
 * - EDGES: Walls that bounce cubes back into play
 * - LIFE: All cubes degrade over time until they fade into the void
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

  // Configuration - perfected cosmic physics
  const config = {
    maxParticles: 100,
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6', '#38bdf8'],

    // Physics - ultra smooth
    gravity: 0.008,           // Whisper gravity
    friction: 0.9975,         // Near-frictionless glide
    groundFriction: 0.965,    // Silky ground slide
    bounciness: 0.6,          // Springy bounces
    maxVelocity: 8,           // Velocity cap for smoothness

    // Cursor as force field (NO click)
    cursorFieldRadius: 100,   // Generous influence zone
    cursorFieldForce: 0.25,   // Smooth push
    cursorMomentumTransfer: 0.12, // How much cursor momentum transfers

    // Cursor as generator (WITH click)
    spawnRadius: 20,
    clickSpawnCount: 4,
    dragSpawnDistance: 16,

    // Collision explosions (WITH click)
    collisionSpawnChance: 0.35,
    maxCollisionSpawns: 2,
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

      // Initial velocity - silky smooth launch
      if (type === 'dust') {
        const angle = Math.random() * PI2;
        const speed = 0.1 + Math.random() * 0.3;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed - 0.1;
      } else {
        // Elegant radial burst with cursor influence
        const angle = Math.random() * PI2;
        const speed = 0.15 + Math.random() * 0.25;
        this.vx = Math.cos(angle) * speed + mouse.vx * 0.06;
        this.vy = Math.sin(angle) * speed - 0.08 + mouse.vy * 0.06;
      }

      // Easing values for smooth animations
      this.scale = 0.1; // Start small, grow in
      this.targetScale = 1;

      return this;
    }

    update(w, h) {
      // Smooth scale-in animation
      this.scale += (this.targetScale - this.scale) * 0.15;

      // Life decay - graceful fade
      const decay = this.grounded ? this.lifeDecay * 1.4 : this.lifeDecay;
      this.life -= decay;
      if (this.life <= 0) {
        this.active = false;
        return;
      }

      // Scale out when dying
      if (this.life < 0.15) {
        this.targetScale = 0;
      }

      // Gravity - feather-light
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
      // Smooth, natural displacement based on proximity and cursor velocity
      if (mouse.x > 0 && !mouse.isDown) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distSq = dx * dx + dy * dy;
        const radius = config.cursorFieldRadius;

        if (distSq < radius * radius && distSq > 4) {
          const dist = Math.sqrt(distSq);
          const t = 1 - (dist / radius);
          // Smooth cubic falloff for natural feel
          const falloff = t * t * (3 - 2 * t); // Smoothstep

          // Cursor speed influences push strength
          const cursorSpeed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
          const dynamicForce = config.cursorFieldForce * (0.4 + Math.min(cursorSpeed * 0.4, 0.6));
          const force = falloff * dynamicForce;

          const nx = dx / dist;
          const ny = dy / dist;

          // Radial push - smooth and proportional
          this.vx += nx * force * 0.8;
          this.vy += ny * force * 0.8;

          // Inherit cursor momentum for natural flow
          this.vx += mouse.vx * falloff * config.cursorMomentumTransfer;
          this.vy += mouse.vy * falloff * config.cursorMomentumTransfer;

          // Slight rotation boost from interaction
          this.rotationSpeed += falloff * 0.002 * (Math.random() - 0.5);
        }
      }

      // Apply velocity
      this.x += this.vx;
      this.y += this.vy;

      // Boundary collisions - smooth, springy bounces
      const margin = this.size * 0.5;
      this.grounded = false;

      // Side walls - soft elastic bounce
      if (this.x < margin) {
        this.x = margin;
        this.vx = Math.abs(this.vx) * config.bounciness;
        this.rotationSpeed += 0.01; // Spin on impact
      }
      if (this.x > w - margin) {
        this.x = w - margin;
        this.vx = -Math.abs(this.vx) * config.bounciness;
        this.rotationSpeed -= 0.01;
      }

      // Ceiling - gentle absorption
      if (this.y < margin) {
        this.y = margin;
        this.vy = Math.abs(this.vy) * config.bounciness * 0.5;
      }

      // Floor - elegant multi-bounce settle
      if (this.y > h - margin) {
        this.y = h - margin;
        this.vy = -Math.abs(this.vy) * config.bounciness;
        this.vx *= config.groundFriction;
        this.grounded = true;

        // Smooth stop for micro-bounces
        if (Math.abs(this.vy) < 0.05) {
          this.vy = 0;
          this.vx *= 0.97;
          this.rotationSpeed *= 0.9;
        }
      }

      // Smooth rotation with damping
      this.rotationSpeed *= 0.995;
      this.rotation += this.rotationSpeed + this.vx * 0.006;
    }

    draw(ctx) {
      const { x, y, size, isoHeight, colors, life, type, scale } = this;

      // Skip if too small
      if (scale < 0.05) return;

      // Smooth opacity based on life with easing
      const lifeEased = life * life; // Quadratic ease for smoother fade
      ctx.globalAlpha = lifeEased * (type === 'dust' ? 0.4 : 0.85) * Math.min(scale * 1.5, 1);

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
  const pendingSpawns = []; // Queue for collision spawns

  const getParticle = (x, y, color, type, intensity) => {
    const p = pool.length > 0 ? pool.pop() : new Particle();
    return p.init(x, y, color, type, intensity);
  };

  const randomColor = () => config.colors[(Math.random() * config.colors.length) | 0];

  // COSMIC GENERATOR: Spawn explosion on click
  const spawnExplosion = (x, y, count, intensity = 0.5) => {
    const actualCount = Math.min(count, config.maxParticles - active.length);
    for (let i = 0; i < actualCount; i++) {
      const angle = (i / actualCount) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 2 + Math.random() * config.spawnRadius * 0.5;
      active.push(getParticle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        randomColor(),
        'cube',
        intensity + Math.random() * 0.3
      ));
    }
  };

  // Spawn trail while dragging with click
  const trySpawnOnDrag = () => {
    if (!mouse.isDown || mouse.x < 0) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < config.dragSpawnDistance) return;

    // Spawn along path
    const steps = Math.min(Math.ceil(dist / config.dragSpawnDistance), 4);

    for (let i = 0; i < steps && active.length < config.maxParticles; i++) {
      const t = (i + 1) / steps;
      const spawnX = mouse.lastSpawnX + dx * t + (Math.random() - 0.5) * 6;
      const spawnY = mouse.lastSpawnY + dy * t + (Math.random() - 0.5) * 6;

      active.push(getParticle(spawnX, spawnY, randomColor(), 'cube', 0.4));
    }

    mouse.lastSpawnX = mouse.x;
    mouse.lastSpawnY = mouse.y;
  };

  // COLLISION EXPLOSIONS: When clicking, collisions spawn new cubes
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

          // Separation
          const overlap = minDist - dist;
          const separateX = nx * overlap * 0.35;
          const separateY = ny * overlap * 0.35;

          a.x -= separateX;
          a.y -= separateY;
          b.x += separateX;
          b.y += separateY;

          // Momentum exchange
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const impulse = (dvx * nx + dvy * ny) * 0.3;

          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;

          // EXPLOSION: If clicking, collision spawns new cubes
          if (mouse.isDown &&
              Math.abs(impulse) > 0.15 &&
              Math.random() < config.collisionSpawnChance &&
              active.length + pendingSpawns.length < config.maxParticles) {
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2;
            const spawnCount = 1 + Math.floor(Math.random() * config.maxCollisionSpawns);
            pendingSpawns.push({ x: midX, y: midY, count: spawnCount });
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

    // Calculate and smooth cursor velocity for natural feel
    const rawVx = mouse.x - mouse.prevX;
    const rawVy = mouse.y - mouse.prevY;
    smoothVx += (rawVx - smoothVx) * 0.3; // Ease towards raw velocity
    smoothVy += (rawVy - smoothVy) * 0.3;
    mouse.vx = smoothVx;
    mouse.vy = smoothVy;

    // Spawn on drag (with click)
    trySpawnOnDrag();

    // Process pending collision spawns (limit per frame)
    let spawnsThisFrame = 0;
    while (pendingSpawns.length > 0 && active.length < config.maxParticles && spawnsThisFrame < 3) {
      const spawn = pendingSpawns.shift();
      spawnExplosion(spawn.x, spawn.y, spawn.count, 0.25);
      spawnsThisFrame++;
    }
    if (pendingSpawns.length > 5) pendingSpawns.length = 5; // Cap queue

    // Update previous position
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    // Handle collisions
    if (time % 2 === 0) {
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

    // COSMIC EXPLOSION on click
    spawnExplosion(e.clientX, e.clientY, config.clickSpawnCount, 0.5);
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
