import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NoteInput {
  id: string;
  content: string;
  authorName: string;
}

interface ClusterRequest {
  notes: NoteInput[];
  categories: string[];
  context?: string;
}

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
    console.error('[CLUSTER-NOTES] Auth failed:', error);
    throw new Error('Unauthorized');
  }
}

// Input validation
function validateInput(body: ClusterRequest): { valid: boolean; error?: string } {
  const { notes, categories, context } = body;
  
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
    if (!note.id || typeof note.id !== 'string') {
      return { valid: false, error: `Note ${i + 1}: id must be a string` };
    }
    if (!note.content || typeof note.content !== 'string') {
      return { valid: false, error: `Note ${i + 1}: content must be a string` };
    }
    if (note.content.length > 10000) {
      return { valid: false, error: `Note ${i + 1}: content too long (max 10000 chars)` };
    }
    if (note.authorName && typeof note.authorName !== 'string') {
      return { valid: false, error: `Note ${i + 1}: authorName must be a string` };
    }
  }
  
  // Validate categories
  if (!Array.isArray(categories)) {
    return { valid: false, error: 'Categories must be an array' };
  }
  if (categories.length === 0) {
    return { valid: false, error: 'No categories provided' };
  }
  if (categories.length > 50) {
    return { valid: false, error: 'Too many categories (max 50)' };
  }
  for (let i = 0; i < categories.length; i++) {
    if (typeof categories[i] !== 'string') {
      return { valid: false, error: `Category ${i + 1}: must be a string` };
    }
    if (categories[i].length > 500) {
      return { valid: false, error: `Category ${i + 1}: too long (max 500 chars)` };
    }
  }
  
  // Validate context
  if (context !== undefined && context !== null) {
    if (typeof context !== 'string') {
      return { valid: false, error: 'Context must be a string' };
    }
    if (context.length > 2000) {
      return { valid: false, error: 'Context too long (max 2000 chars)' };
    }
  }
  
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication FIRST
    const authHeader = req.headers.get('Authorization');
    let userId: string;
    
    try {
      userId = verifyClerkToken(authHeader);
      console.log("[CLUSTER-NOTES] User authenticated:", userId);
    } catch (authError) {
      console.log("[CLUSTER-NOTES] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - please log in" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as ClusterRequest;
    const { notes, categories, context } = body;
    
    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      console.log("[CLUSTER-NOTES] Validation failed:", validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[CLUSTER-NOTES] Clustering ${notes.length} notes into ${categories.length} categories`);

    // Check user's plan in profiles table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader! } }
    });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.log("[CLUSTER-NOTES] Error fetching profile:", profileError);
    }

    const userPlan = profile?.plan || 'free';
    console.log("[CLUSTER-NOTES] User plan:", userPlan);

    // Check if user has pro or curago plan
    if (userPlan !== 'pro' && userPlan !== 'curago') {
      console.log("[CLUSTER-NOTES] User does not have Pro plan, blocking AI clustering");
      return new Response(
        JSON.stringify({ error: "AI clustering requires Pro subscription" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("[CLUSTER-NOTES] LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract keywords from each category for better matching
    const extractKeywords = (category: string): string[] => {
      const words = category
        .split(/[•&,\-–—]/)
        .flatMap(part => part.trim().toLowerCase().split(/\s+/))
        .filter(word => word.length > 2)
        .filter(word => !['och', 'för', 'med', 'att', 'som', 'det', 'den', 'ett', 'en'].includes(word));
      return [...new Set(words)];
    };

    // Build the prompt with categories and their keywords
    const notesText = notes.map((n, i) => `[${i + 1}] "${n.content}" (av ${n.authorName})`).join('\n');
    
    const categoriesWithKeywords = categories.map((c, i) => {
      const keywords = extractKeywords(c);
      return `${i + 1}. EXAKT NAMN: "${c}"\n   Nyckelord för matchning: ${keywords.join(', ')}`;
    }).join('\n\n');
    
    const systemPrompt = `Du är en expert på att kategorisera och klustra idéer från workshops.

KRITISKA REGLER - DU MÅSTE FÖLJA DESSA EXAKT:

1. Du MÅSTE använda EXAKT de kategorinamn som anges - kopiera dem TECKEN FÖR TECKEN
2. Skapa ALDRIG nya kategorier eller ändra stavning/formulering
3. Varje note ska tilldelas den MEST SEMANTISKT RELEVANTA kategorin baserat på innehållets betydelse
4. Analysera nyckelorden i varje kategori och matcha noter som handlar om samma ämne

Svara ENDAST med JSON i exakt detta format (inget annat!):
{
  "clusters": {
    "[KOPIERA EXAKT KATEGORINAMN HÄR]": [
      { "noteIndex": 1, "confidence": 0.95 }
    ]
  }
}

VIKTIGT:
- noteIndex är 1-baserat (första noten är 1)
- confidence är ett tal mellan 0 och 1
- Varje note MÅSTE tilldelas EXAKT EN kategori
- Använd EXAKT samma kategorinamn som i listan`;

    const userPrompt = `KATEGORIER ATT SORTERA IN I (använd EXAKT dessa namn i svaret):

${categoriesWithKeywords}

${context ? `KONTEXT FRÅN FACILITATORN: ${context}\n\n` : ''}POST-ITS ATT KLUSTRA:
${notesText}

INSTRUKTION: Tilldela varje post-it till den mest semantiskt relevanta kategorin. Svara med JSON.`;

    console.log("[CLUSTER-NOTES] Sending request to Lovable AI...");
    
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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CLUSTER-NOTES] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("[CLUSTER-NOTES] No content in AI response");
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("[CLUSTER-NOTES] AI response received");
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    // Normalize JSON string
    jsonStr = jsonStr
      .replace(/\t/g, ' ')
      .replace(/  +/g, ' ')
      .replace(/\n\s*\n/g, '\n');
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[CLUSTER-NOTES] Failed to parse AI response:", jsonStr);
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper function for fuzzy category matching
    const findBestCategoryMatch = (aiCategoryName: string): string | null => {
      const aiLower = aiCategoryName.toLowerCase().trim();
      
      // 1. Exact match
      const exactMatch = categories.find(c => c.toLowerCase().trim() === aiLower);
      if (exactMatch) return exactMatch;
      
      // 2. Match by main part (before first •)
      const aiMainPart = aiLower.split('•')[0].trim();
      for (const cat of categories) {
        const catMainPart = cat.toLowerCase().split('•')[0].trim();
        if (catMainPart === aiMainPart) {
          return cat;
        }
      }
      
      // 3. Substring match
      for (const cat of categories) {
        const catLower = cat.toLowerCase();
        if (catLower.includes(aiMainPart) || aiMainPart.includes(catLower.split('•')[0].trim())) {
          return cat;
        }
      }
      
      // 4. Keyword overlap match
      const aiKeywords = extractKeywords(aiCategoryName);
      let bestMatch: { category: string; overlap: number } | null = null;
      
      for (const cat of categories) {
        const catKeywords = extractKeywords(cat);
        const overlap = aiKeywords.filter(k => catKeywords.includes(k)).length;
        if (overlap > 0 && (!bestMatch || overlap > bestMatch.overlap)) {
          bestMatch = { category: cat, overlap };
        }
      }
      
      if (bestMatch && bestMatch.overlap >= 1) {
        return bestMatch.category;
      }
      
      console.warn(`[CLUSTER-NOTES] No match found for AI category: "${aiCategoryName}"`);
      return null;
    };

    // Transform the response to include full note data with validation
    const result: Record<string, Array<{ note: NoteInput; confidence: number }>> = {};
    
    for (const [aiCategoryName, clusteredNotes] of Object.entries(parsed.clusters || {})) {
      const matchedCategory = findBestCategoryMatch(aiCategoryName);
      const finalCategoryName = matchedCategory || categories[0];
      
      if (!result[finalCategoryName]) {
        result[finalCategoryName] = [];
      }
      
      const notesToAdd = (clusteredNotes as Array<{ noteIndex: number; confidence: number }>)
        .map(item => {
          const note = notes[item.noteIndex - 1];
          if (!note) {
            console.warn(`[CLUSTER-NOTES] Note index ${item.noteIndex} not found`);
            return null;
          }
          return {
            note,
            confidence: item.confidence || 0.5,
          };
        })
        .filter(Boolean) as Array<{ note: NoteInput; confidence: number }>;
      
      result[finalCategoryName].push(...notesToAdd);
    }

    console.log(`[CLUSTER-NOTES] Clustered ${notes.length} notes into ${Object.keys(result).length} categories`);

    return new Response(JSON.stringify({ clusters: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CLUSTER-NOTES] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
