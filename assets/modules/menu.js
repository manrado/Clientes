import { qs, qsa } from './dom.js';

// Focus trap helper
function trapFocus(container) {
  const focusable = 'a[href], button:not([disabled]), [tabindex]';
  const nodes = qsa(focusable, container).filter(n => n.offsetParent !== null);
  if (!nodes.length) return () => {};
  let first = nodes[0];
  let last = nodes[nodes.length - 1];

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', handleKeyDown);

  // Return cleanup
  return () => document.removeEventListener('keydown', handleKeyDown);
}

export function initMobileMenu() {
  const menuBtn = qs('.mobile-menu-btn');
  const navLinks = qs('.nav-links');

  if (!menuBtn || !navLinks) return;

  let untrap = null;
  let lastFocus = null;

  function openMenu() {
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Cerrar menú');
    navLinks.classList.add('active');
    navLinks.setAttribute('aria-hidden', 'false');
    // Save last focus and focus first item
    lastFocus = document.activeElement;
    const first = navLinks.querySelector('a');
    first && first.focus();
    // trap focus
    untrap = trapFocus(navLinks);
  }

  function closeMenu() {
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
    navLinks.classList.remove('active');
    navLinks.setAttribute('aria-hidden', 'true');
    // restore focus
    if (lastFocus) lastFocus.focus();
    if (untrap) { untrap(); untrap = null; }
  }

  menuBtn.addEventListener('click', () => {
    const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeMenu(); else openMenu();
  });

  navLinks.addEventListener('click', (e) => {
    if (e.target && e.target.matches('a')) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
      closeMenu();
    }
  });

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
      closeMenu();
    }
  });
}
