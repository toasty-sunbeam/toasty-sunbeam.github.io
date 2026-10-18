// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import svelte from '@astrojs/svelte';
import { remarkExtractFootnotes } from './src/plugins/footnotes';
import { rehypeLinkFavicons } from './src/plugins/link-favicons';
import { rehypeResponsiveEmbeds } from './src/plugins/responsive-embeds';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  site: 'https://toasty-sunbeam.github.io',
  integrations: [svelte(), mdx()],
  markdown: {
    remarkPlugins: [remarkExtractFootnotes],
    rehypePlugins: [
      [rehypeLinkFavicons, { internalHosts: ['toasty-sunbeam.github.io'] }],
      rehypeResponsiveEmbeds,
    ],
  },
});