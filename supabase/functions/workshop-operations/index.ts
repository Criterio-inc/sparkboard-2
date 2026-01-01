import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { createRemoteJWKSet, jwtVerify } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clerk JWKS endpoint for cryptographic verification
const CLERK_JWKS_URL = "https://api.clerk.dev/v1/jwks";
const JWKS = createRemoteJWKSet(new URL(CLERK_JWKS_URL));

// KRITISKT: Kryptografisk JWT-verifiering med JWKS
async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // KRYPTOGRAFISK SIGNATURVERIFIERING med JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
    });
    
    if (!payload.sub) {
      throw new Error('Invalid token - no user ID');
    }
    
    console.log('[WORKSHOP-OPS] Token cryptographically verified for user:', payload.sub);
    return payload.sub;
  } catch (error) {
    console.error('[WORKSHOP-OPS] Token verification failed:', error);
    throw new Error('Unauthorized - token verification failed');
  }
}

// Input validation
interface Board {
  id?: string;
  title: string;
  timeLimit: number;
  colorIndex: number;
  questions: { id?: string; title: string }[];
}

interface WorkshopData {
  title: string;
  description?: string;
  boards: Board[];
  code?: string;
  status?: 'draft' | 'active';
}

function validateWorkshopData(data: WorkshopData): { valid: boolean; error?: string } {
  if (!data.title || typeof data.title !== 'string') {
    return { valid: false, error: 'Workshop title is required' };
  }
  if (data.title.length > 200) {
    return { valid: false, error: 'Workshop title must be less than 200 characters' };
  }
  if (data.description && data.description.length > 1000) {
    return { valid: false, error: 'Description must be less than 1000 characters' };
  }
  if (!Array.isArray(data.boards)) {
    return { valid: false, error: 'Boards must be an array' };
  }
  if (data.boards.length > 20) {
    return { valid: false, error: 'Maximum 20 boards allowed' };
  }
  
  for (const board of data.boards) {
    if (!board.title || typeof board.title !== 'string') {
      return { valid: false, error: 'Board title is required' };
    }
    if (board.title.length > 200) {
      return { valid: false, error: 'Board title must be less than 200 characters' };
    }
    if (typeof board.timeLimit !== 'number' || board.timeLimit < 1 || board.timeLimit > 120) {
      return { valid: false, error: 'Board time limit must be between 1 and 120 minutes' };
    }
    if (!Array.isArray(board.questions)) {
      return { valid: false, error: 'Questions must be an array' };
    }
    if (board.questions.length > 10) {
      return { valid: false, error: 'Maximum 10 questions per board' };
    }
    for (const q of board.questions) {
      if (!q.title || typeof q.title !== 'string') {
        return { valid: false, error: 'Question title is required' };
      }
      if (q.title.length > 500) {
        return { valid: false, error: 'Question title must be less than 500 characters' };
      }
    }
  }
  
  return { valid: true };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WORKSHOP-OPS] ${step}${detailsStr}`);
};

// Generate unique 6-char code
async function generateUniqueCode(supabase: any): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let attempts = 0; attempts < 10; attempts++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const { data } = await supabase
      .from('workshops')
      .select('id')
      .eq('code', code)
      .single();
    
    if (!data) {
      return code;
    }
  }
  
  throw new Error('Could not generate unique code');
}

// Delete all boards, questions, notes for a workshop
async function deleteWorkshopBoards(supabase: any, workshopId: string) {
  logStep("Deleting workshop boards", { workshopId });
  
  // Clear active_board_id first
  await supabase
    .from('workshops')
    .update({ active_board_id: null })
    .eq('id', workshopId);
  
  // Get all boards
  const { data: boards } = await supabase
    .from('boards')
    .select('id')
    .eq('workshop_id', workshopId);
  
  if (!boards || boards.length === 0) return;
  
  const boardIds = boards.map((b: any) => b.id);
  
  // Get all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id')
    .in('board_id', boardIds);
  
  // Delete notes
  if (questions && questions.length > 0) {
    const questionIds = questions.map((q: any) => q.id);
    await supabase.from('notes').delete().in('question_id', questionIds);
  }
  
  // Delete AI analyses
  await supabase.from('ai_analyses').delete().in('board_id', boardIds);
  
  // Delete questions
  await supabase.from('questions').delete().in('board_id', boardIds);
  
  // Delete boards
  await supabase.from('boards').delete().eq('workshop_id', workshopId);
  
  logStep("Workshop boards deleted");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    let userId: string;
    
    try {
      userId = await verifyClerkToken(authHeader);
      logStep("User authenticated", { userId });
    } catch (authError) {
      logStep("Authentication failed", { error: String(authError) });
      return new Response(
        JSON.stringify({ error: "Unauthorized - please log in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { operation, workshopId, workshop: workshopData } = body;

    logStep("Operation requested", { operation, workshopId });

    switch (operation) {
      case 'create-workshop':
      case 'save-draft':
      case 'activate-workshop': {
        // Validate input
        const validation = validateWorkshopData(workshopData);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check workshop limit for new workshops
        if (!workshopId) {
          // Get user's plan
          const { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', userId)
            .single();
          
          const plan = profile?.plan || 'free';
          
          if (plan === 'free') {
            // Count active workshops
            const { count } = await supabase
              .from('workshops')
              .select('*', { count: 'exact', head: true })
              .eq('facilitator_id', userId)
              .eq('status', 'active');
            
            if ((count || 0) >= 1) {
              return new Response(
                JSON.stringify({ error: 'Free users can only have 1 active workshop. Upgrade to Pro for unlimited workshops.' }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }

        const status = operation === 'activate-workshop' ? 'active' : 'draft';
        const code = workshopData.code || await generateUniqueCode(supabase);

        let savedWorkshop;
        
        if (workshopId) {
          // Verify ownership
          const { data: existing } = await supabase
            .from('workshops')
            .select('facilitator_id')
            .eq('id', workshopId)
            .single();
          
          if (!existing || existing.facilitator_id !== userId) {
            return new Response(
              JSON.stringify({ error: 'Workshop not found or access denied' }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Delete existing boards
          await deleteWorkshopBoards(supabase, workshopId);

          // Update workshop
          const { data, error } = await supabase
            .from('workshops')
            .update({
              name: workshopData.title,
              code: code,
              status: status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', workshopId)
            .select()
            .single();

          if (error) throw error;
          savedWorkshop = data;
        } else {
          // Create new workshop
          const { data, error } = await supabase
            .from('workshops')
            .insert({
              name: workshopData.title,
              code: code,
              facilitator_id: userId,
              status: status,
              date: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;
          savedWorkshop = data;
        }

        logStep("Workshop saved", { id: savedWorkshop.id });

        // Save boards and questions
        let firstBoardId = null;
        for (let boardIndex = 0; boardIndex < workshopData.boards.length; boardIndex++) {
          const board = workshopData.boards[boardIndex];
          
          const { data: savedBoard, error: boardError } = await supabase
            .from('boards')
            .insert({
              workshop_id: savedWorkshop.id,
              title: board.title,
              time_limit: board.timeLimit,
              color_index: board.colorIndex || boardIndex,
              order_index: boardIndex,
            })
            .select()
            .single();

          if (boardError) {
            logStep("Board save error", { error: boardError });
            continue;
          }

          if (boardIndex === 0) {
            firstBoardId = savedBoard.id;
          }

          // Save questions
          for (let qIndex = 0; qIndex < board.questions.length; qIndex++) {
            const question = board.questions[qIndex];
            
            await supabase
              .from('questions')
              .insert({
                board_id: savedBoard.id,
                title: question.title,
                order_index: qIndex,
              });
          }
        }

        // Set active board if activating
        if (status === 'active' && firstBoardId) {
          await supabase
            .from('workshops')
            .update({ active_board_id: firstBoardId })
            .eq('id', savedWorkshop.id);
        }

        logStep("Workshop created/updated successfully");

        return new Response(
          JSON.stringify({ 
            success: true, 
            workshop: savedWorkshop,
            code: savedWorkshop.code
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'delete-workshop': {
        if (!workshopId) {
          return new Response(
            JSON.stringify({ error: 'Workshop ID required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify ownership
        const { data: existing } = await supabase
          .from('workshops')
          .select('facilitator_id')
          .eq('id', workshopId)
          .single();
        
        if (!existing || existing.facilitator_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Workshop not found or access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete all related data
        await deleteWorkshopBoards(supabase, workshopId);
        
        // Delete participants
        await supabase.from('participants').delete().eq('workshop_id', workshopId);
        
        // Delete workshop
        await supabase.from('workshops').delete().eq('id', workshopId);

        logStep("Workshop deleted", { workshopId });

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'update-timer': {
        if (!workshopId) {
          return new Response(
            JSON.stringify({ error: 'Workshop ID required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify ownership
        const { data: existing } = await supabase
          .from('workshops')
          .select('facilitator_id')
          .eq('id', workshopId)
          .single();
        
        if (!existing || existing.facilitator_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { timerRunning, timeRemaining, activeBoardId } = body;
        
        const updateData: any = {};
        if (typeof timerRunning === 'boolean') {
          updateData.timer_running = timerRunning;
          updateData.timer_started_at = timerRunning ? new Date().toISOString() : null;
        }
        if (typeof timeRemaining === 'number') {
          updateData.time_remaining = timeRemaining;
        }
        if (activeBoardId) {
          updateData.active_board_id = activeBoardId;
        }

        const { error } = await supabase
          .from('workshops')
          .update(updateData)
          .eq('id', workshopId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'delete-note': {
        const { noteId } = body;
        if (!noteId) {
          return new Response(
            JSON.stringify({ error: 'Note ID required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get note's question to verify workshop ownership
        const { data: note } = await supabase
          .from('notes')
          .select('question_id')
          .eq('id', noteId)
          .single();

        if (!note) {
          return new Response(
            JSON.stringify({ error: 'Note not found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get question's board
        const { data: question } = await supabase
          .from('questions')
          .select('board_id')
          .eq('id', note.question_id)
          .single();

        // Get board's workshop
        const { data: board } = await supabase
          .from('boards')
          .select('workshop_id')
          .eq('id', question?.board_id)
          .single();

        // Verify ownership
        const { data: workshop } = await supabase
          .from('workshops')
          .select('facilitator_id')
          .eq('id', board?.workshop_id)
          .single();

        if (!workshop || workshop.facilitator_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase.from('notes').delete().eq('id', noteId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'move-note': {
        const { noteId, targetQuestionId } = body;
        if (!noteId || !targetQuestionId) {
          return new Response(
            JSON.stringify({ error: 'Note ID and target question ID required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify ownership through the chain
        const { data: targetQuestion } = await supabase
          .from('questions')
          .select('board_id')
          .eq('id', targetQuestionId)
          .single();

        const { data: board } = await supabase
          .from('boards')
          .select('workshop_id')
          .eq('id', targetQuestion?.board_id)
          .single();

        const { data: workshop } = await supabase
          .from('workshops')
          .select('facilitator_id')
          .eq('id', board?.workshop_id)
          .single();

        if (!workshop || workshop.facilitator_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from('notes')
          .update({ question_id: targetQuestionId })
          .eq('id', noteId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'delete-participant': {
        const { participantId } = body;
        if (!participantId || !workshopId) {
          return new Response(
            JSON.stringify({ error: 'Participant ID and Workshop ID required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify workshop ownership
        const { data: workshop } = await supabase
          .from('workshops')
          .select('facilitator_id')
          .eq('id', workshopId)
          .single();

        if (!workshop || workshop.facilitator_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Delete participant's notes first
        await supabase.from('notes').delete().eq('author_id', participantId);
        
        // Delete participant
        await supabase.from('participants').delete().eq('id', participantId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'duplicate-workshop': {
        if (!workshopId) {
          return new Response(
            JSON.stringify({ error: 'Workshop ID required' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Verify ownership
        const { data: existing } = await supabase
          .from('workshops')
          .select('*, boards(*, questions(*))')
          .eq('id', workshopId)
          .single();
        
        if (!existing || existing.facilitator_id !== userId) {
          return new Response(
            JSON.stringify({ error: 'Workshop not found or access denied' }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check workshop limit for free users
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', userId)
          .single();
        
        const plan = profile?.plan || 'free';
        
        if (plan === 'free') {
          const { count } = await supabase
            .from('workshops')
            .select('*', { count: 'exact', head: true })
            .eq('facilitator_id', userId);
          
          if ((count || 0) >= 1) {
            return new Response(
              JSON.stringify({ error: 'Free users can only have 1 workshop. Upgrade to Pro for unlimited workshops.' }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Create new workshop copy
        const newCode = await generateUniqueCode(supabase);
        const { data: newWorkshop, error: workshopError } = await supabase
          .from('workshops')
          .insert({
            name: `${existing.name || 'Workshop'} (kopia)`,
            facilitator_id: userId,
            code: newCode,
            status: 'draft',
            date: new Date().toISOString(),
          })
          .select()
          .single();

        if (workshopError) throw workshopError;

        // Copy boards and questions
        for (const board of existing.boards || []) {
          const { data: newBoard, error: boardError } = await supabase
            .from('boards')
            .insert({
              workshop_id: newWorkshop.id,
              title: board.title,
              color_index: board.color_index,
              time_limit: board.time_limit,
              order_index: board.order_index,
            })
            .select()
            .single();

          if (boardError) {
            logStep("Board copy error", { error: boardError });
            continue;
          }

          // Copy questions
          for (const question of board.questions || []) {
            await supabase
              .from('questions')
              .insert({
                board_id: newBoard.id,
                title: question.title,
                order_index: question.order_index,
              });
          }
        }

        logStep("Workshop duplicated", { originalId: workshopId, newId: newWorkshop.id });

        return new Response(
          JSON.stringify({ success: true, workshop: newWorkshop }),
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
