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
    // Optional clean move list (no annotations) shown in a "Moves" box on the lead story.
    pgn: z.string().optional(),
    // Optional label above the moves box, e.g. the game heading.
    pgnLabel: z.string().optional(),
    // ---- Locked v3 mock tile fields (ChessBase-style designed tiles) ----
    // Editorial tile text shown ON the gradient card. Optional + backward-compatible:
    // when absent the template falls back to kicker/headline so slot height never collapses.
    tileKicker: z.string().optional(),   // e.g. "Norway Chess 2026 · Round 6"
    tileTitle: z.string().optional(),    // editorial hook, e.g. "The Race for the Lead in Stavanger"
    tileMeta: z.string().optional(),     // e.g. "Stavanger · Norway · June 1"
    tileVariant: z.enum(['blue', 'red', 'fide', 'industry', 'opening']).optional(),
    tileGlyph: z.string().optional(),    // single Unicode chess piece, e.g. "♛"
    // ---- Standings + Results (right-rail Box 1 + Box 2) ----
    standingsTitle: z.string().optional(),
    standingsRound: z.string().optional(),   // e.g. "Round 5"
    resultsTitle: z.string().optional(),
    results: z.array(z.object({ white: z.string(), black: z.string(), score: z.string(), note: z.string().optional() })).optional(),
    standings: z.array(z.object({ player: z.string(), score: z.string() })).optional(),
    standingsWomen: z.array(z.object({ player: z.string(), score: z.string() })).optional(),
    resultsOpen: z.string().optional(),      // multi-line "White – Black: score" block
    resultsWomen: z.string().optional(),
  }),
});

export const collections = { blog, podcasts, daily };
