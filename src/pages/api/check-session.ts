import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

// Called from /watch page to verify if the logged-in user has an active subscription
// Uses the session_id from Stripe checkout stored in a cookie

export const GET: APIRoute = async ({ request, cookies }) => {
  const headers = {
    'Content-Type': 'application/json',
};

  // Check for subscriber email cookie (set after successful checkout)
  const subEmail = cookies.get('exr_subscriber')?.value;

  if (!subEmail) {
    return new Response(JSON.stringify({ active: false, reason: 'not_logged_in' }), {
      status: 200,
      headers,
});
}

  try {
    // Look up customer by email
    const customers = await stripe.customers.list({
      email: subEmail.toLowerCase().trim(),
      limit: 1,
});

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ active: false, reason: 'no_account' }), {
        status: 200,
        headers,
});
}

    const subscriptions = await stripe.subscriptions.list({
      customer: customers.data[0].id,
      status: 'active',
      limit: 1,
});

    if (subscriptions.data.length > 0) {
      return new Response(JSON.stringify({ active: true }), {
        status: 200,
        headers,
});
}

    return new Response(JSON.stringify({ active: false, reason: 'no_subscription' }), {
      status: 200,
      headers,
});
} catch (error: any) {
    return new Response(JSON.stringify({ active: false, error: error.message }), {
      status: 500,
      headers,
});
}
};
