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

  /* --- Inicio: Lógica del efecto 'Click Spark' temporal --- */

  let isSparkEffectEnabled = true;
  let currentIntervalSeconds = 4; // Inicia en 4 segundos
  let nextState = 'off';

  // Función para crear una chispa individual
  function createClickSpark(x, y) {
    if (!isSparkEffectEnabled) return; // No crear chispas si está deshabilitado

    const star = document.createElement('span');
    star.classList.add('click-spark');
    star.textContent = '✨'; // ¡El emoji de chispa!

    // Posición inicial (donde se hizo clic)
    star.style.left = x + 'px';
    star.style.top = y + 'px';

    // Movimiento aleatorio para la animación
    const randomX = (Math.random() - 0.5) * 100; // Mov. horizontal
    const randomY = (Math.random() - 0.5) * 100; // Mov. vertical
    
    star.style.setProperty('--sparkle-translateX', randomX + 'px');
    star.style.setProperty('--sparkle-translateY', randomY + 'px');

    document.body.appendChild(star);

    // Eliminar la chispa del DOM después de la animación
    star.addEventListener('animationend', () => {
      star.remove();
    });
  }

  // 1. Escuchar todos los clics en la página
  document.addEventListener('click', function(e) {
    // Genera 5 chispas por clic
    for (let i = 0; i < 5; i++) {
      createClickSpark(e.clientX, e.clientY);
    }
  });

  // 2. Función recursiva para la lógica de tiempo
  function scheduleNextToggle() {
    const intervalMilliseconds = currentIntervalSeconds * 1000;
    
    // console.log(`Efecto 'Spark' estará ${nextState === 'on' ? 'ENCENDIDO' : 'APAGADO'} durante ${currentIntervalSeconds} segundos.`);

    if (nextState === 'off') {
      isSparkEffectEnabled = false;
      nextState = 'on'; // El próximo estado será 'on'
    } else {
      isSparkEffectEnabled = true;
      nextState = 'off'; // El próximo estado será 'off'
    }
    
    // Programar el siguiente cambio
    setTimeout(scheduleNextToggle, intervalMilliseconds);
    
    // Duplicar el intervalo para la próxima vez (4s, 8s, 16s...)
    currentIntervalSeconds *= 2;
  }

  // 3. Iniciar la lógica de tiempo
  // El efecto está ON por 10 segundos, luego inicia la lógica progresiva.
  setTimeout(scheduleNextToggle, 10000); // 10 segundos
  
  /* --- Fin: Lógica del efecto 'Click Spark' --- */

});
