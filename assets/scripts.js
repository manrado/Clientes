/**
 * Manrado Landing Page - Interactive Scripts
 * Clean, modern JavaScript with enhanced UX
 */

document.addEventListener('DOMContentLoaded', function() {
  
  /* ==================== MOBILE MENU TOGGLE ==================== */
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuBtn && navLinks) {
    // Toggle menu on button click
    menuBtn.addEventListener('click', () => {
      const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', !isExpanded);
      navLinks.classList.toggle('active');
      
      // Update aria-label
      menuBtn.setAttribute('aria-label', !isExpanded ? 'Cerrar menú' : 'Abrir menú');
    });
    
    // Close menu when clicking on any link
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Abrir menú');
        navLinks.classList.remove('active');
      });
    });
    
    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.setAttribute('aria-label', 'Abrir menú');
        navLinks.classList.remove('active');
        menuBtn.focus();
      }
    });
  }

  /* ==================== SMOOTH SCROLL FOR ANCHOR LINKS ==================== */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Skip if href is just "#" or doesn't start with "#"
      if (href === '#' || !href.startsWith('#')) return;
      
      // Skip mailto and external links
      if (this.getAttribute('href').includes('mailto:') || 
          this.getAttribute('href').includes('http')) return;
      
      e.preventDefault();
      const targetId = href;
      const targetElement = document.querySelector(targetId);
      
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Set focus to target for accessibility
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus();
      }
    });
  });

  /* ==================== COPYRIGHT YEAR ==================== */
  const yearSpan = document.getElementById('copyright-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ==================== HERO TAGS INTERACTION ==================== */
  // Hero tags highlight and scroll to corresponding service cards
  const tags = document.querySelectorAll('.hero-tags .tag');
  const serviceCards = document.querySelectorAll('#servicios .card[data-index]');
  
  tags.forEach(tag => {
    const targetIndex = Number(tag.getAttribute('data-target'));
    
    // Add keyboard accessibility
    tag.setAttribute('tabindex', '0');
    tag.setAttribute('role', 'button');
    tag.setAttribute('aria-label', `Ver servicio: ${tag.textContent}`);
    
    // Hover: highlight corresponding card
    tag.addEventListener('mouseenter', () => {
      if (serviceCards[targetIndex]) {
        serviceCards[targetIndex].classList.add('highlight');
      }
      tag.classList.add('active');
    });
    
    tag.addEventListener('mouseleave', () => {
      if (serviceCards[targetIndex]) {
        serviceCards[targetIndex].classList.remove('highlight');
      }
      tag.classList.remove('active');
    });
    
    // Click/Enter: smooth scroll to service card
    const scrollToCard = () => {
      if (serviceCards[targetIndex]) {
        serviceCards[targetIndex].scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Brief highlight effect
        serviceCards[targetIndex].classList.add('highlight');
        setTimeout(() => {
          serviceCards[targetIndex].classList.remove('highlight');
        }, 2000);
      }
    };
    
    tag.addEventListener('click', scrollToCard);
    tag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToCard();
      }
    });
  });

  /* ==================== PARTICLE CANVAS EFFECT ==================== */
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

  // Mouse tracking
  const mouse = {
    x: 0,
    y: 0,
    isDown: false,
    radius: 30
  };

  // Color palette
  const colors = ['#5fb3ff', '#2ec27e', '#f6c244', '#7c5cff'];

  // Helper function to shade color for 3D effect
  function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    
    return '#' + (
      0x1000000 +
      R * 0x10000 +
      G * 0x100 +
      B
    ).toString(16).slice(1);
  }

  /* ==================== PARTICLE CLASS ==================== */
  class Particle {
    constructor(x, y, color, type) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = Math.random() * 4 + 2;
      this.type = type;
      
      // Set velocity based on type
      if (type === 'burst') {
        // Explosion on click
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      } else {
        // Gentle upward drift for sustained click
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * -1 - 0.5;
      }
      
      this.life = 1;
      this.damping = 0.95;
    }

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
