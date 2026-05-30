import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.string(),
    author: z.string().default('Mourad Bouajaja'),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const podcasts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/podcasts' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    youtubeId: z.string(),
    description: z.string().optional(),
    thumbnail: z.string().optional(),
    youtubeUrl: z.string().optional(),
  }),
});

// The Daily Gambit — one markdown file per story. Drop files in src/content/daily.
// n8n (or a human) writes these; the /daily page renders the latest automatically.
const daily = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/daily' }),
  schema: z.object({
    headline: z.string(),
    subhead: z.string().optional(),
    summary: z.string(),
    section: z.enum(['world', 'tournaments', 'players', 'openings', 'local', 'opinion', 'puzzle']).default('world'),
    kicker: z.string().optional(),
    date: z.coerce.date(),
    sourceName: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    lead: z.boolean().default(false),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, podcasts, daily };
