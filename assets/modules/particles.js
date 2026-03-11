import { qs } from './dom.js';

/**
 * Ambient Isometric Cube Particles
 *
 * Decorative floating cubes with gentle drift.
 * No user interaction — purely ambient and lightweight.
 */
export function initParticleCanvas(selector = '#particle-canvas') {
  const canvas = qs(selector);
  if (!canvas) return { stop: () => {} };

  const ctx = canvas.getContext('2d', { alpha: true });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window);

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

  // Configuration — fewer particles, same color palette
  const COUNT = isMobile ? 35 : 60;
  const MIN_SIZE = 2;
  const MAX_SIZE = 5.5;
  const colors = ['#60a5fa', '#3b82f6', '#93c5fd', '#34d399', '#6ee7b7', '#fbbf24', '#fcd34d'];

  // Pre-compute shaded face colors
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

  // Create a single particle with random position and gentle drift
  function createParticle() {
    const size = MIN_SIZE + Math.pow(Math.random(), 0.65) * (MAX_SIZE - MIN_SIZE);
    const color = colors[(Math.random() * colors.length) | 0];
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size,
      isoHeight: size * 0.5,
      colors: getColorSet(color),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.25 - 0.05,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.003,
      opacity: 0.15 + Math.random() * 0.35,
    };
  }

  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    particles.push(createParticle());
  }

  let running = true;
  let rafId = null;

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      // Wrap around edges for seamless looping
      if (p.y < -p.size * 2) { p.y = h + p.size * 2; p.x = Math.random() * w; }
      if (p.y > h + p.size * 2) { p.y = -p.size * 2; p.x = Math.random() * w; }
      if (p.x < -p.size * 2) p.x = w + p.size * 2;
      if (p.x > w + p.size * 2) p.x = -p.size * 2;

      // Draw isometric cube
      const { size, isoHeight, colors: c, rotation, opacity } = p;
      ctx.globalAlpha = opacity;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rotation * 0.05);

      ctx.fillStyle = c.top;
      ctx.beginPath();
      ctx.moveTo(0, -isoHeight);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, isoHeight);
      ctx.lineTo(-size, 0);
      ctx.fill();

      ctx.fillStyle = c.left;
      ctx.beginPath();
      ctx.moveTo(-size, 0);
      ctx.lineTo(0, isoHeight);
      ctx.lineTo(0, isoHeight + size);
      ctx.lineTo(-size, size);
      ctx.fill();

      ctx.fillStyle = c.right;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(0, isoHeight);
      ctx.lineTo(0, isoHeight + size);
      ctx.lineTo(size, size);
      ctx.fill();

      ctx.restore();
    }
  }

  const onVisibilityChange = () => {
    if (document.hidden) {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!running) {
      running = true;
      animate();
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  animate();

  return {
    stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      particles.length = 0;
      colorCache.clear();
    }
  };
}
