# Saffron & Ember

An original illustrated Levantine restaurant concept in Portland. The restaurant,
address, menu and availability are fictional; no real client claims are made.

## The film

Seven chapters share a continuous pinned frame: dusk arrival, perspective doors,
a dining-room dolly and gold letter title, open kitchen with embers, four tasting
courses, a horizontal gallery, and a final night scene with live opening hours.
The reservation form, illustrated map and footer continue in normal document flow.

Desktop has 12.45 viewport heights of pinned playback plus the stage and closing
sections, roughly 15-17 viewports overall. Mobile has 6.05 pinned viewport heights,
roughly 10 overall. ScrollTrigger uses 1.35-second scrub smoothing and gentle snapping
to readable rest poses after scrolling stops. Native wheel, touch and keyboard
scrolling remain available. Chapter links and course tabs scroll to timeline positions;
their active states follow the smoothed playback.

Every menu plate is permanently connected inline SVG. Dietary chips combine with
AND matching and dim nonmatching cards rather than removing or reinserting artwork.
SVG shadows are drawn inside the artwork, without CSS drop-shadow filters.

## Files

- `index.html`: complete static scenes, all 15 dishes, forms, map and concept labels.
- `style.css`: original palette, typography, form and map styles.
- `film.css`: layered scenes, responsive film framing and static fallbacks.
- `film.js`: optional GSAP/ScrollTrigger enhancement, navigation and dietary controls.
- `film-layout.js`: chapter lengths, course positions and rest poses.
- `embers.js`: preallocated canvas particles, visible only in the kitchen chapter.
- `kitchen.js`: original procedural open-kitchen illustration source.
- `illustrations.js`: reused original SVG facade, dining room and food illustrations.
- `menu-data.js`: unchanged sample dishes, prices, local hours and slot rules.
- `main.js`: existing reservations, ordering preview, hours and newsletter interactions.
- `validate.mjs`: dependency-free structure, menu interaction, timeline and data checks.

There is no install or build step. Serve the project through an existing static server.
Optional GSAP 3.12.5 modules use pinned jsDelivr URLs. The forms initialize before
the animation modules load. If those modules fail, the document stays a readable
stack of scenes. Reduced motion uses those static scenes and ordinary menu navigation.
Shared files are reused without modification. Google Fonts have local fallbacks.

## Preserved front-end flows

Reservations support the next 90 days, 1-8 guests, past/full time slots, name/phone/email
validation and an animated confirmation. Ordering remains a sample quantity-and-total
preview. No payment, reservation request, newsletter subscription or personal data
storage occurs. Production use needs real booking, ordering and newsletter providers.
The directions link continues to the Alberta neighborhood, not a purported business.
Open/closed status uses the visitor's device time; a real business should consistently
use its own time zone for both reservations and hours.

Update menu records in `menu-data.js` and the corresponding static cards in `index.html`
together. The SVG sources can be reused to refresh the inline illustrations.

## Performance and verification

Scene motion uses transforms and opacity. Embers use 18 particles on mobile and 40
on desktop, DPR capped at 1.5, and stop outside the active scene or a hidden tab.
Sustained frame times above 20ms reduce particle count and DPR. There is no WebGL
or scroll interception. Media-query changes revert the enhancement cleanly.

Run `node 10-restaurant/validate.mjs` from the project root. In restricted Windows
shells, pipe its UTF-8 contents to `node --input-type=module` instead. Checks cover
all 32 course/filter combinations through the actual menu handlers, permanent plate
identities, unique IDs and SVG references, rest navigation, local opening/closing
boundaries, sample availability and module syntax. All 30 inline SVGs also passed XML
validation. Browser preview access was denied by browser security policy, so visual
scroll playback and console verification remain unverified in this session. No server
was started and no commit was made.
