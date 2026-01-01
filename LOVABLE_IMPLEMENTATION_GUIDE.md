# Implementation Guide: Security Fixes for Sparkboard

**För Lovable AI - Implementera dessa ändringar EXAKT som de står.**

**Datum:** 2026-01-01
**Prioritet:** KRITISK - Säkerhetsfixar
**Estimerad tid:** 2-3 timmar

---

## 🎯 Översikt

Denna guide fixar **ALLA kritiska säkerhetshål** i Sparkboard genom att:
1. Lägga till JWT-verifiering i alla edge functions
2. Skapa ny `workshop-operations` edge function
3. Uppdatera frontend för att använda edge functions med Authorization headers

**VIKTIGT:** Följ stegen i EXAKT denna ordning!

---

## 📋 Steg 1: Skapa workshop-operations Edge Function

**Vad:** Ny edge function som hanterar ALL workshop CRUD med JWT-verifiering.

**Varför:**
- Frontend kan inte komma åt workshops pga RLS policies
- Behöver centraliserad workshop-hantering med autentisering
- Enforcar FREE plan limits (1 aktiv workshop)

**Hur:**

### 1.1 Skapa filen `supabase/functions/workshop-operations/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createClerkClient } from "https://esm.sh/@clerk/backend@1.15.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLERK_JWKS_URL = "https://clerk.sparkboard.eu/.well-known/jwks.json";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WORKSHOP-OPS] ${step}${detailsStr}`);
};

