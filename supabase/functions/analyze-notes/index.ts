import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify Clerk JWT token and return user ID
function verifyClerkToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub || payload.user_id;
    
    if (!userId) {
      throw new Error('Invalid token - no user ID');
    }
    
    // Check token expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('Token expired');
    }
    
    return userId;
  } catch (error) {
    console.error('Auth failed:', error);
    throw new Error('Unauthorized');
  }
}

// Input validation
interface NoteInput {
  content: string;
  question?: string;
}

function validateInput(notes: any, customPrompt: any): { valid: boolean; error?: string } {
  // Validate notes array
  if (!Array.isArray(notes)) {
    return { valid: false, error: 'Notes must be an array' };
  }
  if (notes.length === 0) {
    return { valid: false, error: 'No notes provided' };
  }
  if (notes.length > 1000) {
    return { valid: false, error: 'Too many notes (max 1000)' };
  }
  
  // Validate each note
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    if (!note.content || typeof note.content !== 'string') {
      return { valid: false, error: `Note ${i + 1}: content must be a string` };
    }
    if (note.content.length > 10000) {
      return { valid: false, error: `Note ${i + 1}: content too long (max 10000 chars)` };
    }
    if (note.question && typeof note.question !== 'string') {
      return { valid: false, error: `Note ${i + 1}: question must be a string` };
    }
    if (note.question && note.question.length > 500) {
      return { valid: false, error: `Note ${i + 1}: question too long (max 500 chars)` };
    }
  }
  
  // Validate custom prompt
  if (!customPrompt || typeof customPrompt !== 'string') {
    return { valid: false, error: 'Custom prompt is required' };
  }
  if (customPrompt.length > 5000) {
    return { valid: false, error: 'Prompt too long (max 5000 chars)' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication FIRST
    const authHeader = req.headers.get('Authorization');
    let userId: string;
    
    try {
      userId = verifyClerkToken(authHeader);
      console.log("[ANALYZE-NOTES] User authenticated:", userId);
    } catch (authError) {
      console.log("[ANALYZE-NOTES] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - please log in" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { notes, customPrompt } = await req.json();
    
    // Validate input
    const validation = validateInput(notes, customPrompt);
    if (!validation.valid) {
      console.log("[ANALYZE-NOTES] Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("[ANALYZE-NOTES] Processing", notes.length, "notes");

    // Create Supabase client to check subscription
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } }
    });

    // Check user's plan in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log("[ANALYZE-NOTES] Error fetching profile:", profileError);
    }

    const userPlan = profile?.plan || 'free';
    console.log("[ANALYZE-NOTES] User plan:", userPlan);

    // Check if user has pro or curago plan
    if (userPlan !== 'pro' && userPlan !== 'curago') {
      console.log("[ANALYZE-NOTES] User does not have Pro plan, blocking AI analysis");
      return new Response(
        JSON.stringify({ error: "AI analysis requires Pro subscription" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Format notes for AI context
    const notesContext = notes
      .map((note: NoteInput, index: number) => 
        `Note ${index + 1} (Question: ${note.question || 'N/A'}):\n${note.content}`
      )
      .join("\n\n");

    // System prompt that ensures good Markdown formatting
    const systemPrompt = `Du är en expert på att analysera workshop-resultat.

KRITISKT: Formatera ALLTID ditt svar med Markdown:
- Använd ## för huvudrubriker
- Använd ### för underrubriker  
- Använd - eller • för punktlistor
- Använd **fetstil** för viktiga koncept
- Lämna en tom rad mellan stycken
- Strukturera tydligt med sektioner

Skriv på samma språk som användarens prompt.`;

    const fullPrompt = `${customPrompt}\n\n--- WORKSHOP NOTES ---\n${notesContext}`;

    console.log("[ANALYZE-NOTES] Calling AI with prompt length:", fullPrompt.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ANALYZE-NOTES] AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit nådd. Försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut. Kontakta administratören." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log("[ANALYZE-NOTES] Analysis generated successfully, length:", analysis.length);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ANALYZE-NOTES] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
