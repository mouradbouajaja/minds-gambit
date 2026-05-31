// src/pages/api/pgn.ts
//
// Server-side proxy for Bunny CDN PGN files. Lets the browser-side viewer
// fetch /api/pgn?file=eco/A00.pgn without hitting CORS on the CDN.
//
// Safety: file param is whitelisted to one of the known subfolders
// (eco/, historical/, players/, events/, openings/) and must end in .pgn.
//
// Streaming: passes the upstream body through unchanged so big files don't
// load fully into the serverless function's memory.

import type { APIRoute } from 'astro';

const BUNNY = 'https://mindsgambitgames.b-cdn.net';
const ALLOWED_PREFIXES = ['eco/', 'historical/', 'players/', 'events/', 'openings/'];
const FILE_REGEX = /^[A-Za-z0-9._\-/]+\.pgn$/;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const file = url.searchParams.get('file') || '';

  if (!FILE_REGEX.test(file)) {
    return new Response('Bad file param', { status: 400 });
  }
  if (!ALLOWED_PREFIXES.some((p) => file.startsWith(p))) {
    return new Response('Disallowed path', { status: 403 });
  }

  // Optional byte-range support — lets the viewer ask for just the first
  // N bytes of a huge PGN (enough to extract ~50 game headers).
  const rangeHeader = request.headers.get('range') || url.searchParams.get('range');

  const upstreamHeaders: Record<string, string> = {};
  if (rangeHeader) upstreamHeaders['Range'] = rangeHeader;

  let upstream: Response;
  try {
    upstream = await fetch(`${BUNNY}/${file}`, { headers: upstreamHeaders });
  } catch (e) {
    return new Response('Upstream fetch failed', { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream returned ${upstream.status}`, { status: upstream.status });
  }

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/x-chess-pgn; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'Access-Control-Allow-Origin': '*',
  };

  const cl = upstream.headers.get('content-length');
  if (cl) responseHeaders['Content-Length'] = cl;
  const cr = upstream.headers.get('content-range');
  if (cr) responseHeaders['Content-Range'] = cr;
  if (upstream.headers.get('accept-ranges')) {
    responseHeaders['Accept-Ranges'] = upstream.headers.get('accept-ranges')!;
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
};
