import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

// Stripe price IDs for subscription plans
export const STRIPE_PRICES = {
  monthly: 'price_1SN9pF2K6y9uAxuDaRPh362t', // 99 SEK/month
  yearly: 'price_1SN9qC2K6y9uAxuDVSHLUurC',  // 1089 SEK/year
} as const;

export const STRIPE_PRODUCT_ID = 'prod_TJnQM5SH1bfMBs';
