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

  // FAB keyboard accessibility + mailto fallback (copia al portapapeles si no hay cliente de correo)
  const fab = document.querySelector('.fab-contact');
  if (fab) {
    fab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fab.click();
      }
    });

    const showToast = (msg) => {
      let toast = document.getElementById('fab-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'fab-toast';
        toast.setAttribute('role', 'status');
        toast.style.cssText = 'position:fixed;bottom:5.5rem;right:1rem;z-index:9999;background:#08111b;color:#fff;padding:0.7rem 1rem;border-radius:0.5rem;font-size:0.9rem;box-shadow:0 6px 20px rgba(0,0,0,0.35);max-width:90vw;opacity:0;transition:opacity .2s ease;';
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => { toast.style.opacity = '0'; }, 4000);
    };

    fab.addEventListener('click', (e) => {
      const href = fab.getAttribute('href') || '';
      const match = href.match(/^mailto:([^?]+)/i);
      if (!match) return;
      const email = match[1];
      const start = Date.now();
      // Si tras 600ms la pestaña sigue visible y enfocada, asumimos que no hubo handler
      setTimeout(() => {
        if (document.visibilityState === 'visible' && document.hasFocus() && Date.now() - start < 1500) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(email).then(
              () => showToast(`Correo copiado: ${email}`),
              () => showToast(`Escríbenos a ${email}`)
            );
          } else {
            showToast(`Escríbenos a ${email}`);
          }
        }
      }, 600);
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
