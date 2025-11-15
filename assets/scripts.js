import { initMobileMenu } from './modules/menu.js';
import { initHeroTags } from './modules/hero-tags.js';
import { initParticleCanvas } from './modules/particles.js';
import { initSmoothScroll } from './modules/smooth-scroll.js';

// Entry point

  initMobileMenu();
  initHeroTags();
  initSmoothScroll();
  initParticleCanvas('#particle-canvas');

  // COPYRIGHT YEAR
  const yearSpan = document.getElementById('copyright-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});
    // Draw isometric 3D cube
    draw() {
      if (this.life <= 0) return;
      
      ctx.save();
      ctx.globalAlpha = this.life;
      
      const size = this.size;
      const x = this.x;
      const y = this.y;
      
      // Colors for 3 faces
      const colorTop = this.color;
      const colorLeft = shadeColor(this.color, -20);
      const colorRight = shadeColor(this.color, 10);
      
      const isoHeight = size * 0.5;

      // Top face
      ctx.fillStyle = colorTop;
      ctx.beginPath();
      ctx.moveTo(x, y - isoHeight);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();

      // Left face
      ctx.fillStyle = colorLeft;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x, y + isoHeight + size);
      ctx.lineTo(x - size, y + size);
      ctx.closePath();
      ctx.fill();

      // Right face
      ctx.fillStyle = colorRight;
      ctx.beginPath();
      ctx.moveTo(x + size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x, y + isoHeight + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }

    update() {
      // Fade out when not clicking
      if (!mouse.isDown) {
        this.life -= 0.04;
      }
      
      // Gentle repulsion from cursor
      if (mouse.x !== undefined) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius + this.size) {
          const angle = Math.atan2(dy, dx);
          this.vx = Math.cos(angle) * 3;
          this.vy = Math.sin(angle) * 3;
        }
      }

      // Bounce off edges
      if (this.x + this.size > canvas.width) {
        this.x = canvas.width - this.size;
        this.vx *= -this.damping;
      }
      if (this.x - this.size < 0) {
        this.x = this.size;
        this.vx *= -this.damping;
      }
      if (this.y + this.size > canvas.height) {
        this.y = canvas.height - this.size;
        this.vy *= -this.damping;
      }
      if (this.y - this.size < 0) {
        this.y = this.size;
        this.vy *= -this.damping;
      }
      
      // Update position
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  /* ==================== PARTICLE MANAGEMENT ==================== */
  const particles = [];
  const MAX_PARTICLES = 75;
  let frameCounter = 0;

  // Create particle burst on click
  function createParticleBurst(x, y) {
    const burstCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < burstCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(x, y, color, 'burst'));
    }
  }

  /* ==================== EVENT LISTENERS ==================== */
  
  // Click creates burst
  document.addEventListener('click', (e) => {
    createParticleBurst(e.clientX, e.clientY);
  });

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  // Track mouse down/up state
  document.addEventListener('mousedown', (e) => {
    mouse.isDown = true;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  document.addEventListener('mouseup', () => {
    mouse.isDown = false;
  });

  /* ==================== ANIMATION LOOP ==================== */
  function animate() {
    requestAnimationFrame(animate);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Generate particles on sustained click
    if (mouse.isDown) {
      frameCounter++;
      if (frameCounter % 25 === 0) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(mouse.x, mouse.y, color, 'dust'));
      }
    }

    // Limit total particles
    while (particles.length > MAX_PARTICLES) {
      particles.shift();
    }
    
    // Update and draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();
      
      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // Start animation
  animate();
});
