# The Daily Gambit — Automation Guide

This document is the single source of truth for the automated publishing pipeline
that feeds the /daily newspaper page. It is meant to be read by whoever wires up the
n8n workflow. Nothing here runs on its own — n8n, the GitHub token, and the LLM API
key are configured outside this repository.

## How publishing works (the contract)

The /daily page (`src/content/daily.astro`) renders stories from the Astro content
collection `daily`. To publish a story, drop a single Markdown file into:

    src/content/daily/

Vercel detects the commit, rebuilds, and the new story appears automatically.
No code changes are needed per story. This is the ONLY thing the automation has to do:
commit one correctly-formatted Markdown file per story.

## Edition model: ARCHIVE (not replace)

Each edition is a NEW dated file. Old files are kept, building a back catalogue.
Do not delete or overwrite yesterday's files. The page sorts newest-first and
chooses the lead automatically.

## File naming (slug rule)

    src/content/daily/YYYY-MM-DD-<slug>.md

Examples:

    src/content/daily/2026-05-31-carlsen-wins-norway.md
    src/content/daily/2026-05-31-pittsburgh-spring-open.md

- Date prefix = the edition date (ISO 8601).
- Slug = lowercase headline, words joined by hyphens, no punctuation, ~6 words max.
- One file per story. A morning edition is typically 3–6 files committed together.

## Frontmatter schema (must match content.config.ts)

Every file begins with a YAML frontmatter block:

    ---
    headline: "Carlsen Edges Nakamura in Norway Chess Armageddon"
    subhead: "World no. 1 holds the lead going into the final round"   # optional
    summary: "A short ORIGINAL summary in your own words. 2-4 sentences. Never copy the source."
    section: "tournaments"   # world | tournaments | players | openings | local | opinion | puzzle
    kicker: "Norway Chess"   # optional small label above the headline
    date: 2026-05-31
    sourceName: "Chess.com"          # optional
    sourceUrl: "https://www.chess.com/news/..."   # optional but recommended
    lead: false      # true = front-page lead story (use for ONE story per edition)
    pinned: false    # optional
    draft: false     # true = hidden from the live site
    ---

Body (below the frontmatter) is optional Markdown. The page shows the summary on the
front page; the body is the full text behind "READ THE FULL STORY".

### Required vs optional
- Required: headline, summary, section, date
- Optional: subhead, kicker, sourceName, sourceUrl, lead, pinned, draft
- Exactly ONE story per edition should have `lead: true`.

## Page slot logic (so the automation knows what shows where)

- Lead: the story with `lead: true`, else newest non-local story.
- Secondary column: non-local, non-lead stories (max 4).
- Local column: stories with `section: "local"` (max 4) — Pittsburgh / Pennsylvania.
- Preview banner: shows ONLY when the collection is empty.

## COPYRIGHT — non-negotiable

Automated stories MUST be short, ORIGINAL summaries that LINK OUT to the source via
`sourceUrl`. Never republish full articles, never paste source paragraphs, never
reproduce more than a brief factual quote. Keep summaries to 2-4 original sentences.

## Suggested sources

World / tournaments / players / openings:
- Chess.com news (RSS / HTTP)
- ChessBase
- Lichess blog
- TWIC (The Week in Chess)
- FIDE news

Local (Pittsburgh / Pennsylvania) — keep SEMI-MANUAL at first, feeds are unreliable:
- US Chess (new.uschess.org)
- Pennsylvania State Chess Federation
- Pittsburgh-area club pages and event listings

## n8n workflow blueprint

1. Schedule Trigger — daily ~6:00 AM local.
2. Gather — RSS Read / HTTP Request nodes for each source above.
3. Filter & dedupe — drop items older than 24h; dedupe by title/URL.
4. LLM node — synthesise each item into the JSON below using the prompt in the next
   section. Mark the single most important world story as the lead.
5. Function node — convert each JSON object into a Markdown file: build the
   YYYY-MM-DD-slug.md filename and the frontmatter + body.
6. GitHub node — commit each file to src/content/daily/ on main.
7. Vercel — auto-deploys on push. Done.

## LLM synthesis prompt (copyright-safe)

    You are the news editor for "The Daily Gambit", a chess newspaper.
    Given a source article's title, snippet, and URL, write a SHORT ORIGINAL
    summary in your own words. Do NOT copy phrases from the source. 2-4 sentences.
    Return ONLY valid JSON with these fields:
      headline   (string, rewritten in your own words, <= 90 chars)
      subhead    (string or null)
      summary    (string, 2-4 original sentences)
      section    (one of: world, tournaments, players, openings, local, opinion, puzzle)
      kicker     (short label such as the event name, or null)
    Never invent facts not present in the source. Always preserve the source URL
    for attribution; it will be added separately.

## Function node — JSON to Markdown (reference)

    const fmDate = $json.date || new Date().toISOString().slice(0,10);
    const slug = $json.headline.toLowerCase()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').split('-').slice(0,6).join('-');
    const path = `src/content/daily/${fmDate}-${slug}.md`;
    const fm = [
      '---',
      `headline: ${JSON.stringify($json.headline)}`,
      $json.subhead ? `subhead: ${JSON.stringify($json.subhead)}` : null,
      `summary: ${JSON.stringify($json.summary)}`,
      `section: "${$json.section}"`,
      $json.kicker ? `kicker: ${JSON.stringify($json.kicker)}` : null,
      `date: ${fmDate}`,
      $json.sourceName ? `sourceName: ${JSON.stringify($json.sourceName)}` : null,
      $json.sourceUrl ? `sourceUrl: "${$json.sourceUrl}"` : null,
      `lead: ${$json.lead ? 'true' : 'false'}`,
      'draft: false',
      '---',
      '',
    ].filter(Boolean).join('\n');
    return { json: { path, content: fm + ($json.body || '') } };

## Checklist before going live

- GitHub token (repo write) stored in n8n credentials.
- LLM API key stored in n8n credentials.
- One file per story; exactly one lead per edition.
- Summaries original; sourceUrl present.
- Local section reviewed by a human until feeds are trusted.
