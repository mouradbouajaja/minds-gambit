import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
const endpointSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    let event: Stripe.Event;

    try {
          event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
    } catch (err: any) {
          console.error('Webhook signature verification failed:', err.message);
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
              const session = event.data.object as Stripe.Checkout.Session;
              console.log(`Subscription created for ${session.customer_email}`);
              break;
      }
      case 'customer.subscription.deleted': {
              const subscription = event.data.object as Stripe.Subscription;
              console.log(`Subscription cancelled: ${subscription.id}`);
              break;
      }
      case 'invoice.payment_failed': {
              const invoice = event.data.object as Stripe.Invoice;
              console.log(`Payment failed for invoice: ${invoice.id}`);
              break;
      }
      default:
              console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
    });
};
