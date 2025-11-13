document.addEventListener('DOMContentLoaded', function() {
  // Mobile Menu Toggle
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => {
      const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', !isExpanded);
      navLinks.classList.toggle('active');
      // Close menu when a link is clicked
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          menuBtn.setAttribute('aria-expanded', 'false');
          navLinks.classList.remove('active');
        });
      });
    });
  }

  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      // allow external links and mailto
      const href = this.getAttribute('href');
      if (!href.startsWith('#')) return;
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Set Copyright Year
  const yearSpan = document.getElementById('copyright-year');
  if(yearSpan) { yearSpan.textContent = new Date().getFullYear(); }

  // Hero tags interaction: subtle hover highlight of service cards
  const tags = document.querySelectorAll('.hero-tags .tag');
  const cards = document.querySelectorAll('#servicios .card');
  tags.forEach(tag => {
    const idx = Number(tag.getAttribute('data-target'));
    tag.addEventListener('mouseenter', () => {
      if (cards[idx]) cards[idx].classList.add('highlight');
      tag.classList.add('active');
    });
    tag.addEventListener('mouseleave', () => {
      if (cards[idx]) cards[idx].classList.remove('highlight');
      tag.classList.remove('active');
    });
    // click quietly navigates to the service card (smooth scroll)
    tag.addEventListener('click', () => {
      if (cards[idx]) cards[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  /*
   * ===================================================================
   * Interactive Particle Effect with Isometric 3D Cubes
   * ===================================================================
   * Physics-based particle system that generates isometric cubes on mousedown
   */

  // Canvas setup
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) {
    console.warn('Particle canvas not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  // Resize canvas to fill window
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Mouse state tracking
  const mouse = {
    x: 0,
    y: 0,
    isDown: false,
    radius: 60 // Repulsion radius
  };

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // Track mouse down/up
  document.addEventListener('mousedown', () => {
    mouse.isDown = true;
  });

  document.addEventListener('mouseup', () => {
    mouse.isDown = false;
  });

  // Color palette for cubes
  const colors = ['#007bff', '#ffc107', '#6f42c1', '#fd7e14'];

  // Helper function to shade color for 3D faces
  function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
  }

  // Particle class with isometric 3D cube rendering
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = 2 + Math.random() * 4; // Random size 2-6px (more subtle)
      
      // Random velocity for agile dispersion (reduced for subtlety)
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = (Math.random() - 0.5) * 4;
      
      this.life = 1; // Opacity from 1 to 0
      this.gravity = 0; // No gravity
      this.damping = 0.95; // High damping for light bounce
    }

    // Draw isometric 3D cube
    draw() {
      if (this.life <= 0) return;
      
      ctx.save();
      ctx.globalAlpha = this.life;
      
      const size = this.size;
      const x = this.x;
      const y = this.y;
      
      // Calculate isometric coordinates
      const isoWidth = size * 1.2;
      const isoHeight = size * 0.7;
      
      // Top face (lighter)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + isoWidth, y - isoHeight);
      ctx.lineTo(x + isoWidth * 2, y);
      ctx.lineTo(x + isoWidth, y + isoHeight);
      ctx.closePath();
      ctx.fill();
      
      // Left face (darker)
      ctx.fillStyle = shadeColor(this.color, -30);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + isoWidth, y + isoHeight);
      ctx.lineTo(x + isoWidth, y + isoHeight + size);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();
      
      // Right face (medium)
      ctx.fillStyle = shadeColor(this.color, -15);
      ctx.beginPath();
      ctx.moveTo(x + isoWidth * 2, y);
      ctx.lineTo(x + isoWidth, y + isoHeight);
      ctx.lineTo(x + isoWidth, y + isoHeight + size);
      ctx.lineTo(x + isoWidth * 2, y + size);
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }

    update() {
      // If mouse is not down, fade out (faster fade for subtlety)
      if (!mouse.isDown) {
        this.life -= 0.025;
      }
      
      // Repulsion from cursor
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < mouse.radius && dist > 0) {
        const force = (mouse.radius - dist) / mouse.radius;
        const angle = Math.atan2(dy, dx);
        this.vx += Math.cos(angle) * force * 0.5;
        this.vy += Math.sin(angle) * force * 0.5;
      }
      
      // Apply gravity (zero in this case)
      this.vy += this.gravity;
      
      // Update position
      this.x += this.vx;
      this.y += this.vy;
      
      // Bounce off edges with damping
      if (this.x < 0) {
        this.x = 0;
        this.vx *= -this.damping;
      }
      if (this.x > canvas.width) {
        this.x = canvas.width;
        this.vx *= -this.damping;
      }
      if (this.y < 0) {
        this.y = 0;
        this.vy *= -this.damping;
      }
      if (this.y > canvas.height) {
        this.y = canvas.height;
        this.vy *= -this.damping;
      }
    }
  }

  // Particle array
  const particles = [];
  const MAX_PARTICLES = 100; // Reduced for subtle effect
  let frameCount = 0;

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Motion blur effect - semi-transparent clear (shorter trail)
    ctx.fillStyle = 'rgba(11, 21, 38, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate particles when mouse is down (slower generation for subtlety)
    if (mouse.isDown && frameCount % 4 === 0) {
      // Create 1 particle every 4 frames
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(mouse.x, mouse.y, color));
    }
    
    // Limit total particles
    while (particles.length > MAX_PARTICLES) {
      particles.shift();
    }
    
    // Update and draw particles (iterate backwards for safe removal)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();
      
      // Remove dead particles
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
    
    frameCount++;
  }

  // Start animation
  animate();

});
