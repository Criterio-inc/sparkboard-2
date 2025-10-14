import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notes, customPrompt } = await req.json();
    
    console.log("Received analysis request for", notes.length, "notes");
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Format notes for AI context
    const notesContext = notes
      .map((note: any, index: number) => 
        `Note ${index + 1} (by ${note.authorName} on ${note.question}):\n${note.content}`
      )
      .join("\n\n");

    const systemPrompt = `Du är en workshop-analysassistent. Din uppgift är att analysera sticky-notes från workshop-övningar och ge strukturerade insikter. 

Presentera din analys i följande format:

## Huvudteman
Lista 3-5 huvudteman med underrubriker och exempel från notes.

## Key Insights
Beskriv de viktigaste insikterna och mönstren.

## Rekommendationer
Ge konkreta, handlingsbara rekommendationer för nästa steg.

Använd svenska och håll en professionell men tillgänglig ton.`;

    const userPrompt = customPrompt || "Sammanfatta huvudteman och insights från dessa workshop-svar. Gruppera liknande idéer och ge rekommendationer för nästa steg.";

    const fullPrompt = `${userPrompt}\n\n--- WORKSHOP NOTES ---\n${notesContext}`;

    console.log("Calling AI with prompt length:", fullPrompt.length);

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
      console.error("AI API error:", response.status, errorText);
      
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

    console.log("Analysis generated successfully, length:", analysis.length);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-notes function:", error);
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