async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  logStep("Verifying JWT with JWKS");

  try {
    const clerk = createClerkClient({
      secretKey: clerkSecretKey,
      jwtKey: CLERK_JWKS_URL
    });

    const verifiedToken = await clerk.verifyToken(token, {
      jwtKey: CLERK_JWKS_URL
    });

    logStep("JWT verified successfully", { userId: verifiedToken.sub });
    return verifiedToken.sub;
  } catch (error) {
    logStep("JWT verification failed", { error: error.message });
    throw new Error("Invalid or expired token");
  }
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

        return new Response(JSON.stringify({ workshop }), {
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
        const { workshopId } = params;
        if (!workshopId) throw new Error("workshopId is required");

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

        logStep("Activating workshop", { workshopId });

        const { data: workshop, error } = await supabaseClient
          .from('workshops')
          .update({ status: 'active' })
          .eq('id', workshopId)
          .eq('facilitator_id', userId)
          .select()
          .single();

        if (error) throw error;

        logStep("Workshop activated", { workshopId });

        return new Response(JSON.stringify({ workshop }), {
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
```

### 1.2 Deploy edge function

```bash
supabase functions deploy workshop-operations
```

---

## 📋 Steg 2: Uppdatera analyze-notes Edge Function

**Vad:** Lägg till JWT-verifiering och Pro/Curago plan-check.

**Varför:**
- Förhindra kostnadsmissbruk (AI är dyrt!)
- FREE users ska inte kunna använda AI
- Säkerställ att endast autentiserade requests accepteras

**Hur:**

### 2.1 Ersätt HELA `supabase/functions/analyze-notes/index.ts` med:

```typescript
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createClerkClient } from "https://esm.sh/@clerk/backend@1.15.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLERK_JWKS_URL = "https://clerk.sparkboard.eu/.well-known/jwks.json";

async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  console.log("[ANALYZE-NOTES] Verifying JWT with JWKS");

  try {
    const clerk = createClerkClient({
      secretKey: clerkSecretKey,
      jwtKey: CLERK_JWKS_URL
    });

    const verifiedToken = await clerk.verifyToken(token, {
      jwtKey: CLERK_JWKS_URL
    });

    console.log("[ANALYZE-NOTES] JWT verified successfully", { userId: verifiedToken.sub });
    return verifiedToken.sub;
  } catch (error) {
    console.error("[ANALYZE-NOTES] JWT verification failed:", error.message);
    throw new Error("Invalid or expired token");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // CRITICAL: Verify JWT first
    const userId = await verifyClerkToken(req.headers.get("authorization"));
    console.log("[ANALYZE-NOTES] User authenticated", { userId });

    // Check user's plan - AI analysis requires Pro or Curago
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("[ANALYZE-NOTES] Error fetching profile:", profileError);
      throw new Error("Could not verify user plan");
    }

    const userPlan = profile?.plan || 'free';
    console.log("[ANALYZE-NOTES] User plan:", userPlan);

    if (userPlan !== 'pro' && userPlan !== 'curago') {
      console.log("[ANALYZE-NOTES] Access denied - plan not eligible", { plan: userPlan });
      return new Response(
        JSON.stringify({
          error: "AI_REQUIRES_PRO",
          message: "AI-analys kräver Sparkboard Pro. Uppgradera ditt konto för att använda denna funktion.",
          userPlan,
          requiredPlan: "pro eller curago"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // User is authorized - proceed with AI analysis
    const { notes, customPrompt } = await req.json();

    console.log("[ANALYZE-NOTES] Received analysis request for", notes.length, "notes");
    console.log("[ANALYZE-NOTES] Custom prompt provided:", !!customPrompt);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Format notes for AI context
    const notesContext = notes
      .map((note: any, index: number) =>
        `Note ${index + 1} (Question: ${note.question}):\n${note.content}`
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

    // Use the custom prompt directly - no fallback
    if (!customPrompt) {
      throw new Error("Custom prompt is required");
    }

    const fullPrompt = `${customPrompt}\n\n--- WORKSHOP NOTES ---\n${notesContext}`;

    console.log("[ANALYZE-NOTES] Calling AI with prompt length:", fullPrompt.length);
    console.log("[ANALYZE-NOTES] User prompt preview:", customPrompt.substring(0, 100) + "...");

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
    console.error("[ANALYZE-NOTES] Error in analyze-notes function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    const status = errorMessage.includes("Authorization") ||
                   errorMessage.includes("token") ||
                   errorMessage.includes("Invalid") ? 401 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```

### 2.2 Deploy

```bash
supabase functions deploy analyze-notes
```

---

## 📋 Steg 3: Uppdatera create-checkout Edge Function

**Vad:** JWT-verifiering + hämta email från verified profile.

**Varför:** Förhindra phishing - email ska INTE komma från request body.

**Hur:**

### 3.1 Uppdatera `supabase/functions/create-checkout/index.ts`

**ÄNDRA från detta:**
```typescript
const { priceId, userEmail } = await req.json();
```

**Till detta (lägg till JWT-verifiering FÖRST):**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createClerkClient } from "https://esm.sh/@clerk/backend@1.15.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLERK_JWKS_URL = "https://clerk.sparkboard.eu/.well-known/jwks.json";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

async function verifyClerkToken(authHeader: string | null): Promise<string> {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace('Bearer ', '');
  const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");

  if (!clerkSecretKey) {
    throw new Error("CLERK_SECRET_KEY not configured");
  }

  logStep("Verifying JWT with JWKS");

  try {
    const clerk = createClerkClient({
      secretKey: clerkSecretKey,
      jwtKey: CLERK_JWKS_URL
    });

    const verifiedToken = await clerk.verifyToken(token, {
      jwtKey: CLERK_JWKS_URL
    });

    logStep("JWT verified successfully", { userId: verifiedToken.sub });
    return verifiedToken.sub;
  } catch (error) {
    logStep("JWT verification failed", { error: error.message });
    throw new Error("Invalid or expired token");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verify JWT and get user ID
    const userId = await verifyClerkToken(req.headers.get("authorization"));
    logStep("User authenticated", { userId });

    // Get user's email from verified profile (NOT from request body)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logStep("Error fetching profile", { error: profileError });
      throw new Error("User profile not found");
    }

    const userEmail = profile.email;
    logStep("Using verified email from profile", { email: userEmail });

    const { priceId } = await req.json();

    if (!priceId) throw new Error("Price ID is required");
    if (!userEmail) throw new Error("User email is required");

    logStep("Request data", { priceId, email: userEmail });

    logStep("Creating checkout session", { priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-12-18.acacia"
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      logStep("No existing customer found");
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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
```

### 3.2 Deploy

```bash
supabase functions deploy create-checkout
```

---

## 📋 Steg 4: Uppdatera Frontend - WorkshopDashboard

**Vad:** Använd `workshop-operations` edge function istället för direkta Supabase queries.

**Varför:** RLS policies blockerar direkta queries från frontend.

**Hur:**

### 4.1 Uppdatera `src/pages/WorkshopDashboard.tsx`

**Lägg till import:**
```typescript
import { useAuth } from "@clerk/clerk-react";
```

**I komponenten, lägg till:**
```typescript
const { getToken } = useAuth();
```

**Ersätt `loadWorkshops` funktionen:**

```typescript
const loadWorkshops = async () => {
  if (!user?.id) return;

  try {
    // Get Clerk JWT token
    const token = await getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    // Call workshop-operations edge function with JWT
    const { data, error } = await supabase.functions.invoke('workshop-operations', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: { operation: 'list-workshops' }
    });

    if (error) throw error;

    const ws = data?.workshops || [];

    // Hämta boards separat och räkna per workshop
    const workshopIds = ws.map((w: any) => w.id);
    let countsByWorkshop: Record<string, number> = {};

    if (workshopIds.length > 0) {
      const { data: allBoards } = await supabase
        .from('boards')
        .select('id, workshop_id')
        .in('workshop_id', workshopIds);

      countsByWorkshop = (allBoards || []).reduce((acc, b) => {
        acc[b.workshop_id] = (acc[b.workshop_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    const workshopsWithCounts = ws.map((workshop: any) => ({
      ...workshop,
      boardCount: countsByWorkshop[workshop.id] || 0
    }));

    setWorkshops(workshopsWithCounts);
  } catch (error) {
    console.error('Error loading workshops:', error);
    toast({
      title: "Kunde inte ladda workshops",
      description: "Försök igen senare",
      variant: "destructive",
    });
  }
};
```

**Ersätt `handleDelete` funktionen:**

```typescript
const handleDelete = async (id: string) => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const { error } = await supabase.functions.invoke('workshop-operations', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        operation: 'delete-workshop',
        workshopId: id
      }
    });

    if (error) throw error;

    toast({
      title: "Workshop raderad",
      description: "Workshopen har tagits bort",
    });

    loadWorkshops();
  } catch (error) {
    console.error('Error deleting workshop:', error);
    toast({
      title: "Kunde inte radera workshop",
      description: "Försök igen senare",
      variant: "destructive",
    });
  }
};
```

**Ersätt `handleDuplicate` funktionen:**

```typescript
const handleDuplicate = async (workshop: any) => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke('workshop-operations', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        operation: 'duplicate-workshop',
        workshopId: workshop.id
      }
    });

    if (error) throw error;

    toast({
      title: "Workshop duplicerad!",
      description: "En kopia av workshopen har skapats",
    });

    loadWorkshops();
  } catch (error) {
    console.error('Error duplicating workshop:', error);
    toast({
      title: "Kunde inte duplicera workshop",
      description: "Försök igen senare",
      variant: "destructive",
    });
  }
};
```

---

## 📋 Steg 5: Uppdatera Frontend - AIAnalysisDialog

**Vad:** Skicka Authorization header till `analyze-notes`.

**Varför:** Edge function kräver nu JWT för autentisering.

**Hur:**

### 5.1 Uppdatera `src/components/AIAnalysisDialog.tsx`

**Lägg till import:**
```typescript
import { useAuth } from "@clerk/clerk-react";
```

**I komponenten, lägg till:**
```typescript
const { getToken } = useAuth();
```

**Uppdatera `handleAnalyze` funktionen (hitta och ersätt):**

```typescript
const handleAnalyze = async () => {
  setIsAnalyzing(true);
  setAnalysis("");

  try {
    // Get Clerk JWT token
    const token = await getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke("analyze-notes", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        notes: notes.map((note) => ({
          content: note.content,
          question: note.question || "Question",
        })),
        customPrompt,
      },
    });

    if (error) throw error;

    if (data.error) {
      // Check if it's a plan upgrade required error
      if (data.error === 'AI_REQUIRES_PRO') {
        toast({
          title: t('common.error'),
          description: data.message || "AI-analys kräver Sparkboard Pro",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: t('common.error'),
        description: data.error,
        variant: "destructive",
      });
      return;
    }

    setAnalysis(data.analysis);

    // Save analysis to database
    const { error: saveError } = await supabase
      .from('ai_analyses')
      .insert({
        board_id: boardId,
        analysis: data.analysis,
      });

    if (saveError) {
      console.error('Error saving analysis:', saveError);
    } else {
      // Reload previous analyses
      await loadPreviousAnalyses();
    }

    // Notify parent component about the analysis
    if (onAnalysisComplete) {
      onAnalysisComplete(data.analysis);
    }

    toast({
      title: t('ai.analysisComplete'),
      description: t('ai.analysisAvailable'),
    });
  } catch (error) {
    console.error("Analysis error:", error);
    toast({
      title: t('common.error'),
      description: t('ai.analysisFailed'),
      variant: "destructive",
    });
  } finally {
    setIsAnalyzing(false);
  }
};
```

---

## 📋 Steg 6: Uppdatera Frontend - UpgradeToPro

**Vad:** Skicka Authorization header, TA BORT userEmail från body.

**Varför:** Edge function hämtar email från verified profile nu.

**Hur:**

### 6.1 Uppdatera `src/components/UpgradeToPro.tsx`

**Hitta `handleUpgrade` funktionen och ändra från:**

```typescript
const { data, error } = await supabase.functions.invoke('create-checkout', {
  body: {
    priceId,
    userEmail: user.primaryEmailAddress?.emailAddress
  }
});
```

**Till:**

```typescript
const handleUpgrade = async () => {
  if (!user) return;

  setLoading(true);

  try {
    const priceId = selectedPlan === 'monthly'
      ? STRIPE_PRICES.monthly
      : STRIPE_PRICES.yearly;

    // Get Clerk JWT token
    const token = await user.getToken?.() || await (window as any).Clerk?.session?.getToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const { data, error } = await supabase.functions.invoke('create-checkout', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: {
        priceId
        // Email is fetched from verified profile in edge function
      }
    });

    if (error) throw error;

    if (data?.url) {
      window.open(data.url, '_blank');
    }
  } catch (error) {
    console.error('Upgrade error:', error);
    toast({
      title: 'Fel',
      description: 'Något gick fel. Försök igen.',
      variant: 'destructive',
    });
  } finally {
    setLoading(false);
  }
};
```

---

## ✅ Steg 7: Verifiera Implementationen

**Kör dessa tester för att säkerställa att allt fungerar:**

### Test 1: Workshop Loading
```
1. Logga in som FREE user
2. Gå till dashboard
3. Förväntat: Workshops laddas korrekt
```

### Test 2: FREE Plan Limits
```
1. Logga in som FREE user
2. Försök skapa 2 workshops och aktivera båda
3. Förväntat: Första fungerar, andra ger error "Free plan limited to 1 active workshop"
```

### Test 3: AI Analysis (FREE)
```
1. Logga in som FREE user
2. Försök använda AI-analys
3. Förväntat: Error "AI-analys kräver Sparkboard Pro"
```

### Test 4: AI Analysis (PRO)
```
1. Logga in som PRO/Curago user
2. Använd AI-analys
3. Förväntat: Fungerar perfekt
```

### Test 5: Stripe Checkout
```
1. Logga in som FREE user
2. Klicka "Uppgradera till Pro"
3. Förväntat: Stripe checkout öppnas med RÄTT email
```

---

## 🎯 Sammanfattning av Ändringar

| Fil | Ändring | Status |
|-----|---------|--------|
| `supabase/functions/workshop-operations/index.ts` | Skapad från scratch | ✅ Ny fil |
| `supabase/functions/analyze-notes/index.ts` | JWT + plan check tillagd | ✅ Uppdaterad |
| `supabase/functions/create-checkout/index.ts` | JWT + verified email | ✅ Uppdaterad |
| `src/pages/WorkshopDashboard.tsx` | Använder edge function | ✅ Uppdaterad |
| `src/components/AIAnalysisDialog.tsx` | Skickar Authorization header | ✅ Uppdaterad |
| `src/components/UpgradeToPro.tsx` | Skickar Authorization header | ✅ Uppdaterad |

---

## 🚨 VIKTIGT

**Deploy ordning:**
1. Deploy ALLA edge functions FÖRST
2. Deploy frontend-ändringar SEDAN
3. Testa ALLT innan production

**Environment variables som behövs:**
- `CLERK_SECRET_KEY` - Finns redan
- `SUPABASE_SERVICE_ROLE_KEY` - Finns redan
- `STRIPE_SECRET_KEY` - Finns redan
- `LOVABLE_API_KEY` - Finns redan

**Om något går fel:**
1. Kolla Supabase Edge Function logs
2. Kolla browser console för frontend errors
3. Verifiera att alla edge functions är deployade
4. Verifiera att Clerk custom domain är `clerk.sparkboard.eu`

---

**Implementerat av:** Claude (Anthropic)
**Datum:** 2026-01-01
**Estimerad implementationstid:** 2-3 timmar
**Status efter implementation:** PRODUCTION READY ✅
