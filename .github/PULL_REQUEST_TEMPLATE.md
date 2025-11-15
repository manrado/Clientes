## Refactor: SVG Sprite + Modularize JS (menu, tags, particles, smooth-scroll)

### Summary
This PR extracts inline SVG icons into a single sprite (`assets/icons.svg`) and modularizes the site's JavaScript into `assets/modules/*`. It also implements particle pooling to reduce GC pressure and improves accessibility on the mobile menu.

### Changes
- Added: `assets/icons.svg` (Sprite with `<symbol>` elements)
- Replaced inline icons in `index.html` with `<use href="/assets/icons.svg#...">` references
- Added JS modules in `assets/modules/`:
  - `dom.js`: simple DOM helpers
  - `menu.js`: mobile menu with focus trap and aria management
  - `hero-tags.js`: hero tag interactions, keyboard-friendly
  - `smooth-scroll.js`: handles anchor scrolling with focus
  - `particles.js`: particle system with pooling and visibility pausing
- `assets/scripts.js` now imports and initializes modules as ES module
- Styling utility: `.icon` added in `assets/styles.css`
- Fixed report link to `/reportes/index.html`

### Why
- Reduces duplication and improves maintainability (single source of icons)
- Improves modularity and readability of JS code
- Reduces GC pressure and runtime overhead thanks to particle pooling
- Added A11y improvements (focus trap & aria toggles)

### Testing Checklist (required)
- [ ] Launch the dev server and open `index.html`.
- [ ] Verify header and action icons show correctly (desktop and mobile).
- [ ] Verify the `Acceder a reportes` link opens `/reportes/index.html`.
- [ ] Verify the mobile menu toggles with `aria-expanded` and focuses on first link.
- [ ] With menu open, press `Tab / Shift+Tab` to ensure focus is trapped within the menu.
- [ ] Click tags in the hero section and test keyboard activation (Enter/Space) — check highlight and scroll behavior.
- [ ] Click on canvas to create bursts and hold to generate dust; confirm particles stop when page becomes hidden.
- [ ] Perform a basic performance check (DevTools Performance/Memory) and confirm reduced GC spikes versus prior version.
- [ ] Run `dev/run-validate.ps1` or `python tools/validate_performance.py --root .` and resolve any critical warning.

### QA Notes / Reviewer Tips
- If icons do not appear and you serve the site from a subpath, update `use` references to relative paths.
- Verify `assets/icons.svg` is accessible and not blocked by CORS if hosting the sprite separately.
- For older browser support (no ES module), add a transpilation or fallback path.

### Rollback Plan
If regressions are detected, revert to `main` or revert the PR. Keep a copy of the original `index.html` and `assets/scripts.js` for quick restore.

---

Please run the testing checklist above and leave any issues in code review comments.