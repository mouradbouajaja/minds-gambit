import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

                          export const GET: APIRoute = async ({ request }) => {
                            const url = new URL(request.url);
                            const email = url.searchParams.get('email');

                              // CORS headers for Roku and website access
                            const headers = {
                                  'Content-Type': 'application/json',
                                  'Access-Control-Allow-Origin': '*',
                                  'Access-Control-Allow-Methods': 'GET',
                            };

                            if (!email) {
                              return new Response(JSON.stringify({ active: false, error: 'Email required' }), {
                                      status: 400,
                                      headers,
                              });
                            }

                              try {
                                    // Search for customers with this email
                                const customers = await stripe.customers.list({
                                  email: email.toLowerCase().trim(),
                                        limit: 1,
                                });

                                if (customers.data.length === 0) {
                                  return new Response(JSON.stringify({ active: false, reason: 'no_account' }), {
                                            status: 200,
                                            headers,
                                  });
                                }

                                  const customer = customers.data[0];

                                    // Check for active subscriptions
                                const subscriptions = await stripe.subscriptions.list({
                                        customer: customer.id,
                                        status: 'active',
                                        limit: 1,
                                });

                                if (subscriptions.data.length > 0) {
                                  const sub = subscriptions.data[0];
                                  return new Response(
                                    JSON.stringify({
                                                active: true,
                                                subscription_id: sub.id,
                                      current_period_end: sub.current_period_end,
                                                customer_name: customer.name || customer.email,
                                    }),
                                    { status: 200, headers }
                                  );
                                }

                                      // Also check trialing subscriptions
                                  const trialSubs = await stripe.subscriptions.list({
                                          customer: customer.id,
                                          status: 'trialing',
                                          limit: 1,
                                  });

                                if (trialSubs.data.length > 0) {
                                  return new Response(
                                    JSON.stringify({
                                                active: true,
                                                trial: true,
                                      subscription_id: trialSubs.data[0].id,
                                    }),
                                    { status: 200, headers }
                                  );
                                }

                                  return new Response(JSON.stringify({ active: false, reason: 'no_subscription' }), {
                                          status: 200,
                                          headers,
                                  });
                              } catch (error: any) {
                                console.error('Verify subscription error:', error.message);
                                return new Response(JSON.stringify({ active: false, error: 'Server error' }), {
                                        status: 500,
                                        headers,
                                });
                              }
                          };
