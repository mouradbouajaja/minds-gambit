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

// Roku Direct Publisher Feed Format (JSON Feed v2)
// See: https://developer.roku.com/docs/specs/direct-publisher-feed-specs/json-dp-spec.md
export const GET: APIRoute = async () => {
    const movies: any[] = [];
    const series: any[] = [];
    const shortFormVideos: any[] = [];

    for (const category of manifest.categories) {
          for (const item of category.items as any[]) {
                  const streamUrl = signBunnyUrl(item.guid);
                  const thumbnail = `https://${CDN_HOSTNAME}/${item.guid}/thumbnail.jpg`;
                  const durationMs = item.duration * 1000;

                  if (item.contentType === 'podcast') {
                            // Map podcasts as short-form video
                            shortFormVideos.push({
                                        id: item.guid,
                                        title: item.title,
                                        shortDescription: item.description,
                                        thumbnail,
                                        releaseDate: '2026-03-28',
                                        content: {
                                                      dateAdded: '2026-03-28',
                                                      videos: [
                                                                      {
                                                                                        url: streamUrl,
                                                                                        quality: 'HD',
                                                                                        videoType: 'HLS',
                                                                                      },
                                                                    ],
                                                      duration: item.duration,
                                                    },
                                        genres: ['talk show'],
                                        tags: ['podcast', 'minds gambit'],
                                        rating: {
                                                      rating: 'G',
                                                      ratingSource: 'NONE',
                                                    },
                                      });
                          } else if (item.contentType === 'video') {
                            movies.push({
                                        id: item.guid,
                                        title: item.title,
                                        shortDescription: item.description,
                                        thumbnail,
                                        releaseDate: '2026-03-28',
                                        content: {
                                                      dateAdded: '2026-03-28',
                                                      videos: [
                                                                      {
                                                                                        url: streamUrl,
                                                                                        quality: 'HD',
                                                                                        videoType: 'HLS',
                                                                                      },
                                                                    ],
                                                      duration: item.duration,
                                                    },
                                        genres: ['music'],
                                        tags: ['music video', 'minds gambit'],
                                        rating: {
                                                      rating: 'G',
                                                      ratingSource: 'NONE',
                                                    },
                                      });
                          } else if (item.contentType === 'audio') {
                            shortFormVideos.push({
                                        id: item.guid,
                                        title: item.title,
                                        shortDescription: item.description,
                                        thumbnail,
                                        releaseDate: '2026-03-28',
                                        content: {
                                                      dateAdded: '2026-03-28',
                                                      videos: [
                                                                      {
                                                                                        url: streamUrl,
                                                                                        quality: 'HD',
                                                                                        videoType: 'HLS',
                                                                                      },
                                                                    ],
                                                      duration: item.duration,
                                                    },
                                        genres: ['music'],
                                        tags: ['song', 'minds gambit'],
                                        rating: {
                                                      rating: 'G',
                                                      ratingSource: 'NONE',
                                                    },
                                      });
                          }
                }
        }

    const feed = {
          providerName: "Mind's Gambit",
          lastUpdated: new Date().toISOString(),
          language: 'en',
          movies: movies.length > 0 ? movies : undefined,
          shortFormVideos: shortFormVideos.length > 0 ? shortFormVideos : undefined,
        };

    return new Response(JSON.stringify(feed), {
          status: 200,
          headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store',
                  'Access-Control-Allow-Origin': '*',
                },
        });
  };
