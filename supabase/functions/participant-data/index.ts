import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PARTICIPANT-DATA] ${step}${detailsStr}`);
};

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { operation, workshopId, boardId, participantId, questionIds } = await req.json();

    // Validate basic inputs
    if (!operation || typeof operation !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Operation is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!participantId || !isValidUUID(participantId)) {
      return new Response(
        JSON.stringify({ error: 'Valid participant ID is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify participant exists and get their workshop
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('id, workshop_id, name, color_index')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      logStep("Participant not found", { participantId });
      return new Response(
        JSON.stringify({ error: 'Participant session not valid' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Operation", { operation, participantId, workshopId: participant.workshop_id });

    // Handle different operations
    switch (operation) {
      case 'get-initial-data': {
        // Get workshop, active board, questions, and notes in one call
        if (!workshopId || !isValidUUID(workshopId)) {
          return new Response(
            JSON.stringify({ error: 'Valid workshop ID is required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify participant belongs to this workshop
        if (participant.workshop_id !== workshopId) {
          logStep("Workshop mismatch", { participantWorkshop: participant.workshop_id, requestedWorkshop: workshopId });
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get workshop
        const { data: workshop, error: workshopError } = await supabase
          .from('workshops')
          .select('id, name, code, active_board_id, timer_running, timer_started_at, time_remaining')
          .eq('id', workshopId)
          .single();

        if (workshopError || !workshop) {
          logStep("Workshop not found", { workshopId });
          return new Response(
            JSON.stringify({ error: 'Workshop not found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get requested board or active board
        const targetBoardId = boardId || workshop.active_board_id;
        if (!targetBoardId) {
          return new Response(
            JSON.stringify({ error: 'No active board' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get board
        const { data: board, error: boardError } = await supabase
          .from('boards')
          .select('id, title, time_limit, color_index, workshop_id')
          .eq('id', targetBoardId)
          .single();

        if (boardError || !board) {
          logStep("Board not found", { boardId: targetBoardId });
          return new Response(
            JSON.stringify({ error: 'Board not found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify board belongs to workshop
        if (board.workshop_id !== workshopId) {
          return new Response(
            JSON.stringify({ error: 'Board does not belong to this workshop' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get questions for board
        const { data: questions, error: questionsError } = await supabase
          .from('questions')
          .select('id, title, order_index')
          .eq('board_id', targetBoardId)
          .order('order_index');

        if (questionsError) {
          logStep("Questions fetch error", { error: questionsError });
        }

        const questionIdsList = (questions || []).map(q => q.id);

        // Get notes for questions
        let notes: any[] = [];
        if (questionIdsList.length > 0) {
          const { data: notesData, error: notesError } = await supabase
            .from('notes')
            .select('id, question_id, content, author_name, author_id, color_index, timestamp')
            .in('question_id', questionIdsList);

          if (notesError) {
            logStep("Notes fetch error", { error: notesError });
          }
          notes = notesData || [];
        }

        // Get participant count
        const { count: participantCount } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('workshop_id', workshopId);

        logStep("Initial data fetched", { 
          workshopId, 
          boardId: targetBoardId, 
          questionsCount: questions?.length || 0,
          notesCount: notes.length 
        });

        return new Response(
          JSON.stringify({
            success: true,
            workshop: {
              id: workshop.id,
              name: workshop.name,
              code: workshop.code,
              activeBoardId: workshop.active_board_id,
              timerRunning: workshop.timer_running,
              timerStartedAt: workshop.timer_started_at,
              timeRemaining: workshop.time_remaining,
            },
            board: {
              id: board.id,
              title: board.title,
              timeLimit: board.time_limit,
              colorIndex: board.color_index,
            },
            questions: (questions || []).map(q => ({
              id: q.id,
              title: q.title,
              orderIndex: q.order_index,
            })),
            notes: notes.map(n => ({
              id: n.id,
              questionId: n.question_id,
              content: n.content,
              authorName: n.author_name,
              authorId: n.author_id,
              colorIndex: n.color_index,
              timestamp: n.timestamp,
            })),
            participantCount: participantCount || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'get-workshop-status': {
        // Quick check for active board changes and timer state
        if (!workshopId || !isValidUUID(workshopId)) {
          return new Response(
            JSON.stringify({ error: 'Valid workshop ID is required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (participant.workshop_id !== workshopId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: workshop, error } = await supabase
          .from('workshops')
          .select('active_board_id, timer_running, timer_started_at, time_remaining')
          .eq('id', workshopId)
          .single();

        if (error || !workshop) {
          return new Response(
            JSON.stringify({ error: 'Workshop not found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get the new board title if there's an active board
        let newBoardTitle = null;
        if (workshop.active_board_id) {
          const { data: activeBoard } = await supabase
            .from('boards')
            .select('title')
            .eq('id', workshop.active_board_id)
            .single();
          newBoardTitle = activeBoard?.title || null;
        }

        return new Response(
          JSON.stringify({
            success: true,
            activeBoardId: workshop.active_board_id,
            newBoardTitle,
            timerRunning: workshop.timer_running,
            timerStartedAt: workshop.timer_started_at,
            timeRemaining: workshop.time_remaining,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'get-notes': {
        // Fetch notes for specific questions
        if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Question IDs are required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Validate all question IDs
        for (const qId of questionIds) {
          if (!isValidUUID(qId)) {
            return new Response(
              JSON.stringify({ error: 'Invalid question ID format' }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Verify questions belong to participant's workshop
        const { data: questions } = await supabase
          .from('questions')
          .select('id, board_id')
          .in('id', questionIds);

        if (!questions || questions.length === 0) {
          return new Response(
            JSON.stringify({ success: true, notes: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check boards belong to participant's workshop
        const boardIds = [...new Set(questions.map(q => q.board_id))];
        const { data: boards } = await supabase
          .from('boards')
          .select('id, workshop_id')
          .in('id', boardIds);

        const validBoardIds = (boards || [])
          .filter(b => b.workshop_id === participant.workshop_id)
          .map(b => b.id);

        const validQuestionIds = questions
          .filter(q => validBoardIds.includes(q.board_id))
          .map(q => q.id);

        if (validQuestionIds.length === 0) {
          return new Response(
            JSON.stringify({ success: true, notes: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('id, question_id, content, author_name, author_id, color_index, timestamp')
          .in('question_id', validQuestionIds);

        if (notesError) {
          logStep("Notes fetch error", { error: notesError });
          return new Response(
            JSON.stringify({ error: 'Failed to fetch notes' }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            notes: (notes || []).map(n => ({
              id: n.id,
              questionId: n.question_id,
              content: n.content,
              authorName: n.author_name,
              authorId: n.author_id,
              colorIndex: n.color_index,
              timestamp: n.timestamp,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'get-participant-count': {
        if (!workshopId || !isValidUUID(workshopId)) {
          return new Response(
            JSON.stringify({ error: 'Valid workshop ID is required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (participant.workshop_id !== workshopId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('workshop_id', workshopId);

        return new Response(
          JSON.stringify({
            success: true,
            count: count || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown operation' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
