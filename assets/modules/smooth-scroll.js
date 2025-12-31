export function initSmoothScroll() {
  // Usa delegación de eventos para mejor rendimiento
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (href === '#' || !href.startsWith('#')) return;
    if (href.includes('mailto:') || href.includes('http')) return;

    e.preventDefault();
    const targetElement = document.querySelector(href);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetElement.setAttribute('tabindex', '-1');
      targetElement.focus();
    }
  });
}
