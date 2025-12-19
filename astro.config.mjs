// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';
import { remarkDetectFootnotes } from './src/plugins/footnotes';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  site: 'https://toasty-sunbeam.github.io',
  integrations: [svelte()],
  markdown: {
    remarkPlugins: [remarkDetectFootnotes],
  },
});