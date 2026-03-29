import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import manifest from '../../../public/feed/manifest_feed.json';

const CDN_HOSTNAME = 'vz-748d4d74-b82.b-cdn.net';
const TOKEN_KEY = import.meta.env.BUNNY_TOKEN_AUTH_KEY;
const TOKEN_EXPIRY_SECONDS = 14400; // 4 hours

function signBunnyUrl(guid: string): string {
    const expires = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    const path = `/${guid}/playlist.m3u8`;
    const hashInput = `${TOKEN_KEY}${path}${expires}`;
    const token = createHash('sha256').update(hashInput).digest('hex');
    return `https://${CDN_HOSTNAME}${path}?token=${token}&expires=${expires}`;
}

function signThumbnail(guid: string): string {
    return `https://${CDN_HOSTNAME}/${guid}/thumbnail.jpg`;
}

export const GET: APIRoute = async ({ request }) => {
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';

    const allowed =
          origin.includes('mindsgambit.com') ||
          referer.includes('mindsgambit.com') ||
          origin === ''; // allow server-side / Roku requests

    if (!allowed) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
                  status: 403,
                  headers: { 'Content-Type': 'application/json' },
          });
    }

    // Build signed feed from GUIDs — stream URLs never stored in GitHub
    const signedCategories = manifest.categories.map((category: any) => ({
          ...category,
          items: category.items.map((item: any) => ({
                  ...item,
                  streamUrl: signBunnyUrl(item.guid),
                  streamFormat: 'm3u8',
                  thumbnail: signThumbnail(item.guid),
          })),
    }));

    return new Response(
          JSON.stringify({
                  title: manifest.title,
                  description: manifest.description,
                  lastUpdated: manifest.lastUpdated,
                  categories: signedCategories,
          }),
      {
              status: 200,
              headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-store',
              },
      }
        );
};
