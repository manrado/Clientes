import { qsa } from './dom.js';

export function initHeroTags() {
  const tags = qsa('.hero-tags .tag');
  const serviceCards = qsa('#servicios .card[data-index]');

  if (!tags.length || !serviceCards.length) return;

  tags.forEach(tag => {
    const targetIndex = Number(tag.getAttribute('data-target'));

    tag.setAttribute('tabindex', '0');
    tag.setAttribute('role', 'button');
    tag.setAttribute('aria-label', `Ver servicio: ${tag.textContent}`);

    tag.addEventListener('mouseenter', () => {
      if (serviceCards[targetIndex]) serviceCards[targetIndex].classList.add('highlight');
      tag.classList.add('active');
    });
    tag.addEventListener('mouseleave', () => {
      if (serviceCards[targetIndex]) serviceCards[targetIndex].classList.remove('highlight');
      tag.classList.remove('active');
    });

    const scrollToCard = () => {
      if (serviceCards[targetIndex]) {
        serviceCards[targetIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
        serviceCards[targetIndex].classList.add('highlight');
        setTimeout(() => serviceCards[targetIndex].classList.remove('highlight'), 2000);
      }
    };

    tag.addEventListener('click', scrollToCard);
    tag.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToCard();
      }
    });
  });
}
