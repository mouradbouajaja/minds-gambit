import type { APIRoute } from 'astro';
import { createHash } from 'crypto';

const CDN_HOSTNAME = 'vz-748d4d74-b82.b-cdn.net';
const LIBRARY_ID = '627228';
const TOKEN_KEY = import.meta.env.BUNNY_TOKEN_AUTH_KEY;
const TOKEN_EXPIRY_SECONDS = 14400; // 4 hours

function signBunnyUrl(videoGuid: string): string {
  const expires = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS;
    const path = `/${videoGuid}/playlist.m3u8`;
      const hashInput = `${TOKEN_KEY}${path}${expires}`;
        const token = createHash('sha256').update(hashInput).digest('hex');
          return `https://${CDN_HOSTNAME}${path}?token=${token}&expires=${expires}`;
          }

          // Read manifest from public feed
          import manifest from '../../../public/feed/manifest_feed.json';

          export const GET: APIRoute = async ({ request }) => {
            // Check origin — only allow requests from mindsgambit.com
              const origin = request.headers.get('origin') || '';
                const referer = request.headers.get('referer') || '';
                  const allowed =
                      origin.includes('mindsgambit.com') ||
                          referer.includes('mindsgambit.com') ||
                              origin === '' // allow server-side / Roku requests with auth header

                                if (!allowed) {
                                    return new Response(JSON.stringify({ error: 'Forbidden' }), {
                                          status: 403,
                                                headers: { 'Content-Type': 'application/json' },
                                                    });
                                                      }

                                                        // Build signed feed
                                                          const signedVideos = manifest.videos.map((video: any) => ({
                                                              ...video,
                                                                  streamUrl: signBunnyUrl(video.guid),
                                                                    }));

                                                                      return new Response(
                                                                          JSON.stringify({ ...manifest, videos: signedVideos }),
                                                                              {
                                                                                    status: 200,
                                                                                          headers: {
                                                                                                  'Content-Type': 'application/json',
                                                                                                          'Cache-Control': 'no-store',
                                                                                                                },
                                                                                                                    }
                                                                                                                      );
                                                                                                                      };
