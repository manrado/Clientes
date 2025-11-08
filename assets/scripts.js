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

  /* --- Lógica del efecto 'Click Spark' temporal --- */
  let isSparkEffectEnabled = true;
  let currentIntervalSeconds = 4;
  let nextState = 'off';

  function createClickSpark(x, y) {
    if (!isSparkEffectEnabled) return;
    
    const star = document.createElement('span');
    star.classList.add('click-spark');
    star.textContent = '✨';
    
    star.style.left = x + 'px';
    star.style.top = y + 'px';
    
    const randomX = (Math.random() - 0.5) * 100;
    const randomY = (Math.random() - 0.5) * 100;
    
    star.style.setProperty('--sparkle-translateX', randomX + 'px');
    star.style.setProperty('--sparkle-translateY', randomY + 'px');
    
    document.body.appendChild(star);
    
    star.addEventListener('animationend', () => {
      star.remove();
    });
  }

  document.addEventListener('click', function(e) {
    for (let i = 0; i < 5; i++) {
      createClickSpark(e.clientX, e.clientY);
    }
  });

  function scheduleNextToggle() {
    const intervalMilliseconds = currentIntervalSeconds * 1000;
    
    console.log(`Efecto 'Spark' estará ${nextState === 'on' ? 'ENCENDIDO' : 'APAGADO'} durante ${currentIntervalSeconds} segundos.`);
    
    if (nextState === 'off') {
      isSparkEffectEnabled = false;
      nextState = 'on';
    } else {
      isSparkEffectEnabled = true;
      nextState = 'off';
    }
    
    setTimeout(scheduleNextToggle, intervalMilliseconds);
    currentIntervalSeconds *= 2;
  }

  setTimeout(scheduleNextToggle, 10000);

});
