import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WORKSHOP-OPS] ${step}${detailsStr}`);
};

// Base64URL decode helper
function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace('Bearer ', '');
  const parts = token.split('.');
  
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const payloadB64 = parts[1];
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const payload = JSON.parse(payloadJson);

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired");
  }

  logStep("JWT verified successfully", { userId: payload.sub });
  return payload.sub;
}

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

    // Verify JWT and get user ID
    const userId = await verifyClerkToken(req.headers.get("authorization"));
    logStep("User authenticated", { userId });

    const { operation, ...params } = await req.json();
    logStep("Operation requested", { operation });

    // Get user's plan for limit checking
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    const userPlan = profile?.plan || 'free';
    logStep("User plan", { plan: userPlan });

    switch (operation) {
      case 'list-workshops': {
        logStep("Listing workshops for user");
        const { data: workshops, error } = await supabaseClient
          .from('workshops')
          .select('*')
          .eq('facilitator_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        logStep("Workshops retrieved", { count: workshops?.length || 0 });

        return new Response(JSON.stringify({ workshops }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'get-workshop': {
        const { workshopId } = params;
        if (!workshopId) throw new Error("workshopId is required");

        logStep("Getting workshop", { workshopId });

        const { data: workshop, error } = await supabaseClient
          .from('workshops')
          .select('*')
          .eq('id', workshopId)
          .eq('facilitator_id', userId)
          .single();

        if (error) throw error;

        // Get boards with questions
        const { data: boards, error: boardsError } = await supabaseClient
          .from('boards')
          .select('*')
          .eq('workshop_id', workshopId)
          .order('order_index', { ascending: true });

        if (boardsError) throw boardsError;

        // Get questions for all boards
        const boardIds = boards?.map(b => b.id) || [];
        let boardsWithQuestions = boards || [];

        if (boardIds.length > 0) {
          const { data: questions, error: questionsError } = await supabaseClient
            .from('questions')
            .select('*')
            .in('board_id', boardIds)
            .order('order_index', { ascending: true });

          if (questionsError) throw questionsError;

          // Attach questions to their boards
          boardsWithQuestions = boards.map(board => ({
            ...board,
            questions: questions?.filter(q => q.board_id === board.id) || [],
          }));
        }

        // Check if workshop has any responses (notes)
        let hasResponses = false;
        if (boardIds.length > 0) {
          const { data: allQuestions } = await supabaseClient
            .from('questions')
            .select('id')
            .in('board_id', boardIds);
          
          if (allQuestions && allQuestions.length > 0) {
            const questionIds = allQuestions.map(q => q.id);
            const { count } = await supabaseClient
              .from('notes')
              .select('*', { count: 'exact', head: true })
              .in('question_id', questionIds);
            
            hasResponses = (count || 0) > 0;
          }
        }

        logStep("Workshop retrieved", { workshopId, boardCount: boardsWithQuestions.length, hasResponses });

        return new Response(JSON.stringify({ 
          workshop, 
          boards: boardsWithQuestions,
          hasResponses 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'create-workshop': {
        const { name, date, code } = params;

        // Check FREE plan limits - only 1 ACTIVE workshop
        if (userPlan === 'free') {
          const { count } = await supabaseClient
            .from('workshops')
            .select('*', { count: 'exact', head: true })
            .eq('facilitator_id', userId)
            .eq('status', 'active');

          if (count && count >= 1) {
            logStep("Free plan limit reached", { activeWorkshops: count });
            return new Response(
              JSON.stringify({
                error: "FREE_PLAN_LIMIT",
                message: "Free plan limited to 1 active workshop. Upgrade to Pro for unlimited workshops.",
                limit: 1,
                current: count
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 403,
              }
            );
          }
        }

        logStep("Creating workshop", { name, userPlan });

        const { data: workshop, error } = await supabaseClient
          .from('workshops')
          .insert({
            name,
            date,
            code: code || Math.floor(100000 + Math.random() * 900000).toString(),
            facilitator_id: userId,
            status: 'draft'
          })
          .select()
          .single();

        if (error) throw error;

        logStep("Workshop created", { workshopId: workshop.id });

        return new Response(JSON.stringify({ workshop }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'update-workshop': {
        const { workshopId, updates } = params;
        if (!workshopId) throw new Error("workshopId is required");

        logStep("Updating workshop", { workshopId });

        // Verify ownership
        const { data: existing } = await supabaseClient
          .from('workshops')
          .select('id')
          .eq('id', workshopId)
          .eq('facilitator_id', userId)
          .single();

        if (!existing) {
          return new Response(
            JSON.stringify({ error: "Workshop not found or access denied" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            }
          );
        }

        const { data: workshop, error } = await supabaseClient
          .from('workshops')
          .update(updates)
          .eq('id', workshopId)
          .eq('facilitator_id', userId)
          .select()
          .single();

        if (error) throw error;

        logStep("Workshop updated", { workshopId });

        return new Response(JSON.stringify({ workshop }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'delete-workshop': {
        const { workshopId } = params;
        if (!workshopId) throw new Error("workshopId is required");

        logStep("Deleting workshop", { workshopId });

        const { error } = await supabaseClient
          .from('workshops')
          .delete()
          .eq('id', workshopId)
          .eq('facilitator_id', userId);

        if (error) throw error;

        logStep("Workshop deleted", { workshopId });

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'activate-workshop': {
        const { workshopId: existingId, workshop: workshopData } = params;
        
        logStep("Activating workshop", { existingId, hasWorkshopData: !!workshopData });

        let savedWorkshopId = existingId;
        let savedCode = workshopData?.code;

        // If workshop data is provided, save it first (like save-draft but with active status)
        if (workshopData) {
          // If no existing workshop, create new one
          if (!savedWorkshopId) {
            // Check FREE plan limits before creating
            if (userPlan === 'free') {
              const { count } = await supabaseClient
                .from('workshops')
                .select('*', { count: 'exact', head: true })
                .eq('facilitator_id', userId)
                .eq('status', 'active');

              if (count && count >= 1) {
                logStep("Free plan limit reached on activation", { activeWorkshops: count });
                return new Response(
                  JSON.stringify({
                    error: "FREE_PLAN_LIMIT",
                    message: "Free plan limited to 1 active workshop. Deactivate another workshop or upgrade to Pro.",
                    limit: 1,
                    current: count
                  }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 403,
                  }
                );
              }
            }

            const newCode = savedCode || Math.floor(100000 + Math.random() * 900000).toString();
            
            const { data: newWorkshop, error: createError } = await supabaseClient
              .from('workshops')
              .insert({
                name: workshopData.title,
                facilitator_id: userId,
                code: newCode,
                status: 'active',
                date: new Date().toISOString(),
              })
              .select()
              .single();

            if (createError) throw createError;
            
            savedWorkshopId = newWorkshop.id;
            savedCode = newWorkshop.code;
            logStep("Created new active workshop", { id: savedWorkshopId, code: savedCode });
          } else {
            // Update existing workshop to active
            const { error: updateError } = await supabaseClient
              .from('workshops')
              .update({
                name: workshopData.title,
                status: 'active',
                updated_at: new Date().toISOString(),
              })
              .eq('id', savedWorkshopId)
              .eq('facilitator_id', userId);

            if (updateError) throw updateError;
            logStep("Updated workshop to active", { id: savedWorkshopId });

            // Delete old boards (cascade deletes questions)
            const { error: deleteBoardsError } = await supabaseClient
              .from('boards')
              .delete()
              .eq('workshop_id', savedWorkshopId);

            if (deleteBoardsError) throw deleteBoardsError;
            logStep("Deleted old boards for re-creation");
          }

          // Create new boards with questions
          if (workshopData.boards && workshopData.boards.length > 0) {
            for (let boardIndex = 0; boardIndex < workshopData.boards.length; boardIndex++) {
              const board = workshopData.boards[boardIndex];
              
              const { data: newBoard, error: boardError } = await supabaseClient
                .from('boards')
                .insert({
                  workshop_id: savedWorkshopId,
                  title: board.title,
                  time_limit: board.timeLimit || 15,
                  color_index: board.colorIndex ?? boardIndex,
                  order_index: boardIndex,
                })
                .select()
                .single();

              if (boardError) throw boardError;

              // Create questions for this board
              if (board.questions && board.questions.length > 0) {
                const questionsToInsert = board.questions.map((q: any, qIndex: number) => ({
                  board_id: newBoard.id,
                  title: q.title,
                  order_index: qIndex,
                }));

                const { error: questionsError } = await supabaseClient
                  .from('questions')
                  .insert(questionsToInsert);

                if (questionsError) throw questionsError;
              }
            }
          }
        } else {
          // Just activate existing workshop (no data provided)
          if (!savedWorkshopId) throw new Error("workshopId is required");

          // Check FREE plan limits when activating
          if (userPlan === 'free') {
            const { count } = await supabaseClient
              .from('workshops')
              .select('*', { count: 'exact', head: true })
              .eq('facilitator_id', userId)
              .eq('status', 'active');

            if (count && count >= 1) {
              logStep("Free plan limit reached on activation", { activeWorkshops: count });
              return new Response(
                JSON.stringify({
                  error: "FREE_PLAN_LIMIT",
                  message: "Free plan limited to 1 active workshop. Deactivate another workshop or upgrade to Pro.",
                  limit: 1,
                  current: count
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 403,
                }
              );
            }
          }

          const { error: activateError } = await supabaseClient
            .from('workshops')
            .update({ status: 'active' })
            .eq('id', savedWorkshopId)
            .eq('facilitator_id', userId);

          if (activateError) throw activateError;
        }

        // Get the complete activated workshop
        const { data: finalWorkshop } = await supabaseClient
          .from('workshops')
          .select('*')
          .eq('id', savedWorkshopId)
          .single();

        logStep("Workshop activated", { workshopId: savedWorkshopId });

        return new Response(JSON.stringify({ workshop: finalWorkshop }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'duplicate-workshop': {
        const { workshopId } = params;
        if (!workshopId) throw new Error("workshopId is required");

        logStep("Duplicating workshop", { workshopId });

        // Get original workshop (verify ownership)
        const { data: original, error: fetchError } = await supabaseClient
          .from('workshops')
          .select('*')
          .eq('id', workshopId)
          .eq('facilitator_id', userId)
          .single();

        if (fetchError) throw fetchError;
        if (!original) throw new Error("Workshop not found or access denied");

        // Create duplicate workshop
        const { data: newWorkshop, error: workshopError } = await supabaseClient
          .from('workshops')
          .insert({
            name: `${original.name || 'Workshop'} (kopia)`,
            facilitator_id: userId,
            code: Math.floor(100000 + Math.random() * 900000).toString(),
            status: 'draft',
            date: original.date,
          })
          .select()
          .single();

        if (workshopError) throw workshopError;

        // Duplicate boards
        const { data: boards } = await supabaseClient
          .from('boards')
          .select('*')
          .eq('workshop_id', workshopId);

        if (boards && boards.length > 0) {
          for (const board of boards) {
            const { data: newBoard, error: boardError } = await supabaseClient
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

            if (boardError) throw boardError;

            // Duplicate questions
            const { data: questions } = await supabaseClient
              .from('questions')
              .select('*')
              .eq('board_id', board.id);

            if (questions && questions.length > 0) {
              const questionsToInsert = questions.map(q => ({
                board_id: newBoard.id,
                title: q.title,
                order_index: q.order_index,
              }));

              const { error: questionsError } = await supabaseClient
                .from('questions')
                .insert(questionsToInsert);

              if (questionsError) throw questionsError;
            }
          }
        }

        logStep("Workshop duplicated", {
          originalId: workshopId,
          newId: newWorkshop.id,
          boardCount: boards?.length || 0
        });

        return new Response(JSON.stringify({ workshop: newWorkshop }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case 'save-draft': {
        const { workshopId: existingId, workshop: workshopData } = params;
        
        logStep("Saving draft", { existingId, title: workshopData?.title });

        if (!workshopData) throw new Error("workshop data is required");

        let savedWorkshopId = existingId;
        let savedCode = workshopData.code;

        // If no existing workshop, create new one
        if (!savedWorkshopId) {
          const newCode = savedCode || Math.floor(100000 + Math.random() * 900000).toString();
          
          const { data: newWorkshop, error: createError } = await supabaseClient
            .from('workshops')
            .insert({
              name: workshopData.title,
              facilitator_id: userId,
              code: newCode,
              status: 'draft',
              date: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) throw createError;
          
          savedWorkshopId = newWorkshop.id;
          savedCode = newWorkshop.code;
          logStep("Created new workshop", { id: savedWorkshopId, code: savedCode });
        } else {
          // Update existing workshop
          const { error: updateError } = await supabaseClient
            .from('workshops')
            .update({
              name: workshopData.title,
              updated_at: new Date().toISOString(),
            })
            .eq('id', savedWorkshopId)
            .eq('facilitator_id', userId);

          if (updateError) throw updateError;
          logStep("Updated existing workshop", { id: savedWorkshopId });

          // Delete old boards (cascade deletes questions)
          const { error: deleteBoardsError } = await supabaseClient
            .from('boards')
            .delete()
            .eq('workshop_id', savedWorkshopId);

          if (deleteBoardsError) throw deleteBoardsError;
          logStep("Deleted old boards");
        }

        // Create new boards with questions
        if (workshopData.boards && workshopData.boards.length > 0) {
          for (let boardIndex = 0; boardIndex < workshopData.boards.length; boardIndex++) {
            const board = workshopData.boards[boardIndex];
            
            const { data: newBoard, error: boardError } = await supabaseClient
              .from('boards')
              .insert({
                workshop_id: savedWorkshopId,
                title: board.title,
                time_limit: board.timeLimit || 15,
                color_index: board.colorIndex ?? boardIndex,
                order_index: boardIndex,
              })
              .select()
              .single();

            if (boardError) throw boardError;
            logStep("Created board", { boardId: newBoard.id, title: board.title });

            // Create questions for this board
            if (board.questions && board.questions.length > 0) {
              const questionsToInsert = board.questions.map((q: any, qIndex: number) => ({
                board_id: newBoard.id,
                title: q.title,
                order_index: qIndex,
              }));

              const { error: questionsError } = await supabaseClient
                .from('questions')
                .insert(questionsToInsert);

              if (questionsError) throw questionsError;
              logStep("Created questions", { count: questionsToInsert.length });
            }
          }
        }

        // Get the complete saved workshop
        const { data: finalWorkshop } = await supabaseClient
          .from('workshops')
          .select('*')
          .eq('id', savedWorkshopId)
          .single();

        logStep("Draft saved successfully", { workshopId: savedWorkshopId });

        return new Response(JSON.stringify({ 
          workshop: finalWorkshop,
          success: true 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    const status = errorMessage.includes("Authorization") ||
                   errorMessage.includes("token") ||
                   errorMessage.includes("Invalid") ? 401 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
