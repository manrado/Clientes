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

  // Detect mobile for performance optimization
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window);

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Configuration - Professional vibrant colors, engaging interaction
  const config = {
    maxParticles: isMobile ? 120 : 250,  // Balanced for performance
    colors: [
      '#60a5fa',              // Brand accent blue (primary)
      '#3b82f6',              // Vivid blue
      '#2563eb',              // Deep blue
      '#10b981',              // Emerald green (success/credit)
      '#059669',              // Deep emerald
      '#f59e0b',              // Amber gold (highlights)
      '#8b5cf6',              // Violet accent
      '#06b6d4',              // Cyan accent
    ],

    // Physics - smooth, professional, harmonious
    gravity: 0.02,            // Gentle gravity
    friction: 0.994,          // Smooth deceleration
    groundFriction: 0.9,      // Natural floor slide
    bounciness: 0.45,         // Subtle bounces
    maxVelocity: 5,           // Controlled movement

    // Cursor influence (NO click) - push existing cubes
    cursorPushRadius: 90,
    cursorPushForce: 0.35,

    // Spawning (ONLY with click) - at cursor position
    spawnInterval: isMobile ? 45 : 30,
    spawnPerTick: 1,
    dragSpawnDistance: isMobile ? 10 : 6,

    // Cube sizes - MORE VARIED for visual depth
    minSize: 3,               // Smaller minimum
    maxSize: 12,              // Larger maximum
    sizeDistribution: 0.6,    // Bias toward smaller cubes (0-1)

    // Life settings
    groundedLifeMultiplier: 2.5,

    // Spatial grid for collision optimization
    gridCellSize: 25,         // Size of each grid cell
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
    clickStartTime: 0,       // When mousedown occurred (prevents ghost spawns)
    lastSpawnX: -1000,
    lastSpawnY: -1000,
    lastSpawnTime: 0,        // For continuous spawn while holding
  };

  // Helper to verify click is PHYSICALLY active
  const isClickActive = () => {
    // Must have explicit mousedown event recorded
    if (mouse.isDown !== true) return false;
    if (mouse.clickStartTime <= 0) return false;
    // Timeout safety (prevents zombie states)
    if ((performance.now() - mouse.clickStartTime) > 30000) {
      resetMouseState();
      return false;
    }
    return true;
  };

  // Helper to check if element is interactive (should not spawn particles)
  const isInteractiveElement = (element) => {
    if (!element) return false;
    const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'NAV', 'HEADER', 'FOOTER'];
    const interactiveRoles = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'navigation'];
    const interactiveClasses = ['btn', 'button', 'fab-contact', 'nav', 'menu', 'brand', 'tag', 'card', 'hero-login'];

    // Check the element and its ancestors (fast checks only)
    let el = element;
    while (el && el !== document.body) {
      if (interactiveTags.includes(el.tagName)) return true;
      const role = el.getAttribute?.('role');
      if (role && interactiveRoles.includes(role)) return true;
      // Check multiple classes at once
      if (el.classList) {
        for (const cls of interactiveClasses) {
          if (el.classList.contains(cls)) return true;
        }
      }
      if (el.hasAttribute?.('data-cta')) return true;
      if (el.hasAttribute?.('href')) return true;
      el = el.parentElement;
    }
    return false;
  };

  let running = true;
  let rafId = null;

  // Particle class with realistic physics
  class Particle {
    constructor() {
      this.active = false;
    }

    init(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.colors = getColorSet(color);
      this.active = true;
      this.grounded = false;

      // Varied sizes with bias toward smaller cubes (more natural distribution)
      const sizeRand = Math.pow(Math.random(), config.sizeDistribution);
      this.size = config.minSize + sizeRand * (config.maxSize - config.minSize);
      this.mass = 0.3 + this.size * 0.08;  // Mass scales with size

      // Smaller cubes live longer, larger fade faster
      const sizeRatio = (this.size - config.minSize) / (config.maxSize - config.minSize);
      this.lifeDecay = 0.001 + sizeRatio * 0.002;

      this.isoHeight = this.size * 0.55;
      this.life = 1;
      this.rotation = Math.random() * PI2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.015 * (1 - sizeRatio * 0.5);  // Smaller spin faster

      // Natural initial velocity - smaller cubes spread more
      const angle = Math.random() * PI2;
      const speed = (0.2 + Math.random() * 0.4) * (1.5 - sizeRatio * 0.5);
      this.vx = Math.cos(angle) * speed + (mouse.vx || 0) * 0.12;
      this.vy = Math.sin(angle) * speed + (mouse.vy || 0) * 0.12 - 0.2;

      // Quick appearance animation
      this.scale = 0.2;
      this.targetScale = 1;

      return this;
    }

    update(w, h) {
      // Scale-in animation
      this.scale += (this.targetScale - this.scale) * 0.12;

      // Life decay - faster on ground
      const decay = this.grounded
        ? this.lifeDecay * config.groundedLifeMultiplier
        : this.lifeDecay;
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
          const baseForce = config.cursorPushForce;
          const force = falloff * baseForce * (0.6 + cursorSpeed * 0.4);

          const nx = dx / dist;
          const ny = dy / dist;

          // Push away + inherit cursor direction
          this.vx += nx * force + mouse.vx * falloff * 0.2;
          this.vy += ny * force + mouse.vy * falloff * 0.2;
          this.rotationSpeed += force * 0.01;
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

    draw(ctx, canvasHeight) {
      const { x, y, size, isoHeight, colors, life, scale, rotation } = this;

      // Skip if too small
      if (scale < 0.05) return;

      // Size-based depth effect - smaller cubes appear further away
      const sizeRatio = (size - config.minSize) / (config.maxSize - config.minSize);
      const sizeDepth = 0.7 + sizeRatio * 0.3;  // Smaller = more transparent

      // Parallax depth effect - cubes lower on screen appear slightly larger
      const depthScale = 0.85 + (y / canvasHeight) * 0.25;
      const finalScale = scale * depthScale;

      // Elegant opacity based on life, size, and position
      const lifeEased = life * life;
      const depthAlpha = 0.6 + (y / canvasHeight) * 0.4;
      ctx.globalAlpha = lifeEased * 0.8 * sizeDepth * Math.min(finalScale * 1.2, 1) * depthAlpha;

      // Scaled size for smooth appear/disappear
      const s = size * finalScale;
      const ih = isoHeight * finalScale;

      // Apply subtle rotation for dynamic feel
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation * 0.15);  // Subtle rotation effect

      // Top face (relative to origin now)
      ctx.fillStyle = colors.top;
      ctx.beginPath();
      ctx.moveTo(0, -ih);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, ih);
      ctx.lineTo(-s, 0);
      ctx.fill();

      // Left face
      ctx.fillStyle = colors.left;
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(0, ih);
      ctx.lineTo(0, ih + s);
      ctx.lineTo(-s, s);
      ctx.fill();

      // Right face
      ctx.fillStyle = colors.right;
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(0, ih);
      ctx.lineTo(0, ih + s);
      ctx.lineTo(s, s);
      ctx.fill();

      ctx.restore();
    }
  }

  // Particle management
  const pool = [];
  const active = [];

  const getParticle = (x, y, color) => {
    const p = pool.length > 0 ? pool.pop() : new Particle();
    return p.init(x, y, color);
  };

  const randomColor = () => config.colors[(Math.random() * config.colors.length) | 0];

  // Spawn cubes at cursor position while click is held
  const spawnAtCursor = () => {
    if (active.length >= config.maxParticles) return;

    const now = performance.now();
    if (now - mouse.lastSpawnTime < config.spawnInterval) return;
    mouse.lastSpawnTime = now;

    // Spawn at exact cursor position with tiny variance
    for (let i = 0; i < config.spawnPerTick && active.length < config.maxParticles; i++) {
      const ox = (Math.random() - 0.5) * 6;
      const oy = (Math.random() - 0.5) * 6;
      active.push(getParticle(mouse.x + ox, mouse.y + oy, randomColor()));
    }
  };

  // Spawn trail while dragging with click held
  const trySpawnOnDrag = () => {
    if (mouse.lastSpawnX < 0 || active.length >= config.maxParticles) return;

    const dx = mouse.x - mouse.lastSpawnX;
    const dy = mouse.y - mouse.lastSpawnY;
    const distSq = dx * dx + dy * dy;
    const minDist = config.dragSpawnDistance;

    if (distSq < minDist * minDist) return;

    const dist = Math.sqrt(distSq);
    const steps = Math.min(Math.ceil(dist / minDist), 5);
    for (let i = 0; i < steps && active.length < config.maxParticles; i++) {
      const t = (i + 1) / steps;
      const px = mouse.lastSpawnX + dx * t;
      const py = mouse.lastSpawnY + dy * t;
      const ox = (Math.random() - 0.5) * 4;
      const oy = (Math.random() - 0.5) * 4;
      active.push(getParticle(px + ox, py + oy, randomColor()));
    }

    mouse.lastSpawnX = mouse.x;
    mouse.lastSpawnY = mouse.y;
  };

  // Spatial grid for O(n) collision detection
  const grid = new Map();

  const getGridKey = (x, y) => {
    const cellX = Math.floor(x / config.gridCellSize);
    const cellY = Math.floor(y / config.gridCellSize);
    return `${cellX},${cellY}`;
  };

  const buildGrid = () => {
    grid.clear();
    for (let i = 0; i < active.length; i++) {
      const p = active[i];
      if (!p.active) continue;
      const key = getGridKey(p.x, p.y);
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(p);
    }
  };

  const getNeighborCells = (x, y) => {
    const cellX = Math.floor(x / config.gridCellSize);
    const cellY = Math.floor(y / config.gridCellSize);
    const neighbors = [];
    // Check 3x3 grid around particle
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        if (grid.has(key)) {
          neighbors.push(...grid.get(key));
        }
      }
    }
    return neighbors;
  };

  // Optimized collision physics with spatial grid - O(n) instead of O(n²)
  const handleCollisions = () => {
    buildGrid();
    const checked = new Set();

    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      if (!a.active) continue;

      const neighbors = getNeighborCells(a.x, a.y);

      for (const b of neighbors) {
        if (a === b || !b.active) continue;

        // Create unique pair key to avoid double-checking
        const pairKey = a.x < b.x || (a.x === b.x && a.y < b.y)
          ? `${i}-${active.indexOf(b)}`
          : `${active.indexOf(b)}-${i}`;
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

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

          // Momentum-conserving velocity exchange
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const dot = dvx * nx + dvy * ny;

          if (dot > 0) {
            const totalMass = a.mass + b.mass;
            const restitution = 0.35;
            const impulseA = (2 * b.mass / totalMass) * dot * restitution;
            const impulseB = (2 * a.mass / totalMass) * dot * restitution;

            a.vx -= impulseA * nx;
            a.vy -= impulseA * ny;
            b.vx += impulseB * nx;
            b.vy += impulseB * ny;

            // Add slight spin on collision
            a.rotationSpeed += dot * 0.002;
            b.rotationSpeed -= dot * 0.002;
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

    // Smooth cursor velocity
    const rawVx = mouse.x - mouse.prevX;
    const rawVy = mouse.y - mouse.prevY;
    smoothVx += (rawVx - smoothVx) * 0.35;
    smoothVy += (rawVy - smoothVy) * 0.35;
    mouse.vx = smoothVx;
    mouse.vy = smoothVy;

    // ONLY spawn when PHYSICALLY clicking (strict verification)
    if (isClickActive() && mouse.x >= 0 && mouse.y >= 0) {
      spawnAtCursor();
      trySpawnOnDrag();
    }

    // Update previous position
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;

    // Collisions every frame for smooth physics
    handleCollisions();

    // Update and draw particles - sort by size for depth effect (smaller = further = draw first)
    active.sort((a, b) => a.size - b.size);

    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.update(w, h);

      if (!p.active) {
        // Swap-remove: O(1) instead of splice O(n)
        pool.push(p);
        active[i] = active[active.length - 1];
        active.pop();
      } else {
        p.draw(ctx, h);
      }
    }
  };

  const onMouseDown = (e) => {
    // Only respond to left click (button 0)
    if (e.button !== 0) return;

    // Don't spawn particles when clicking interactive elements (buttons, links, etc.)
    if (isInteractiveElement(e.target)) return;

    mouse.isDown = true;
    mouse.clickStartTime = performance.now();
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.prevX = e.clientX;
    mouse.prevY = e.clientY;
    mouse.lastSpawnX = e.clientX;
    mouse.lastSpawnY = e.clientY;
    mouse.lastSpawnTime = 0;  // Reset to spawn immediately
  };

  const onMouseUp = () => {
    // Always reset on any mouseup event
    mouse.isDown = false;
    mouse.clickStartTime = 0;
  };

  const onMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    // Check if mouse button is still pressed (catches missed mouseup events)
    if (mouse.isDown && e.buttons === 0) {
      resetMouseState();
    }
  };

  // Reset mouse state helper (reduces code duplication)
  const resetMouseState = () => {
    mouse.isDown = false;
    mouse.clickStartTime = 0;
    mouse.lastSpawnX = -1000;
    mouse.lastSpawnY = -1000;
  };

  const onMouseLeave = () => {
    resetMouseState();
    mouse.x = -1000;
    mouse.y = -1000;
  };

  const onBlur = () => resetMouseState();

  const onVisibilityChange = () => {
    if (document.hidden) {
      resetMouseState();
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!running) {
      running = true;
      animate();
    }
  };

  const onContextMenu = () => resetMouseState();

  // Touch support for mobile devices
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];

      // Don't spawn particles when touching interactive elements
      if (isInteractiveElement(e.target)) return;

      e.preventDefault();
      mouse.isDown = true;
      mouse.clickStartTime = performance.now();
      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
      mouse.prevX = touch.clientX;
      mouse.prevY = touch.clientY;
      mouse.lastSpawnX = touch.clientX;
      mouse.lastSpawnY = touch.clientY;
      mouse.lastSpawnTime = 0;
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      mouse.x = touch.clientX;
      mouse.y = touch.clientY;
    }
  };

  const onTouchEnd = () => resetMouseState();

  // ENSURE CLEAN INITIAL STATE - no clicks active on load
  resetMouseState();
  mouse.x = -1000;
  mouse.y = -1000;

  // Attach listeners - document for mousedown since canvas has pointer-events: none
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  // Listen mouseup on both window AND document for maximum coverage
  window.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('contextmenu', onContextMenu);
  // Also reset on pointerup and pointercancel for better coverage
  window.addEventListener('pointerup', onMouseUp);
  window.addEventListener('pointercancel', resetMouseState);
  // Extra safety: reset on dragstart (user might drag something)
  document.addEventListener('dragstart', resetMouseState);

  // Touch events for mobile
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  document.addEventListener('touchcancel', onTouchEnd);

  // Start animation
  animate();

  return {
    stop() {
      running = false;
      resetMouseState();
      mouse.x = -1000;
      mouse.y = -1000;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('pointerup', onMouseUp);
      window.removeEventListener('pointercancel', resetMouseState);
      document.removeEventListener('dragstart', resetMouseState);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', resizeCanvas);
      active.length = 0;
      pool.length = 0;
      colorCache.clear();
    }
  };
}
