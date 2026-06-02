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
function lines(raw) { return String(raw).split(/\r?\n/); }
function field(raw, key) {
  const pre = key + ':';
  for (const ln of lines(raw)) {
    if (ln.startsWith(pre)) {
      let v = ln.slice(pre.length).trim();
      if (v.length > 1 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) v = v.slice(1, -1);
      return v;
    }
  }
  return '';
}
function isTrue(raw, key) { return field(raw, key).toLowerCase() === 'true'; }

const files = readdirSync(DIR).filter((f) => (f.endsWith('.md') || f.endsWith('.mdx')) && !f.startsWith('_'));
const entries = files
  .map((f) => { const raw = readFileSync(join(DIR, f), 'utf8'); return { f, raw, date: field(raw, 'date').slice(0, 10), draft: isTrue(raw, 'draft'), lead: isTrue(raw, 'lead') }; })
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
