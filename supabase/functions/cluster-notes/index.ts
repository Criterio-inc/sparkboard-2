import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, categories, context } = await req.json() as ClusterRequest;
    
    console.log(`🤖 Clustering ${notes.length} notes into ${categories.length} categories`);
    
    if (!notes || notes.length === 0) {
      return new Response(JSON.stringify({ error: "No notes provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!categories || categories.length === 0) {
      return new Response(JSON.stringify({ error: "No categories provided" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the prompt
    const notesText = notes.map((n, i) => `[${i + 1}] "${n.content}" (av ${n.authorName})`).join('\n');
    const categoriesText = categories.map((c, i) => `${i + 1}. ${c}`).join('\n');
    
    const systemPrompt = `Du är en expert på att kategorisera och klustra idéer från workshops.
Din uppgift är att tilldela varje post-it till den mest passande kategorin.
Svara ENDAST med JSON i exakt detta format, inget annat:
{
  "clusters": {
    "Kategorinamn": [
      { "noteIndex": 1, "confidence": 0.95 }
    ]
  }
}

Regler:
- Varje note måste tilldelas exakt EN kategori
- noteIndex är 1-baserat (första noten är 1)
- confidence är ett tal mellan 0 och 1 som indikerar hur säker du är
- Om en note inte passar någon kategori, lägg den i "Övrigt" om den finns, annars i den minst specifika kategorin`;

    const userPrompt = `Kategorier att sortera in i:
${categoriesText}

${context ? `Kontext från facilitatorn: ${context}\n\n` : ''}Post-its att klustra:
${notesText}

Sortera varje post-it till lämplig kategori. Svara med JSON.`;

    console.log("📤 Sending request to Lovable AI...");
    
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
      console.error("AI gateway error:", response.status, errorText);
      
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
      console.error("No content in AI response");
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("📥 AI response received");
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", jsonStr);
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Transform the response to include full note data
    const result: Record<string, Array<{ note: NoteInput; confidence: number }>> = {};
    
    for (const [category, clusteredNotes] of Object.entries(parsed.clusters || {})) {
      result[category] = (clusteredNotes as Array<{ noteIndex: number; confidence: number }>)
        .map(item => {
          const note = notes[item.noteIndex - 1]; // Convert 1-based to 0-based
          if (!note) {
            console.warn(`Note index ${item.noteIndex} not found`);
            return null;
          }
          return {
            note,
            confidence: item.confidence || 0.5,
          };
        })
        .filter(Boolean) as Array<{ note: NoteInput; confidence: number }>;
    }

    console.log(`✅ Clustered ${notes.length} notes into ${Object.keys(result).length} categories`);

    return new Response(JSON.stringify({ clusters: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cluster-notes function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
