import { registerServiceWorker } from './modules/sw-register.js';

// Registrar Service Worker
registerServiceWorker();

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
