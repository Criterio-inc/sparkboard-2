import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
function validateInput(workshopCode: any, participantName: any): { valid: boolean; error?: string } {
  if (!workshopCode || typeof workshopCode !== 'string') {
    return { valid: false, error: 'Workshop code is required' };
  }
  if (workshopCode.length !== 6) {
    return { valid: false, error: 'Workshop code must be 6 characters' };
  }
  if (!/^[A-Z0-9]{6}$/.test(workshopCode)) {
    return { valid: false, error: 'Workshop code must contain only letters and numbers' };
  }
  
  if (!participantName || typeof participantName !== 'string') {
    return { valid: false, error: 'Participant name is required' };
  }
  if (participantName.trim().length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }
  if (participantName.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' };
  }
  
  return { valid: true };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[JOIN-WORKSHOP] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { workshopCode, participantName } = await req.json();

    // Validate input
    const validation = validateInput(workshopCode, participantName);
    if (!validation.valid) {
      logStep("Validation failed", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedCode = workshopCode.toUpperCase();
    const trimmedName = participantName.trim();
    
    logStep("Joining workshop", { code: normalizedCode, name: trimmedName });

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find workshop by code
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('*')
      .eq('code', normalizedCode)
      .single();

    if (workshopError || !workshop) {
      logStep("Workshop not found", { code: normalizedCode });
      return new Response(
        JSON.stringify({ error: 'Workshop code not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if workshop is active
    if (workshop.status !== 'active') {
      logStep("Workshop not active", { status: workshop.status });
      return new Response(
        JSON.stringify({ error: 'This workshop is not currently active' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get workshop owner's plan to check participant limit
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', workshop.facilitator_id)
      .single();

    const ownerPlan = ownerProfile?.plan || 'free';

    if (ownerPlan === 'free') {
      // Check participant count (max 5 for free)
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('workshop_id', workshop.id);

      if ((count || 0) >= 5) {
        logStep("Participant limit reached", { count });
        return new Response(
          JSON.stringify({ error: 'This workshop has reached its maximum participant limit' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get boards for this workshop
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('*')
      .eq('workshop_id', workshop.id)
      .order('order_index');

    if (boardsError || !boards || boards.length === 0) {
      logStep("No boards found");
      return new Response(
        JSON.stringify({ error: 'This workshop has no active boards' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create participant
    const colorIndex = Math.floor(Math.random() * 6);
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        workshop_id: workshop.id,
        name: trimmedName,
        color_index: colorIndex,
      })
      .select()
      .single();

    if (participantError) {
      logStep("Failed to create participant", { error: participantError });
      return new Response(
        JSON.stringify({ error: 'Failed to join workshop' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Participant joined successfully", { participantId: participant.id });

    // Return workshop info and first board
    const firstBoard = workshop.active_board_id 
      ? boards.find(b => b.id === workshop.active_board_id) || boards[0]
      : boards[0];

    return new Response(
      JSON.stringify({
        success: true,
        participant: {
          id: participant.id,
          name: participant.name,
          colorIndex: participant.color_index,
          joinedAt: participant.joined_at,
        },
        workshop: {
          id: workshop.id,
          name: workshop.name,
          code: workshop.code,
        },
        firstBoardId: firstBoard.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
