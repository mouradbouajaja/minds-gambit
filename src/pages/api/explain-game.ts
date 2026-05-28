// /api/explain-game — Full-game coach commentary in a single call.
//
// POST body: { moves: [{ ply, fen, played, best, severity, color, moveNumber, evalBefore, evalAfter }, ...] }
//   moves — array of notable moves (blunder/mistake/inaccuracy) to explain
//
// Returns: { explanations: [{ ply: number, text: string }, ...] }
//
// Cost protection:
//   * max_tokens: 2000 (caps Anthropic billing per call ~$0.03)
//   * Per-IP daily rate limit: 1 full-game explanation
//   * Response cache keyed by stringified-moves digest
//   * Anthropic monthly cap: set by Mourad to $20 — hard cutoff

import type { APIRoute } from 'astro';

const cache = new Map<string, { explanations: Array<{ ply: number; text: string }>; ts: number }>();
const ipCounts = new Map<string, { count: number; day: string }>();
const CACHE_MAX = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PER_IP_DAILY_LIMIT = 1; // One full-game explanation per IP per day

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkAndIncrementRate(ip: string): { allowed: boolean; remaining: number } {
  const t = today();
  const rec = ipCounts.get(ip);
  if (!rec || rec.day !== t) {
    ipCounts.set(ip, { count: 1, day: t });
    return { allowed: true, remaining: PER_IP_DAILY_LIMIT - 1 };
  }
  if (rec.count >= PER_IP_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  rec.count += 1;
  return { allowed: true, remaining: PER_IP_DAILY_LIMIT - rec.count };
}

function digest(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return String(h);
}

function getCache(key: string) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() - v.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return v.explanations;
}

function setCache(key: string, explanations: Array<{ ply: number; text: string }>) {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { explanations, ts: Date.now() });
}

function clean(s: any, maxLen = 200): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\x00-\x1f\x7f]/g, '').slice(0, maxLen);
}

// Strip markdown code fences from Claude's JSON response if present
function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith('```json')) t = t.slice(7);
  else if (t.startsWith('```')) t = t.slice(3);
  if (t.endsWith('```')) t = t.slice(0, -3);
  return t.trim();
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const apiKey = (import.meta as any).env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Full-game explanation not configured.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body: any;
  try { body = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!Array.isArray(body.moves) || body.moves.length === 0) {
    return new Response(JSON.stringify({ error: 'No notable moves to explain. This looks like a perfectly played game!' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Cap at 15 moves to keep cost predictable
  const moves = body.moves.slice(0, 15).map((m: any) => ({
    ply: parseInt(String(m.ply || 0), 10) || 0,
    fen: clean(m.fen, 120),
    played: clean(m.played, 16),
    best: clean(m.best, 16),
    severity: clean(m.severity, 16) || 'questionable',
    color: clean(m.color, 2) || 'w',
    moveNumber: parseInt(String(m.moveNumber || 0), 10) || 0
  })).filter((m: any) => m.ply && m.fen && m.played && m.best);

  if (moves.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid moves to explain.' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Cache check (same set of moves → same response)
  const cacheKey = digest(moves.map((m: any) => m.fen + '|' + m.played + '|' + m.best + '|' + m.severity).join('::'));
  const cached = getCache(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ explanations: cached, cached: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Per-IP daily limit
  const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rate = checkAndIncrementRate(ip);
  if (!rate.allowed) {
    return new Response(JSON.stringify({
      error: 'Daily limit reached.',
      message: 'You have used your free full-game explanation for today. Limit resets at midnight UTC.'
    }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Build a compact prompt
  const systemPrompt =
    'You are a friendly, experienced chess coach reviewing a student\'s game move-by-move. ' +
    'For each notable move you are given, write a 2-3 sentence explanation covering: ' +
    '(1) what the student likely intended with the played move, ' +
    '(2) the concrete tactical or positional reason it falls short, ' +
    '(3) why the better move is stronger in this specific position. ' +
    'Use natural coaching language. Do not include numerical evaluations or robotic phrasing. ' +
    'Refer to "Stockfish" (not "the engine"). Write to encourage, not scold. ' +
    'Write to a player who may be a child, teen, or older adult. Keep it accessible. ' +
    'Return ONLY a JSON array of objects with shape { "ply": number, "text": string }. ' +
    'No prose, no markdown fences, no explanation outside the JSON. The array must have one entry per move you were given, in the same order.';

  const movesText = moves.map((m: any, i: number) => {
    const sideName = m.color === 'w' ? 'White' : 'Black';
    return (
      'Move ' + (i + 1) + ':\n' +
      '  ply: ' + m.ply + '\n' +
      '  side: ' + sideName + '\n' +
      '  fullMoveNumber: ' + m.moveNumber + '\n' +
      '  FEN before: ' + m.fen + '\n' +
      '  played: ' + m.played + '\n' +
      '  Stockfish recommends instead: ' + m.best + '\n' +
      '  severity: ' + m.severity + '\n'
    );
  }).join('\n');

  const userMessage =
    'Please explain each of the following ' + moves.length + ' moves from my student\'s game.\n\n' +
    movesText + '\n' +
    'Return a JSON array with one explanation per move, in order. ' +
    'Each element shape: { "ply": <ply number>, "text": "<2-3 sentence explanation>" }.';

  let explanations: Array<{ ply: number; text: string }> = [];
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('Anthropic API error', resp.status, text.slice(0, 400));
      return new Response(JSON.stringify({ error: 'Full-game explanation temporarily unavailable.' }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }

    const data: any = await resp.json();
    const content = Array.isArray(data?.content) ? data.content : [];
    const raw = content
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text)
      .join(' ')
      .trim();

    // Parse JSON (with fence stripping)
    const jsonText = stripFences(raw);
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        explanations = parsed
          .filter((e: any) => e && typeof e.ply === 'number' && typeof e.text === 'string')
          .map((e: any) => ({ ply: e.ply, text: String(e.text).slice(0, 800) }));
      }
    } catch (parseErr) {
      console.error('JSON parse error', parseErr, 'raw=', raw.slice(0, 400));
    }

    if (explanations.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not parse coach response. Please try again.' }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err: any) {
    console.error('Anthropic call failed', err);
    return new Response(JSON.stringify({ error: 'Could not reach the coach.' }), {
      status: 502, headers: { 'Content-Type': 'application/json' }
    });
  }

  setCache(cacheKey, explanations);
  return new Response(JSON.stringify({ explanations, remaining: rate.remaining }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const prerender = false;
