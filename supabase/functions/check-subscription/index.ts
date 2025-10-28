import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const { userEmail, userId } = await req.json();
    if (!userEmail) throw new Error("User email is required");
    if (!userId) throw new Error("User ID is required");
    
    logStep("Request data", { email: userEmail, userId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      
      // Update user profile to free
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ 
          plan: 'free',
          plan_source: null 
        })
        .eq('id', userId);
      
      if (updateError) {
        logStep("Error updating profile", { error: updateError.message });
      } else {
        logStep("Profile updated to free");
      }
      
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // List all subscriptions (not just active) and filter for eligible ones
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    
    // Find first subscription that's active or trialing
    const eligibleSub = subscriptions.data.find((sub: any) => 
      sub.status === 'active' || sub.status === 'trialing'
    );
    
    if (eligibleSub) {
      logStep("Eligible subscription found", { 
        subscriptionId: eligibleSub.id, 
        status: eligibleSub.status 
      });
      
      // Safely get end date - use current_period_end or trial_end, validate it exists
      const endSeconds = eligibleSub.current_period_end ?? eligibleSub.trial_end;
      let subscriptionEnd: string | null = null;
      
      if (endSeconds && typeof endSeconds === 'number' && endSeconds > 0) {
        try {
          const subscriptionEndTimestamp = endSeconds * 1000;
          subscriptionEnd = new Date(subscriptionEndTimestamp).toISOString();
          logStep("Subscription end date calculated", { 
            endSeconds, 
            timestamp: subscriptionEndTimestamp, 
            isoDate: subscriptionEnd 
          });
        } catch (dateError) {
          logStep("Warning: Could not parse end date", { endSeconds, error: String(dateError) });
        }
      } else {
        logStep("Warning: No valid end date found", { 
          current_period_end: eligibleSub.current_period_end,
          trial_end: eligibleSub.trial_end 
        });
      }
      
      // Use upsert to ensure profile exists and is updated
      const profileData = {
        id: userId,
        email: userEmail,
        plan: 'pro',
        plan_source: 'stripe',
        subscription_current_period_end: subscriptionEnd,
        stripe_customer_id: customerId,
        stripe_subscription_id: eligibleSub.id
      };
      
      const { error: upsertError } = await supabaseClient
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });
      
      if (upsertError) {
        logStep("Error upserting profile to pro", { error: upsertError.message });
      } else {
        logStep("Profile upserted to pro successfully");
      }
      
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_end: subscriptionEnd
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      logStep("No eligible subscription found", { 
        totalSubscriptions: subscriptions.data.length,
        statuses: subscriptions.data.map((s: any) => s.status)
      });
      
      // Use upsert to set profile to free
      const profileData = {
        id: userId,
        email: userEmail,
        plan: 'free',
        plan_source: null,
        subscription_current_period_end: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: null
      };
      
      const { error: upsertError } = await supabaseClient
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' });
      
      if (upsertError) {
        logStep("Error upserting profile to free", { error: upsertError.message });
      } else {
        logStep("Profile upserted to free successfully");
      }
      
      return new Response(JSON.stringify({
        subscribed: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
