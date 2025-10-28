import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { Webhook } from "https://esm.sh/svix@1.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Clerk webhook received');

    // Hämta webhook signature headers
    const svix_id = req.headers.get('svix-id');
    const svix_timestamp = req.headers.get('svix-timestamp');
    const svix_signature = req.headers.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('❌ Missing svix headers');
      return new Response('Error: Missing svix headers', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Hämta raw body
    const payload = await req.text();
    console.log('📦 Payload received, length:', payload.length);

    // Verifiera webhook med Clerk secret
    const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ CLERK_WEBHOOK_SECRET not configured');
      return new Response('Error: Webhook secret not configured', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
      console.log('✅ Webhook verified, event type:', evt.type);
    } catch (err) {
      console.error('❌ Webhook verification failed:', err);
      return new Response('Error: Verification failed', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Hantera user.created och user.updated events
    if (evt.type === 'user.created' || evt.type === 'user.updated') {
      console.log(`📝 Processing ${evt.type} event`);
      
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      
      // Hitta primär email
      const primaryEmail = email_addresses.find(
        (e: any) => e.id === evt.data.primary_email_address_id
      );
      const email = primaryEmail?.email_address;

      if (!email) {
        console.error('❌ No email found in event data');
        return new Response('Error: No email found', { 
          status: 400,
          headers: corsHeaders 
        });
      }

      console.log('👤 User email:', email);

      // KOLLA OM DET ÄR @curago.se
      const isCuragoDomain = email.toLowerCase().endsWith('@curago.se');
      const plan = isCuragoDomain ? 'curago' : 'free';
      const plan_source = isCuragoDomain ? 'curago_domain' : null;

      console.log(`🎯 Detected plan: ${plan} (source: ${plan_source || 'default'})`);

      // Synka till Supabase med service role key (kan bypassa RLS)
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Supabase credentials not configured');
        return new Response('Error: Database credentials not configured', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const profileData = {
        id,
        email,
        first_name,
        last_name,
        image_url,
        plan,
        plan_source,
        updated_at: new Date().toISOString(),
      };

      console.log('💾 Upserting profile data:', { id, email, plan, plan_source });

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });

      if (error) {
        console.error('❌ Supabase sync error:', error);
        return new Response('Error: Database sync failed', { 
          status: 500,
          headers: corsHeaders 
        });
      }

      console.log(`✅ User ${email} synced with plan: ${plan}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook processed successfully',
          user: { id, email, plan, plan_source }
        }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`ℹ️ Event type ${evt.type} not processed`);
    return new Response(
      JSON.stringify({ success: true, message: 'Event type not processed' }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in clerk-webhook function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
