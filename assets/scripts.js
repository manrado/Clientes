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

  /*
   * ===================================================================
   * INICIO: Efecto Sutil "Sparkle" (ManradoSparkleEffect)
   * ===================================================================
   * Basado en la idea "PERFECCIONA ESTA IDEA" del usuario.
   */
  class ManradoSparkleEffect {
      constructor() {
          this.container = document.getElementById('sparkle-container');
          if (!this.container) {
              console.warn('ManradoSparkleEffect: No se encontró el #sparkle-container. Creando uno.');
              this.container = document.createElement('div');
              this.container.id = 'sparkle-container';
              document.body.appendChild(this.container);
          }
          
          // Paleta de colores adaptada al tema Boreal/SynthWave del CSS
          this.colors = [
              '#4ce9d9', // --accent
              '#72f1b8', // --ok
              '#f97e72', // --warn
              '#7ed0ff', // (Color de terminal brillante)
              '#ffffff'  // --ink
          ];
          this.init();
      }

      init() {
          document.addEventListener('click', (e) => {
              if (e.clientX === 0 && e.clientY === 0) return;
              this.createSparkleBurst(e.clientX, e.clientY);
          });
      }

      createSparkleBurst(x, y) {
          const sparkleCount = 8 + Math.floor(Math.random() * 5);
          
          for (let i = 0; i < sparkleCount; i++) {
              this.createSparkle(x, y, i, sparkleCount);
          }
      }

      createSparkle(x, y, index, sparkleCount) {
          const sparkle = document.createElement('div');
          sparkle.className = 'manrado-sparkle';
          
          // Propiedades aleatorias
          const angle = (index / sparkleCount) * Math.PI * 2;
          const distance = 30 + Math.random() * 70;
          const finalDistance = distance * (1.5 + Math.random() * 1.5);
          
          const tx = Math.cos(angle) * distance;
          const ty = Math.sin(angle) * distance;
          const txEnd = Math.cos(angle) * finalDistance;
          const tyEnd = Math.sin(angle) * finalDistance;

          // Aplicar propiedades CSS
          sparkle.style.setProperty('--tx', `${tx}px`);
          sparkle.style.setProperty('--ty', `${ty}px`);
          sparkle.style.setProperty('--tx-end', `${txEnd}px`);
          sparkle.style.setProperty('--ty-end', `${tyEnd}px`);
          
          const color = this.colors[Math.floor(Math.random() * this.colors.length)];
          sparkle.style.color = color;
          
          sparkle.style.left = `${x - 3}px`; // offset para centrar
          sparkle.style.top = `${y - 3}px`; // offset para centrar
          
          const duration = 0.8 + Math.random() * 0.4;
          sparkle.style.animationDuration = `${duration}s`;
          if (index % 2 === 0) {
              sparkle.style.animationDelay = `${index * 0.02}s`;
          }

          this.container.appendChild(sparkle);

          // Limpieza automática
          setTimeout(() => {
              if (sparkle.parentNode) {
                  sparkle.parentNode.removeChild(sparkle);
              }
          }, duration * 1000 + 100);
      }
  }

  // Inicializar el efecto DESPUÉS del listener principal del DOM
  // Esta es una forma segura de añadir la inicialización
  // sin crear un segundo listener.
  if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => new ManradoSparkleEffect());
  } else {
      // El DOM ya está cargado, inicializar directamente.
      new ManradoSparkleEffect();
  }
  /* --- Fin: Efecto Sutil "Sparkle" --- */

});
