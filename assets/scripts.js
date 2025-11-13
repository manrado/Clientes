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

  // Hero 'Acceder a reportes' is a discreet button that should lead users to login for reports
  // (link uses /reports/login - adjust if your auth path differs)

  /* --- Inicio: Lógica del efecto 'Click Spark' optimizada --- */

  // Persistencia: recuperar estado del localStorage
  const SPARK_STORAGE_KEY = 'manrado_spark_enabled';
  let isSparkEffectEnabled = localStorage.getItem(SPARK_STORAGE_KEY) !== 'false';

  // Sparkle effect colors (optimized for performance with hardcoded values)
  const starColors = ['#ffd700', '#ffed4e', '#ffffff', '#06b6d4', '#ffa500'];

  // Función para crear una chispa individual
  function createClickSpark(x, y) {
    if (!isSparkEffectEnabled) return;

    const star = document.createElement('span');
    star.classList.add('click-spark');
    star.textContent = '✨';

    // Seleccionar color aleatorio de la paleta de estrellas
    const randomColor = starColors[Math.floor(Math.random() * starColors.length)];
    star.style.color = randomColor;

    // Posición inicial (donde se hizo clic)
    star.style.left = x + 'px';
    star.style.top = y + 'px';

    // Movimiento aleatorio para la animación
    const randomX = (Math.random() - 0.5) * 100;
    const randomY = (Math.random() - 0.5) * 100;
    
    star.style.setProperty('--sparkle-translateX', randomX + 'px');
    star.style.setProperty('--sparkle-translateY', randomY + 'px');

    document.body.appendChild(star);

    // Eliminar la chispa del DOM después de la animación
    star.addEventListener('animationend', () => {
      star.remove();
    });
  }

  // Escuchar todos los clics en la página (reducido a 3 chispas por mejor rendimiento)
  document.addEventListener('click', function(e) {
    for (let i = 0; i < 3; i++) {
      createClickSpark(e.clientX, e.clientY);
    }
  });

  // Guardar estado en localStorage cuando cambie
  function toggleSparkEffect() {
    isSparkEffectEnabled = !isSparkEffectEnabled;
    localStorage.setItem(SPARK_STORAGE_KEY, isSparkEffectEnabled);
  }

  // (Opcional) Exponer función para permitir toggle desde consola o UI
  window.toggleSparkEffect = toggleSparkEffect;
  
  /* --- Fin: Lógica del efecto 'Click Spark' --- */

  /* --- Inicio: Efecto de Partículas Interactivas con Cubos Isométricos --- */

  // Configuración del Canvas
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  // Paleta de colores para los cubos
  const cubeColors = ['#007bff', '#ffc107', '#6f42c1', '#fd7e14'];
  
  // Estado del mouse
  const mouse = {
    x: 0,
    y: 0,
    isDown: false,
    radius: 60 // Radio de repulsión
  };
  
  // Array de partículas
  let particles = [];
  const MAX_PARTICLES = 250;
  let frameCounter = 0;
  
  // Función para redimensionar el canvas
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  // Función auxiliar para oscurecer/aclarar colores (para las caras del cubo)
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
  
  // Clase Particle para los cubos isométricos
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = Math.random() * 15 + 10; // Tamaño entre 10-25px
      
      // Velocidad inicial aleatoria
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 6;
      
      // Físicas
      this.gravity = 0.15;
      this.damping = 0.8;
      this.life = 1; // Opacidad (1 = visible, 0 = invisible)
      this.fadeRate = 0.015; // Velocidad de difuminado
    }
    
    // Dibuja un cubo isométrico 3D
    draw() {
      if (this.life <= 0) return;
      
      ctx.save();
      ctx.globalAlpha = this.life;
      
      const size = this.size;
      const h = size * 0.866; // altura isométrica
      
      // Colores para las 3 caras (superior, izquierda, derecha)
      const colorTop = shadeColor(this.color, 20);
      const colorLeft = shadeColor(this.color, -10);
      const colorRight = shadeColor(this.color, -30);
      
      // Cara superior (rombo)
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + size, this.y + size * 0.5);
      ctx.lineTo(this.x, this.y + size);
      ctx.lineTo(this.x - size, this.y + size * 0.5);
      ctx.closePath();
      ctx.fillStyle = colorTop;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Cara izquierda
      ctx.beginPath();
      ctx.moveTo(this.x - size, this.y + size * 0.5);
      ctx.lineTo(this.x, this.y + size);
      ctx.lineTo(this.x, this.y + size + h);
      ctx.lineTo(this.x - size, this.y + h + size * 0.5);
      ctx.closePath();
      ctx.fillStyle = colorLeft;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.stroke();
      
      // Cara derecha
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + size);
      ctx.lineTo(this.x + size, this.y + size * 0.5);
      ctx.lineTo(this.x + size, this.y + h + size * 0.5);
      ctx.lineTo(this.x, this.y + size + h);
      ctx.closePath();
      ctx.fillStyle = colorRight;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.stroke();
      
      ctx.restore();
    }
    
    // Actualiza la física y posición de la partícula
    update() {
      // Si el mouse no está presionado, comienza a difuminarse
      if (!mouse.isDown) {
        this.life -= this.fadeRate;
      }
      
      // Aplica gravedad
      this.vy += this.gravity;
      
      // Colisión con el cursor (repulsión circular)
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius + this.size) {
        // Normalizar el vector de distancia
        const angle = Math.atan2(dy, dx);
        const targetX = mouse.x + Math.cos(angle) * (mouse.radius + this.size);
        const targetY = mouse.y + Math.sin(angle) * (mouse.radius + this.size);
        
        // Aplicar fuerza de repulsión
        const force = (mouse.radius + this.size - distance) / (mouse.radius + this.size);
        this.vx += (targetX - this.x) * force * 0.5;
        this.vy += (targetY - this.y) * force * 0.5;
      }
      
      // Actualiza posición
      this.x += this.vx;
      this.y += this.vy;
      
      // Rebote en los bordes con damping
      if (this.x - this.size < 0) {
        this.x = this.size;
        this.vx *= -this.damping;
      } else if (this.x + this.size > canvas.width) {
        this.x = canvas.width - this.size;
        this.vx *= -this.damping;
      }
      
      if (this.y - this.size < 0) {
        this.y = this.size;
        this.vy *= -this.damping;
      } else if (this.y + this.size + this.size * 0.866 > canvas.height) {
        this.y = canvas.height - this.size - this.size * 0.866;
        this.vy *= -this.damping;
      }
    }
  }
  
  // Listeners del mouse
  window.addEventListener('mousedown', (e) => {
    mouse.isDown = true;
  });
  
  window.addEventListener('mouseup', (e) => {
    mouse.isDown = false;
  });
  
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  
  // Listener de redimensionamiento
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  
  // Bucle de animación
  function animate() {
    requestAnimationFrame(animate);
    
    // Limpieza con motion blur para efecto suave
    ctx.fillStyle = 'rgba(11, 21, 38, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Crear nuevas partículas si el mouse está presionado
    if (mouse.isDown) {
      frameCounter++;
      // Crear 2-3 partículas cada 3 frames
      if (frameCounter % 3 === 0) {
        for (let i = 0; i < 2; i++) {
          if (particles.length < MAX_PARTICLES) {
            const color = cubeColors[Math.floor(Math.random() * cubeColors.length)];
            particles.push(new Particle(mouse.x, mouse.y, color));
          }
        }
      }
    }
    
    // Limitar el número de partículas (eliminar las más antiguas)
    if (particles.length > MAX_PARTICLES) {
      particles = particles.slice(particles.length - MAX_PARTICLES);
    }
    
    // Actualizar y dibujar partículas (iterar hacia atrás para poder eliminar)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();
      
      // Eliminar partículas que se han difuminado completamente
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }
  
  // Iniciar la animación
  animate();
  
  /* --- Fin: Efecto de Partículas Interactivas --- */

});
