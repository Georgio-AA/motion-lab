# Kivo — SaaS landing page concept

An original workflow automation brand, inspired by the motion and lime/black art direction of R12. All company wordmarks, workflow activity, pricing, and metrics are illustrative. There are no customer testimonials or claimed customer results.

## Files

- `index.html` — semantic page, six feature previews, native FAQ, pricing, and email form.
- `style.css` — responsive art direction, bento layout, glass navigation, CSS bar faces, and micro-animations.
- `main.js` — procedural canvas strands, visibility management, scroll effects, sample interactions, calculator, and local form validation. Imports the existing shared helpers.

Serve from the repository root with the project's static server and visit `/09-saas-landing/`. No build step, package installation, or third-party JavaScript libraries are required. The only external visual dependency is the font import in the shared stylesheet; system fallbacks keep the page usable.

## Customize

The palette and type tokens live at the top of `style.css`. Product copy, feature cards, plans, and FAQ content live in `index.html`. The `plans` array in `main.js` controls base prices, included runs, and overage rates. Keep the displayed plan entitlements consistent with that array. Annual billing discounts the full estimate by 20%, shows the monthly equivalent, and states the annual total.

The signup form validates locally, clears the entered address on success, and sends or stores nothing. Connecting real billing, integrations, accounts, or email capture requires a separate backend implementation.

## Motion and resilience

Scrolling is native. Canvas DPR starts at a maximum of 1.5 and adapts downward after sustained frame times above 20ms. Canvas rendering and continuous card animation pause off screen and in a hidden tab. Reduced motion renders a static ribbon, fully reveals the workflow/banner, and uses settled metrics. A failed or unavailable canvas leaves a static CSS atmosphere; the page content and controls remain independent.
