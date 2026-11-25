# Saffron & Ember — An evening by the fire

A fictional Levantine kitchen imagined in Portland. No real clients, results,
availability, ordering, or booking service are represented.

## Art direction

Near-black warm plaster, film grain, saffron type and fire. The former storefront,
room, arch, chairs, tables, lamps, and cream card grid have been removed.

- `index.html`, `style.css`: cinematic typography, native sticky table, calm copy
  columns, linen/plaster candlelight mask, kitchen, menu, booking and hours.
- `fire.js`: overlapping flame tongues with a continuous combustion/ember base,
  tallest near the center, upward-advected turbulence, hot pale cores,
  orange/red edges and premultiplied additive glow; a single instanced points draw
  for sparks per canvas, visible-only rendering and DPR cap 1.5. Sustained slow
  frames lower DPR and spark count. Warm CSS glow is the static fallback.
- `illustrations.js`: cached original canvas food paintings. Ceramic rim glints,
  directional gradients, glossy oil, highlighted herbs, individual rice grains,
  torn blistered pita, water glass, olive-oil bowl, and internal shadows.
- `film.js`, `film-layout.js`: four-course absolute scroll timeline. Plates enter
  from the edges before their label becomes active and stay completely served
  throughout its active interval, then clear after the next course arrives.
  A larger overlapping composition sits on varied horizontal walnut boards with
  seams and knots, folded linen, cutlery and scattered garnish. Hand-poured wax,
  melt pools, small luminous flames, light pools and steam add atmosphere.
  No scroll interception, external animation libraries, or stateful tween starts.
- `menu-data.js`, `main.js`: original menu, AND dietary filters, animated rows,
  keyboard tabs, floating cursor plates, inline touch previews; guest stepper,
  next-seven-day dates, time slots and a local-only confirmation.

The full wordmark is one line on desktop and three lines on narrow screens.
Reduced motion renders stationary fire/table and exposes all course descriptions.
All canvas shadows are painted within the assets. Textures and visuals are local
procedural code; only fonts are fetched. Shared back-link and transitions are reused.

The preview keeps its existing canonical and OG image references. Updating the
root `og/10-restaurant.jpg` is outside this folder-only task.

No build, packages, installation, dev server or commit is required here.
