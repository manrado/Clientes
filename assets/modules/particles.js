import { qs } from './dom.js';

export function initParticleCanvas(selector = '#particle-canvas') {
  const canvas = qs(selector);
  if (!canvas) return { stop: () => {} };
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const mouse = { x: 0, y: 0, isDown: false, radius: 30 };
  const colors = ['#5fb3ff', '#2ec27e', '#f6c244', '#7c5cff'];

  function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  class Particle {
    constructor(x, y, color, type) {
      this.x = x; this.y = y; this.color = color; this.size = Math.random() * 4 + 2; this.type = type;
      if (type === 'burst') {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
      } else { this.vx = (Math.random() - 0.5) * 2; this.vy = Math.random() * -1 - 0.5; }
      this.life = 1; this.damping = 0.95;
    }
    reset(x, y, color, type) {
      this.x = x; this.y = y; this.color = color; this.size = Math.random() * 4 + 2; this.type = type;
      if (type === 'burst') {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
      } else {
        this.vx = (Math.random() - 0.5) * 2; this.vy = Math.random() * -1 - 0.5;
      }
      this.life = 1; this.damping = 0.95;
    }
    recycle() {
      // Optional: clean up references
      this.life = 0;
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.save(); ctx.globalAlpha = this.life;
      const size = this.size; const x = this.x; const y = this.y;
      const colorTop = this.color; const colorLeft = shadeColor(this.color, -20); const colorRight = shadeColor(this.color, 10);
      const isoHeight = size * 0.5;
      ctx.fillStyle = colorTop; ctx.beginPath(); ctx.moveTo(x, y - isoHeight); ctx.lineTo(x + size, y); ctx.lineTo(x, y + isoHeight); ctx.lineTo(x - size, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = colorLeft; ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x, y + isoHeight); ctx.lineTo(x, y + isoHeight + size); ctx.lineTo(x - size, y + size); ctx.closePath(); ctx.fill();
      ctx.fillStyle = colorRight; ctx.beginPath(); ctx.moveTo(x + size, y); ctx.lineTo(x, y + isoHeight); ctx.lineTo(x, y + isoHeight + size); ctx.lineTo(x + size, y + size); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    update(canvas, mouse) {
      if (!mouse.isDown) { this.life -= 0.04 }
      if (mouse.x !== undefined) {
        const dx = this.x - mouse.x; const dy = this.y - mouse.y; const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius + this.size) { const angle = Math.atan2(dy, dx); this.vx = Math.cos(angle) * 3; this.vy = Math.sin(angle) * 3; }
      }
      if (this.x + this.size > canvas.width) { this.x = canvas.width - this.size; this.vx *= -this.damping; }
      if (this.x - this.size < 0) { this.x = this.size; this.vx *= -this.damping; }
      if (this.y + this.size > canvas.height) { this.y = canvas.height - this.size; this.vy *= -this.damping; }
      if (this.y - this.size < 0) { this.y = this.size; this.vy *= -this.damping; }
      this.x += this.vx; this.y += this.vy;
    }
  }

  const particles = []; const MAX_PARTICLES = 75; let frameCounter = 0; let running = true; let rafId = null;
  // Particle pooling
  const pool = []; const POOL_MAX = 200;

  function createParticle(x, y, color, type) {
    let p = null;
    if (pool.length) {
      p = pool.pop();
      p.reset(x, y, color, type);
    } else {
      p = new Particle(x, y, color, type);
    }
    particles.push(p);
  }

  function createParticleBurst(x, y) {
    const burstCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < burstCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      createParticle(x, y, color, 'burst');
    }
  }

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mouse.isDown) { frameCounter++; if (frameCounter % 25 === 0) { const color = colors[Math.floor(Math.random() * colors.length)]; createParticle(mouse.x, mouse.y, color, 'dust'); }}
    while (particles.length > MAX_PARTICLES) { const removed = particles.shift(); if (removed && pool.length < POOL_MAX) { removed.recycle(); pool.push(removed); } }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.update(canvas, mouse); p.draw(ctx);
      if (p.life <= 0) {
        const [removed] = particles.splice(i, 1);
        if (removed && pool.length < POOL_MAX) { removed.recycle(); pool.push(removed); }
      }
    }
  }

  // Event listeners
  document.addEventListener('click', (e) => createParticleBurst(e.clientX, e.clientY));
  document.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mousedown', (e) => { mouse.isDown = true; mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mouseup', () => { mouse.isDown = false; });

  // Visibility handling
  function onVisibilityChange() {
    if (document.hidden) {
      running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null;
    } else {
      if (!running) { running = true; animate(); }
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  animate();

  return {
    stop() {
      running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}
