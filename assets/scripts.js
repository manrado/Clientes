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

  /* --- Inicio: Efecto de Partículas Sutil Basado en DOM (ManradoSparkleEffect) --- */

  /**
   * ManradoSparkleEffect
   * Clase que implementa un efecto de partículas sutil y profesional,
   * fundamentado en el DOM en lugar de canvas para reducir el costo computacional.
   * Las partículas se activan mediante clicks del usuario.
   */
  class ManradoSparkleEffect {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.warn(`Container with id '${containerId}' not found`);
        return;
      }
      
      // Paleta de colores profesionales (tonos azules y cian)
      this.colors = ['#3b82f6', '#06b6d4', '#1d4ed8', '#0ea5e9', '#60a5fa'];
      
      // Vincular el evento de click a todo el documento
      this.bindEvents();
    }
    
    /**
     * Vincula el evento de click al documento
     */
    bindEvents() {
      document.addEventListener('click', (e) => {
        this.createSparkles(e.clientX, e.clientY);
      });
    }
    
    /**
     * Crea múltiples partículas sparkle en la posición especificada
     * @param {number} x - Coordenada X del click
     * @param {number} y - Coordenada Y del click
     */
    createSparkles(x, y) {
      // Generar entre 4-6 partículas por click para un efecto sutil
      const count = Math.floor(Math.random() * 3) + 4;
      
      for (let i = 0; i < count; i++) {
        this.createSparkle(x, y);
      }
    }
    
    /**
     * Crea una partícula sparkle individual
     * @param {number} x - Coordenada X de origen
     * @param {number} y - Coordenada Y de origen
     */
    createSparkle(x, y) {
      const sparkle = document.createElement('div');
      sparkle.className = 'manrado-sparkle';
      
      // Seleccionar color aleatorio de la paleta
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      sparkle.style.color = color;
      
      // Posicionar en el punto de origen
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      
      // Calcular trayectoria aleatoria
      // Fase 1: Desplazamiento inicial (expansión)
      const angle = Math.random() * Math.PI * 2;
      const distance1 = Math.random() * 30 + 20; // 20-50px
      const tx = Math.cos(angle) * distance1;
      const ty = Math.sin(angle) * distance1;
      
      // Fase 2: Desplazamiento final (continuación en la misma dirección)
      const distance2 = Math.random() * 40 + 30; // 30-70px adicionales
      const txEnd = Math.cos(angle) * (distance1 + distance2);
      const tyEnd = Math.sin(angle) * (distance1 + distance2);
      
      // Establecer variables CSS para la animación
      sparkle.style.setProperty('--tx', `${tx}px`);
      sparkle.style.setProperty('--ty', `${ty}px`);
      sparkle.style.setProperty('--tx-end', `${txEnd}px`);
      sparkle.style.setProperty('--ty-end', `${tyEnd}px`);
      
      // Añadir al contenedor
      this.container.appendChild(sparkle);
      
      // Remover el elemento después de que la animación termine (1s)
      setTimeout(() => {
        sparkle.remove();
      }, 1000);
    }
  }
  
  // Instanciar el efecto
  new ManradoSparkleEffect('sparkle-container');
  
  /* --- Fin: Efecto de Partículas Sutil --- */

});
