/**
 * Service Worker Registration
 * Registro con manejo de actualizaciones
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      
      // Verificar actualizaciones cada hora
      setInterval(() => registration.update(), 1000 * 60 * 60);

      // Notificar actualizaciones disponibles
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Nueva versión disponible');
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}
