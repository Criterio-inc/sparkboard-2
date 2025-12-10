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
    console.log(`📋 Categories: ${categories.join(', ')}`);
    
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

    // Extract keywords from each category for better matching
    const extractKeywords = (category: string): string[] => {
      // Split on common separators and extract meaningful words
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

MATCHNINGSLOGIK:
- Om en note nämner "data", "datadrivet", "datadriven" → kolla om någon kategori har nyckelord som "data", "datakvalitet", "datadriven"
- Om en note nämner "kund", "kundservice", "support" → kolla kategorier med "kund", "service"
- Om en note nämner "process", "automatisera", "effektivisera" → kolla kategorier med "process", "arbetssätt"
- Om en note nämner "teknik", "IT", "system", "digital" → kolla kategorier med "teknik", "digital", "system"

EXEMPEL PÅ KORREKT MATCHNING:
- "Arbeta datadrivet" → kategori med "datadriven", "data" i nyckelorden
- "Digital självservice" → kategori med "digital", "kund", "självservice"
- "Förbättra kundupplevelsen" → kategori med "kund"

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
- Använd EXAKT samma kategorinamn som i listan - inklusive alla specialtecken som • och &`;

    const userPrompt = `KATEGORIER ATT SORTERA IN I (använd EXAKT dessa namn i svaret):

${categoriesWithKeywords}

${context ? `KONTEXT FRÅN FACILITATORN: ${context}\n\n` : ''}POST-ITS ATT KLUSTRA:
${notesText}

INSTRUKTION: Tilldela varje post-it till den mest semantiskt relevanta kategorin.
- Analysera innebörden i varje post-it
- Matcha mot nyckelorden i kategorierna
- Kopiera kategorinamnet EXAKT som det står ovan (inklusive • och andra tecken)
- Svara med JSON.`;

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
    
    // KRITISKT: Normalisera JSON-strängen för att hantera tabs och extra whitespace
    // AI returnerar ibland tabs (\t) i kategorinamn som orsakar parsningsfel
    jsonStr = jsonStr
      .replace(/\t/g, ' ')           // Ersätt tabs med mellanslag
      .replace(/  +/g, ' ')          // Ta bort dubbla mellanslag
      .replace(/\n\s*\n/g, '\n');    // Ta bort tomma rader
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response after normalization:", jsonStr);
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
          console.log(`🔄 Fuzzy match (main part): "${aiCategoryName}" → "${cat}"`);
          return cat;
        }
      }
      
      // 3. Substring match
      for (const cat of categories) {
        const catLower = cat.toLowerCase();
        if (catLower.includes(aiMainPart) || aiMainPart.includes(catLower.split('•')[0].trim())) {
          console.log(`🔄 Fuzzy match (substring): "${aiCategoryName}" → "${cat}"`);
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
        console.log(`🔄 Fuzzy match (keywords): "${aiCategoryName}" → "${bestMatch.category}" (${bestMatch.overlap} keywords)`);
        return bestMatch.category;
      }
      
      console.warn(`⚠️ No match found for AI category: "${aiCategoryName}"`);
      return null;
    };

    // Transform the response to include full note data with validation
    const result: Record<string, Array<{ note: NoteInput; confidence: number }>> = {};
    
    for (const [aiCategoryName, clusteredNotes] of Object.entries(parsed.clusters || {})) {
      // Find the best matching category from our list
      const matchedCategory = findBestCategoryMatch(aiCategoryName);
      
      if (!matchedCategory) {
        // If no match found, use the first category as fallback
        console.warn(`⚠️ Using first category as fallback for: "${aiCategoryName}"`);
      }
      
      const finalCategoryName = matchedCategory || categories[0];
      
      // Initialize array if needed
      if (!result[finalCategoryName]) {
        result[finalCategoryName] = [];
      }
      
      // Add notes to this category
      const notesToAdd = (clusteredNotes as Array<{ noteIndex: number; confidence: number }>)
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
      
      result[finalCategoryName].push(...notesToAdd);
    }

    // Log final clustering result
    console.log(`✅ Clustered ${notes.length} notes into ${Object.keys(result).length} categories:`);
    for (const [cat, catNotes] of Object.entries(result)) {
      console.log(`   - "${cat}": ${catNotes.length} notes`);
    }

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
