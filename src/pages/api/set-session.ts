import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

// Called from the success page to set a subscriber cookie after checkout

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
      const body = await request.json();
          const sessionId = body.session_id;

              if (!sessionId) {
                    return new Response(JSON.stringify({ error: 'Missing session_id' }), { status: 400 });
                        }

                            // Retrieve the checkout session from Stripe
                                const session = await stripe.checkout.sessions.retrieve(sessionId);

                                    if (session.payment_status === 'paid' && session.customer_email) {
                                          // Set a cookie with the subscriber email (30 days)
                                                cookies.set('exr_subscriber', session.customer_email, {
                                                        path: '/',
                                                                maxAge: 60 * 60 * 24 * 30, // 30 days
                                                                        httpOnly: true,
                                                                                secure: true,
                                                                                        sameSite: 'lax',
                                                                                              });

                                                                                                    return new Response(JSON.stringify({ success: true, email: session.customer_email }), {
                                                                                                            status: 200,
                                                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                                                          });
                                                                                                                              }
                                                                                                                              
                                                                                                                                  return new Response(JSON.stringify({ error: 'Payment not completed' }), {
                                                                                                                                        status: 400,
                                                                                                                                              headers: { 'Content-Type': 'application/json' },
                                                                                                                                                  });
                                                                                                                                                    } catch (error: any) {
                                                                                                                                                        return new Response(JSON.stringify({ error: error.message }), {
                                                                                                                                                              status: 500,
                                                                                                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                                                                                                        });
                                                                                                                                                                          }
                                                                                                                                                                          };
