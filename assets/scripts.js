import { initMobileMenu } from './modules/menu.js';
import { initHeroTags } from './modules/hero-tags.js';
import { initParticleCanvas } from './modules/particles.js';
import { initSmoothScroll } from './modules/smooth-scroll.js';

// Entry point
document.addEventListener('DOMContentLoaded', () => {
	initMobileMenu();
	initHeroTags();
	initSmoothScroll();
	initParticleCanvas('#particle-canvas');
	// FAB keyboard accessibility (Enter/Space to open mailto)
	const fab = document.querySelector('.fab-contact');
	if (fab) {
		fab.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				// Trigger native click behavior (mailto)
				fab.click();
			}
		});
	}

	// COPYRIGHT YEAR
	const yearSpan = document.getElementById('copyright-year');
	if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});
