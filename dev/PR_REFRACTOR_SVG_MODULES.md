# PR: Refactor — SVG sprite & Modularize scripts

This PR extracts inline SVG icons into a shared sprite and modularizes `assets/scripts.js` into `assets/modules/`.

## What changed
- Added `assets/icons.svg` a shared icon sprite (symbols).
- Converted inline SVGs in `index.html` to `<svg><use href="/assets/icons.svg#icon-name"></use></svg>` references.
- Created JS modules under `assets/modules/`: `dom.js`, `menu.js`, `hero-tags.js`, `smooth-scroll.js`, `particles.js`.
- Replaced monolithic `assets/scripts.js` with module-based entry that imports modules and initializes them.
- Updated `index.html` script tag to `<script type="module">`.
- Updated `href` for report link to `/reportes/index.html` and added `aria-hidden` to `#nav-links` element.
 - Implemented particle pooling in `assets/modules/particles.js` to reduce object allocations and GC pressure.

## Testing checklist (manual):
1. Start the local server: `.\dev\start-server.ps1` (or `python -m http.server`) and navigate to `http://localhost:PORT`.
2. Visual: Verify all icons render (header, menu, service cards, service list checks).
3. Mobile menu: open/close; verify `aria-expanded` and `aria-hidden` toggles and focus trap using keyboard.
4. Tag interactions: click and keyboard navigate to service cards; ensure highlight animation.
5. Particles: click to create burst and hold to create dust; verify animation stops when switching browser tabs (performance check).
	- Verify pooling: observe that GC activity/pause is reduced by monitoring performance tab.
6. Run `dev/run-validate.ps1` or `python tools/validate_performance.py index.html` to validate accessibility counts and warnings.
7. Lint (optional): If repo uses eslint/prettier, run `npm run lint`.

## Notes
- The sprite is referenced as `/assets/icons.svg#id`. If the project is served under a subpath, update references to relative paths accordingly.
- For older browsers or non-module environments, consider adding a fallback or transpilation pipeline.
