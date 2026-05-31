
# The Daily Gambit — Automation Guide

This document is the single source of truth for the automated publishing pipeline that feeds the /daily newspaper page. It is meant to be read by whoever wires up the n8n workflow. Nothing here runs on its own — n8n, the GitHub token, and the LLM API key are configured outside this repository.

## How publishing works (the contract)

The /daily page (src/content/daily.astro) renders stories from the Astro content collection daily. To publish a story, drop a single Markdown file into:

    src/content/daily/

Vercel detects the commit, rebuilds, and the new story appears automatically. No code changes are needed per story. This is the ONLY thing the automation has to do: commit one correctly-formatted Markdown file per story.

## Edition model: ARCHIVE (not replace)

Each edition is a NEW dated file. Old files are kept, building a back catalogue. Do not delete or overwrite yesterday's files. The page sorts newest-first and chooses the lead automatically.

## File naming (slug rule)

    src/content/daily/YYYY-MM-DD-<slug>.md

Examples:

    src/content/daily/2026-05-31-carlsen-wins-norway.md

    src/content/daily/2026-05-31-pittsburgh-spring-open.md

Date prefix = the edition date (ISO 8601). Slug = lowercase headline, words joined by hyphens, no punctuation, ~6 words max. One file per story. A morning edition is typically 3–6 files committed together.

## Frontmatter schema (must match content.config.ts)

Every file begins with a YAML frontmatter block:

    ---

    headline: "Carlsen Edges Nakamura in Norway Chess Armageddon"

    subhead: "World no. 1 holds the lead going into the final round"

    summary: "A short ORIGINAL summary in your own words. 2-4 sentences. Never copy the source."

    section: "tournaments"

    kicker: "Norway Chess"

    date: 2026-05-31

    sourceName: "Chess.com"

    sourceUrl: "https://www.chess.com/news/..."

    lead: false

    pinned: false

    draft: false

    ---

### Required vs optional

Required: headline, summary, section, date.

Optional: subhead, kicker, sourceName, sourceUrl, lead, pinned, draft.

Exactly ONE story per edition should have lead: true.

## Page slot logic

Lead: the story with lead: true, else newest non-local story.

Secondary column: non-local, non-lead stories (max 4).

Local column: stories with section: "local" (max 4) — Pittsburgh / Pennsylvania.

Preview banner: shows ONLY when the collection is empty.

## COPYRIGHT — non-negotiable

Automated stories MUST be short, ORIGINAL summaries that LINK OUT to the source via sourceUrl. Never republish full articles, never paste source paragraphs, never reproduce more than a brief factual quote. Keep summaries to 2-4 original sentences.

## Editorial voice — assume the reader doesn't know the names

The Daily Gambit's primary audience is American chess players — most are not elite-rated and do not follow the European or Asian tour closely. Names like Murzin, Hnatyshyn, Keymer, Divya, Praggnanandhaa, or Firouzja may not be instantly recognized. The editorial voice should be warmly educational, never assuming knowledge it shouldn't.

When a player appears in a story for the first time, briefly introduce them: country, current rating range (if notable), one signature achievement, and age when relevant.

Examples:

- "Russian GM Volodar Murzin, the 18-year-old who stunned chess by winning the 2024 World Rapid Championship..."

- "Ukrainian WGM Anastasiia Hnatyshyn, a rising 2400+ talent..."

- "Indian GM Divya Deshmukh, 19, the 2024 Women's World Cup champion..."

- "American GM Wesley So, the 2017 U.S. Champion and former world top-5..."

Repeat introductions are unnecessary inside the same edition.

Names that do NOT need introduction in any chess context: Magnus Carlsen, Hikaru Nakamura, Fabiano Caruana, Gukesh Dommaraju, Garry Kasparov, Bobby Fischer, Vladimir Kramnik, Anatoly Karpov.

When introducing a tournament or opening, the same rule applies: one sentence of orientation before diving in.

## Geographic anchors — don't assume reader geography

Americans often do not know where mid-size countries sit on a map. Real example from the editor's life: a DMV employee, given the answer "Tunisia," assumed the country was somewhere in Latin America. The Daily Gambit cannot assume better. For any country outside the "Americans know it" zone, add a one-clause geographic anchor on first reference.

