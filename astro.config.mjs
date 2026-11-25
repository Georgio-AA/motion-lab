// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { demos } from './src/data/site.js';

// Hosted on GitHub Pages under /motion-lab/. Moving to a custom domain later:
// set SITE to the domain and BASE to '/'. Nothing else needs to change.
const SITE = 'https://georgio-aa.github.io';
const BASE = '/motion-lab';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  // Demos live in public/ as static pages; hovering a link fetches it ahead of the click.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      // The sitemap only sees Astro pages, so the static demo pages are listed explicitly.
      customPages: demos.map(d => `${SITE}${BASE}/${d.slug}/`),
      // Drop the 404 page and the slash-less duplicate of the home URL.
      filter: page => !page.includes('/404') && page !== `${SITE}${BASE}`,
    }),
  ],
});
