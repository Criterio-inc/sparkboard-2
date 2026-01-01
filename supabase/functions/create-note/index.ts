import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
function validateInput(
  questionId: any, 
  content: any, 
  participantId: any, 
  participantName: any
): { valid: boolean; error?: string } {
  if (!questionId || typeof questionId !== 'string') {
    return { valid: false, error: 'Question ID is required' };
  }
  if (questionId.length > 100) {
    return { valid: false, error: 'Invalid question ID' };
  }
  
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Note content is required' };
  }
  if (content.trim().length === 0) {
    return { valid: false, error: 'Note content cannot be empty' };
  }
  if (content.length > 2000) {
    return { valid: false, error: 'Note content must be less than 2000 characters' };
  }
  
  if (!participantId || typeof participantId !== 'string') {
    return { valid: false, error: 'Participant ID is required' };
  }
  if (participantId.length > 100) {
    return { valid: false, error: 'Invalid participant ID' };
  }
  
  if (!participantName || typeof participantName !== 'string') {
    return { valid: false, error: 'Participant name is required' };
  }
  if (participantName.length > 100) {
    return { valid: false, error: 'Participant name too long' };
  }
  
  return { valid: true };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-NOTE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { questionId, content, participantId, participantName } = await req.json();

    // Validate input
    const validation = validateInput(questionId, content, participantId, participantName);
    if (!validation.valid) {
      logStep("Validation failed", { error: validation.error });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Creating note", { questionId, participantId });

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify question exists
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('id, board_id')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      logStep("Question not found", { questionId });
      return new Response(
        JSON.stringify({ error: 'Question not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify participant exists
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, workshop_id')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      logStep("Participant not found", { participantId });
      return new Response(
        JSON.stringify({ error: 'Participant not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify question belongs to participant's workshop
    const { data: board } = await supabase
      .from('boards')
      .select('workshop_id')
      .eq('id', question.board_id)
      .single();

    if (!board || board.workshop_id !== participant.workshop_id) {
      logStep("Question not in participant's workshop");
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create note with random color
    const colorIndex = Math.floor(Math.random() * 6);
    
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        question_id: questionId,
        content: content.trim(),
        author_id: participantId,
        author_name: participantName.trim(),
        color_index: colorIndex,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (noteError) {
      logStep("Failed to create note", { error: noteError });
      return new Response(
        JSON.stringify({ error: 'Failed to create note' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Note created successfully", { noteId: note.id });

    return new Response(
      JSON.stringify({
        success: true,
        note: {
          id: note.id,
          questionId: note.question_id,
          content: note.content,
          authorName: note.author_name,
          authorId: note.author_id,
          colorIndex: note.color_index,
          timestamp: note.timestamp,
        },
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
