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
   * (Comportamiento de Estela + Explosión de Video)
   * ===================================================================
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

  // Mouse state tracking (Posición Y ESTADO del clic)
  const mouse = {
    x: 0,
    y: 0,
    isDown: false, // Añadido para rastrear el clic persistente
    radius: 40 // Radio de repulsión SUTIL
  };

  // Color palette for cubes
  const colors = ['#007bff', '#ffc107', '#6f42c1', '#fd7e14'];

  // *** AÑADIDO: Helper function to shade color for 3D faces ***
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
    constructor(x, y, color, type) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = Math.random() * 2 + 1; // Sutil: 1-3px
      this.type = type; // 'burst', 'trail', o 'dust'
      
      // Calculate velocity based on type
      if (type === 'burst') {
        // 'burst' (explosión de clic): velocidad moderada en 360 grados
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
      } else if (type === 'trail') {
        // 'trail' (estela de mousemove): velocidad muy baja
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
      } else {
        // 'dust' (clic persistente): flujo suave hacia arriba
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * -1 - 0.5; // Ligero impulso hacia arriba
      }
      
      this.life = 1; // Opacity from 1 to 0
      this.gravity = 0; // No gravity
      this.damping = 0.95; // Factor de rebote (poca fricción, flotan)
    }

    // *** REEMPLAZADO: Draw isometric 3D cube (Método Correcto) ***
    draw() {
      if (this.life <= 0) return;
      
      ctx.save();
      ctx.globalAlpha = this.life;
      
      const size = this.size;
      const x = this.x;
      const y = this.y;
      
      // Colores para las 3 caras
      const colorTop = this.color;
      const colorLeft = shadeColor(this.color, -20);
      const colorRight = shadeColor(this.color, 10);
      
      const isoHeight = size * 0.5; // Altura isométrica

      // Cara superior
      ctx.fillStyle = colorTop;
      ctx.beginPath();
      ctx.moveTo(x, y - isoHeight);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();

      // Cara izquierda
      ctx.fillStyle = colorLeft;
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x, y + isoHeight);
      ctx.lineTo(x, y + isoHeight + size);
      ctx.lineTo(x - size, y + size);
      ctx.closePath();
      ctx.fill();

      // Cara derecha
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
      // 1. CICLO DE VIDA: Desvanecimiento constante
      this.life -= 0.05; // Desvanecimiento constante
      
      // 2. FRICCIÓN: Frenado suave
      this.vx *= 0.98; // Fricción
      this.vy *= 0.98; // Fricción
      
      // 3. ACTUALIZAR POSICIÓN
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  // Particle array
  const particles = [];
  const MAX_PARTICLES = 40; // Límite MUY sutil
  let frameCounter = 0; // Para el throttle del clic persistente

  // Helper function to create particle burst on click
  function createParticleBurst(x, y) {
    const burstCount = 5 + Math.floor(Math.random() * 4); // 5-8 partículas
    for (let i = 0; i < burstCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(x, y, color, 'burst'));
    }
  }

  // ELIMINADO: Ya no se crea estela en mousemove
  // function createParticleTrail(x, y) { ... }

  // ELIMINADO: Throttle de mousemove ya no es necesario
  // let lastTrailTime = 0;
  // const trailThrottle = 40; 

  // --- NUEVOS LISTENERS HÍBRIDOS ---

  // 1. Clic (Explosión)
  document.addEventListener('click', (e) => {
    createParticleBurst(e.clientX, e.clientY);
  });

  // 2. Movimiento (SOLO actualiza posición del cursor, NO CREA partículas)
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  // 3. Clic Persistente (Estado)
  document.addEventListener('mousedown', (e) => {
    mouse.isDown = true;
    mouse.x = e.clientX; // Actualizar posición en mousedown
    mouse.y = e.clientY;
  });
  
  document.addEventListener('mouseup', (e) => {
    mouse.isDown = false;
  });
  // --- FIN DE LISTENERS ---


  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    
    // Clear background completely - no motion blur
    ctx.fillStyle = '#0b1526'; // Color --bg (Sin rastro)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // --- LÓGICA DE CLIC PERSISTENTE ---
    // Si el mouse está presionado, genera "polvo"
    if (mouse.isDown) {
      frameCounter++;
      if (frameCounter % 15 === 0) { // Tasa de generación MUY sutil
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(mouse.x, mouse.y, color, 'dust'));
      }
    }
    // --- FIN LÓGICA DE CLIC PERSISTENTE ---

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
  }

  // Start animation
  animate();

});
