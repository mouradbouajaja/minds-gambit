import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
      integrations: [mdx(), sitemap()],
      site: 'https://mindsgambit.com',
      output: 'server',
      adapter: vercel(),
});
