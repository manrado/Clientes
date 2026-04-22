import { registerServiceWorker } from './modules/sw-register.js';

// Registrar Service Worker
registerServiceWorker();

const trackEvent = (eventName, detail = {}) => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, detail);
  }

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...detail });
  }

  document.dispatchEvent(new CustomEvent('manrado:track', { detail: { eventName, ...detail } }));
};

// Módulos críticos - cargar inmediatamente
import('./modules/smooth-scroll.js').then(({ initSmoothScroll }) => {
  initSmoothScroll();
});

// Módulos diferidos - cargar cuando el navegador esté idle
const loadDeferredModules = () => {
  // Menú móvil
  import('./modules/menu.js').then(({ initMobileMenu }) => {
    initMobileMenu();
  });

  const hero = document.querySelector('.hero');
  if (hero) {
    const markHeroView = () => {
      trackEvent('hero_view', { page: window.location.pathname });
    };

    if ('IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver((entries, observer) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          markHeroView();
          observer.disconnect();
        }
      }, { threshold: 0.4 });

      heroObserver.observe(hero);
    } else {
      markHeroView();
    }
  }

  document.querySelectorAll('[data-track]').forEach((element) => {
    element.addEventListener('click', () => {
      trackEvent('cta_click', {
        page: window.location.pathname,
        label: element.dataset.track
      });
    });
  });

  // FAB keyboard accessibility
  const fab = document.querySelector('.fab-contact');
  if (fab) {
    fab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fab.click();
      }
    });
  }

  // Copyright year
  const yearSpan = document.getElementById('copyright-year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
};

// Usar requestIdleCallback o fallback a setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(loadDeferredModules, { timeout: 2000 });
} else {
  setTimeout(loadDeferredModules, 100);
}