"Americans know it" zone (no anchor needed): United States, Canada, Mexico, United Kingdom, France, Germany, Italy, Spain, Russia, China, India, Japan.

For everything else, add a brief geographic anchor:

- "Uzbek GM Nodirbek Abdusattorov, from Tashkent in Central Asia north of Afghanistan..."

- "Azerbaijani GM Teimour Radjabov, from the South Caucasus between Russia and Iran..."

- "Slovenian GM Anton Korobov, from the small Alpine country just east of Italy..."

- "Tunisian player so-and-so, from the North African Mediterranean coast facing Sicily..."

The anchor is one clause. Do not over-explain.

## The Wife Test — the editorial floor

Many readers will be chess-curious, not chess-deep. Teenagers learning the game. Kids whose parents bought them a chess set. Mothers and spouses who clicked the link a family member shared. Adults who heard about the Carlsen-Niemann story and wandered in. The Daily Gambit is for them too.

The test: if the editor's wife — intelligent adult, English-fluent, not a chess player — could not follow a story without Googling something, the story is not finished. Rewrite it.

Concretely, introduce every:

- Player by full name, country, and a one-clause signature on first reference.

- Tournament by name, location, format, and stakes. ("Norway Chess, an elite annual tournament held each May in Stavanger featuring the world's top players in a closed round-robin.")

- Opening, gambit, or named line by what it is and where it appears in a typical game. ("The Berlin Defense, a Black response to the Ruy Lopez chess opening that arises after 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6.")

- Chess concept with a working definition the first time it appears in an edition.

- Title abbreviation the first time it appears. ("GM, the grandmaster title — the highest title FIDE awards.")

- Federation / governing body the first time it appears. ("FIDE, the international chess federation that governs world-title competition.")

When in doubt, write for the curious newcomer, not the rated player.

## Page ordering priority

When choosing the lead and column order, prioritize stories that matter most to the primary audience:

1. USA — stories involving American players, U.S. events, or U.S. institutions.

2. Pennsylvania — state-level news, championships, federation activity.

3. Pittsburgh — local clubs, scholastic, regional tournaments.

4. World — everything else.

Lead stories should come from tiers 1-3 when possible. A purely international story should only lead when its global significance dwarfs anything in tiers 1-3.

## Suggested sources

World / tournaments / players / openings:

- Chess.com news (RSS / HTTP)

- ChessBase

- Lichess blog

- TWIC (The Week in Chess)

- FIDE news

Local (Pittsburgh / Pennsylvania) — keep SEMI-MANUAL at first:

- US Chess (new.uschess.org)

- Pennsylvania State Chess Federation

- Pittsburgh-area club pages and event listings

## n8n workflow blueprint

1. Schedule Trigger — daily ~6:00 AM local.

2. Gather — RSS Read / HTTP Request nodes for each source above (or one Nimble CLI call).

3. Filter & dedupe — drop items older than 24h; dedupe by title/URL.

4. LLM node — synthesise each item into the JSON below. Mark the single most important world story as the lead.

5. Function node — convert each JSON object into a Markdown file.

6. GitHub node — commit each file to src/content/daily/ on main.

7. Vercel — auto-deploys on push.

## LLM synthesis prompt (copyright-safe)

    You are the news editor for "The Daily Gambit", a chess newspaper.

    Given a source article's title, snippet, and URL, write a SHORT ORIGINAL

    summary in your own words. Do NOT copy phrases from the source. 2-4 sentences.

    Return ONLY valid JSON with these fields:

    headline (string, rewritten in your own words, <= 90 chars)

    subhead (string or null)

    summary (string, 2-4 original sentences)

    section (one of: world, tournaments, players, openings, local, opinion, puzzle)

    kicker (short label such as the event name, or null)

    Apply the editorial rules from DAILY_GAMBIT_AUTOMATION.md: introduce every

    player, tournament, opening, concept, title abbreviation, and federation on

    first reference (Wife Test). Add a geographic anchor for any country outside

    the "Americans know it" zone. Prioritize US > PA > Pittsburgh > World when

    picking the lead.

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

- Editorial rules (voice, geography, Wife Test, page ordering) applied to every story.
