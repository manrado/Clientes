import { qsa } from './dom.js';

export function initSmoothScroll() {
  qsa('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      if (href === '#' || !href.startsWith('#')) return;
      if (this.getAttribute('href').includes('mailto:') || this.getAttribute('href').includes('http')) return;

      e.preventDefault();
      const targetElement = document.querySelector(href);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus();
      }
    });
  });
}
