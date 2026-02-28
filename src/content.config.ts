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

export const collections = { blog, podcasts };
