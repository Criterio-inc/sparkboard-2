import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
);

// Stripe price IDs for subscription plans (PRODUCTION)
export const STRIPE_PRICES = {
  monthly: 'price_1SkPgsRuAtCUWgcrL6V4Tb6K', // 99 SEK/month
  yearly: 'price_1SkPmrRuAtCUWgcrdZiCO10r',  // 950 SEK/year
} as const;

export const STRIPE_PRODUCT_ID = 'prod_TJnQM5SH1bfMBs';
