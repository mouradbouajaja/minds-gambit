import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const email = body.email || undefined;

    const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
      {
                price_data: {
            currency: 'usd',
                          product_data: {
              name: 'The Examined Republic TV',
                              description: 'Monthly subscription — Premieres, Soundtracks & Podcasts',
                },
                            unit_amount: 299, // $2.99
                                          recurring: {
              interval: 'month',
                },
                },
          quantity: 1,
            },
                  ],
                  success_url: `${new URL(request.url).origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                  cancel_url: `${new URL(request.url).origin}/subscribe`,
            });

    return new Response(JSON.stringify({ url: session.url }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
      });
                                 } catch (error: any) {
                return new Response(JSON.stringify({ error: error.message }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' },
            });
    }
  };
