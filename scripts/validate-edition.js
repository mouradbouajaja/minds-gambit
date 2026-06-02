import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Word-count limits are MAXIMUMS that protect the fixed layout boxes.
// Shorter is fine; an edition only fails if text would overflow a box.
const NL = '\n';
const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = join(HERE, '..', 'src', 'content', 'daily');
const MAX = { leadHead: 16, leadSummary: 58, storyHead: 12, storySummary: 48 };

function wc(s) { return String(s || '').trim().split(/\s+/).filter(Boolean).length; }
function field(raw, key) {
  const m = raw.match(new RegExp('^' + key + ':[ \\t]*(.*)$', 'm'));
  if (!m) return '';
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
function flag(raw, key) { return new RegExp('^' + key + ':\\s*true\\s*$', 'm').test(raw); }
function dateOf(raw) { const m = raw.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m); return m ? m[1] : ''; }

const files = readdirSync(DIR).filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'));
const entries = files
  .map((f) => { const raw = readFileSync(join(DIR, f), 'utf8'); return { f, raw, date: dateOf(raw), draft: flag(raw, 'draft'), lead: flag(raw, 'lead') }; })
  .filter((e) => e.date && !e.draft);

if (!entries.length) { console.log('[validate-edition] No editions found; skipping.'); process.exit(0); }

const latest = entries.map((e) => e.date).sort().reverse()[0];
const edition = entries.filter((e) => e.date === latest);
console.log('[validate-edition] Validating latest edition: ' + latest + ' (' + edition.length + ' files)');

const errors = [];
for (const e of edition) {
  const hMax = e.lead ? MAX.leadHead : MAX.storyHead;
  const sMax = e.lead ? MAX.leadSummary : MAX.storySummary;
  const role = e.lead ? 'LEAD' : 'STORY';
  const h = wc(field(e.raw, 'headline'));
  const s = wc(field(e.raw, 'summary'));
  if (h > hMax) errors.push('  - ' + e.f + ' [' + role + ' headline] ' + h + ' words, max ' + hMax);
  if (s > sMax) errors.push('  - ' + e.f + ' [' + role + ' summary] ' + s + ' words, max ' + sMax);
}

if (errors.length) {
  console.error('[validate-edition] FAILED - text over the box limit:' + NL + errors.join(NL));
  process.exit(1);
}
console.log('[validate-edition] PASS - ' + edition.length + ' files within box limits.');
process.exit(0);
// scripts/validate-edition.js
// Build-time word-count enforcement for The Daily Gambit (v3 ChessBase card spec).
//
// Runs as an npm "prebuild" hook, so `astro build` (and therefore Vercel) fails
// if the LATEST edition's lead/story summaries or headlines fall outside their
// slot windows. Older editions are grandfathered (written under a legacy spec).
//
// Single source of truth for the windows lives in SLOTS below. These numbers come
// from the locked v3 mock's wc-badge markers (+/-5%). v1 scope: 5 summaries + 6
// headlines (lead + 4 secondary stories). Tile/rotation slots are a separate v2 gate.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAILY_DIR = fileURLToPath(new URL('../src/content/daily', import.meta.url));

// ---- word counter (matches the spec's wordsIn) ----
const wordsIn = (s) => String(s == null ? '' : s).trim().split(/\s+/).filter(Boolean).length;

// ---- slot windows (min/max inclusive, words) ----
// Secondary slots are keyed by tileVariant, which the lock rule hard-codes per slot.
const LEAD = {
  headline: { min: 12, max: 14 },
  summary:  { min: 52, max: 58 },
};
const STORY = {
  // tileVariant -> windows. Story 2=blue, 3=red, 4=fide, 5=industry.
  blue:     { label: 'STORY 2 (blue)',     headline: { min: 7, max: 10 }, summary: { min: 43, max: 47 } },
  red:      { label: 'STORY 3 (red)',      headline: { min: 7, max: 10 }, summary: { min: 38, max: 42 } },
  fide:     { label: 'STORY 4 (fide)',     headline: { min: 7, max: 10 }, summary: { min: 43, max: 47 } },
  industry: { label: 'STORY 5 (industry)', headline: { min: 7, max: 10 }, summary: { min: 43, max: 47 } },
};

// ---- minimal YAML frontmatter reader (only the scalar string fields we need) ----
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const body = m[1];
  const out = {};
  const re = /^([A-Za-z0-9_]+):[ \t]*(.*)$/gm;
  let g;
  while ((g = re.exec(body)) !== null) {
    const key = g[1];
    let val = g[2].trim();
    if (val === '' || val === '|-' || val === '|' || val === '>') continue; // skip blocks/empties
    // strip surrounding quotes and unescape escaped quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
    if (!(key in out)) out[key] = val;
  }
  return out;
}

function isTrue(v) { return v === true || v === 'true'; }

// ---- collect non-draft entries with a parsed date ----
const files = readdirSync(DAILY_DIR).filter(f => f.endsWith('.md') && !f.startsWith('_'));
const entries = [];
for (const f of files) {
  const raw = readFileSync(join(DAILY_DIR, f), 'utf8');
  const fm = parseFrontmatter(raw);
  if (!fm || !fm.date) continue;
  if (isTrue(fm.draft)) continue;
  entries.push({ file: f, fm, date: String(fm.date).slice(0, 10) });
}

if (entries.length === 0) {
  console.error('[validate-edition] No daily entries found - aborting.');
  process.exit(1);
}

// ---- latest edition = max date ----
const latest = entries.map(e => e.date).sort().at(-1);
const edition = entries.filter(e => e.date === latest);
console.log(`[validate-edition] Validating latest edition: ${latest} (${edition.length} files)`);

const errors = [];
function check(file, slot, field, value, win) {
  const wc = wordsIn(value);
  if (wc < win.min || wc > win.max) {
    errors.push(
      `  ${file}` + NL +
      `    slot: ${slot} | field: ${field}` + NL +
      `    actual: ${wc} words | allowed: ${win.min}-${win.max} words`
    );
  }
}

// ---- validate lead + the four hard-coded secondary slots ----
const leads = edition.filter(e => isTrue(e.fm.lead));
if (leads.length !== 1) {
  errors.push(`  edition ${latest}` + NL + `    slot: LEAD` + NL + `    expected exactly 1 lead:true file, found ${leads.length}`);
}
for (const e of leads) {
  check(e.file, 'LEAD', 'headline', e.fm.headline, LEAD.headline);
  check(e.file, 'LEAD', 'summary', e.fm.summary, LEAD.summary);
}

for (const e of edition) {
  if (isTrue(e.fm.lead)) continue;
  const variant = e.fm.tileVariant;
  const slot = STORY[variant];
  if (!slot) continue; // opening-spotlight / unknown tiles are not v1-gated
  check(e.file, slot.label, 'headline', e.fm.headline, slot.headline);
  check(e.file, slot.label, 'summary', e.fm.summary, slot.summary);
}

// ---- report ----
if (errors.length > 0) {
  console.error(NL + '[validate-edition] FAILED - edition out of slot spec:' + NL);
  console.error(errors.join(NL + NL));
  console.error(NL + `[validate-edition] ${errors.length} violation(s). Build aborted.` + NL);
  process.exit(1);
}

console.log('[validate-edition] PASS - all gated slots within spec.');
process.exit(0);

