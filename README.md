# Motion Lab

Interactive web experiments by **Georgio Abi Aad** — websites that feel alive.

**Live site:** https://georgio-aa.github.io/motion-lab/

Eleven concept demos, each a standalone page:

| # | Demo | What it shows |
|---|------|---------------|
| 01 | Scroll Story | 3D product reveal driven by scroll |
| 02 | Living Backgrounds | Cursor-reactive WebGL backgrounds |
| 03 | Editorial | Agency-style landing page with scroll reveals |
| 04 | Playful Auth | Login and form interactions with personality |
| 05 | Dashboards | Animated project dashboard (drag & drop, charts, themes) |
| 06 | Node Networks | Live AI-agent network visualization |
| 07 | Iso Worlds | Isometric 3D town with agents you can follow |
| 08 | Ops Worlds | Warehouse and airport simulations with real traffic lanes |
| 09 | SaaS Landing | Client-ready SaaS landing page template |
| 10 | Restaurant | Cinematic scroll-film restaurant site |
| 11 | E-commerce | Product page with a 3D product, live finishes and a cart drawer |

The home page is built with [Astro](https://astro.build) (static output, self-hosted Manrope, native
scroll-driven animations, Popover API menu). The eleven demos are plain HTML, CSS and JavaScript with
three.js and GSAP; they live untouched in `public/` and need no build.
All brands, products and data in the demos are fictional concept work.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321/motion-lab/
npm run build    # static site in dist/
```

Home page copy lives in `src/data/site.js`. To add a photo, put it in `public/img/` and set `owner.photo`.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes `dist/`
to the `gh-pages` branch that GitHub Pages serves.

To move to a custom domain, change `SITE` and `BASE` in `astro.config.mjs`.