---
description: Create a new Supabase Edge Function with proper Clerk authentication and security pattern
---

Create a new Supabase Edge Function following the sparkboard2 security pattern.

## Requirements

Ask me for:
1. **Function name** (e.g., "export-workshop-data")
2. **Purpose** (what does this function do?)
3. **Required permissions** (who can call it? facilitator only, participant, public?)
4. **Database tables accessed** (which tables will it query/modify?)
5. **Subscription tier requirements** (Free, Pro, Curago, or all?)

## Implementation Steps

Once you have the requirements, create the Edge Function following this pattern:

### 1. File Structure

Create `/supabase/functions/[function-name]/index.ts` with:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Verify Clerk JWT
async function verifyClerkToken(token: string): Promise<{ userId: string }> {
  // Fetch JWKS from Clerk
  const jwksUrl = `https://clerk.sparkboard.eu/.well-known/jwks.json`;
  // ... verification logic (copy from workshop-operations)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT and extract userId
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    const { userId } = await verifyClerkToken(token);

    // 2. Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Fetch user plan
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    // 4. Check subscription tier requirements (if applicable)
    if (requiresPro && profile.plan === 'free') {
      return new Response(
        JSON.stringify({
          error: 'This feature requires a Pro or Curago subscription'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 5. Parse request body
    const body = await req.json();

    // 6. Implement business logic with manual filtering by userId
    // CRITICAL: Always filter by userId or verify access
    const { data, error } = await supabaseAdmin
      .from('your_table')
      .select('*')
      .eq('facilitator_id', userId); // ALWAYS filter by user

    if (error) throw error;

    // 7. Return response
    return new Response(
      JSON.stringify({ data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in [function-name]:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

### 2. Security Checklist

Before considering the function complete, verify:

- [ ] JWT verification implemented (copied from workshop-operations)
- [ ] Service role key used for database access
- [ ] ALL database queries filtered by `userId` or verified access
- [ ] Subscription plan checked if feature is restricted
- [ ] CORS headers included
- [ ] Error handling with try/catch
- [ ] Proper logging with console.error
- [ ] No sensitive data in error responses
- [ ] Tenant isolation verified (users can't access other users' data)

### 3. Frontend Integration

After creating the Edge Function, update the frontend:

```typescript
// In your component
import { useAuthenticatedFunctions } from "@/hooks/useAuthenticatedFunctions";

const { invokeWithAuth } = useAuthenticatedFunctions();

const handleAction = async () => {
  const { data, error } = await invokeWithAuth('[function-name]', {
    // request body
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  // Handle success
};
```

## Reference Files

- **Example**: `/supabase/functions/workshop-operations/index.ts`
- **Auth hook**: `/src/hooks/useAuthenticatedFunctions.ts`
- **Architecture**: `/ARCHITECTURE.md`
- **Security**: `/SECURITY.md`

## Testing

After creating the function, test it:

1. **Free plan user**: Verify limits are enforced
2. **Pro plan user**: Verify access granted
3. **Curago plan user**: Verify @curago.se auto-detect works
4. **Tenant isolation**: Verify users can't access other users' data
5. **Error cases**: Test with invalid JWT, missing parameters

## Common Patterns

### Workshop Access Verification
```typescript
// Verify user has access to workshop (as facilitator or participant)
const { data: workshop } = await supabaseAdmin
  .from('workshops')
  .select('*, participants(*)')
  .eq('id', workshopId)
  .single();

const isFacilitator = workshop.facilitator_id === userId;
const isParticipant = workshop.participants.some(p => p.clerk_id === userId);

if (!isFacilitator && !isParticipant) {
  throw new Error('Access denied');
}
```

### Participant Limit Check
```typescript
const { count } = await supabaseAdmin
  .from('participants')
  .select('*', { count: 'exact', head: true })
  .eq('workshop_id', workshopId);

if (profile.plan === 'free' && count >= 5) {
  throw new Error('Free plan limited to 5 participants per workshop');
}
```

### Active Workshop Count
```typescript
const { count } = await supabaseAdmin
  .from('workshops')
  .select('*', { count: 'exact', head: true })
  .eq('facilitator_id', userId)
  .eq('active', true);

if (profile.plan === 'free' && count >= 1) {
  throw new Error('Free plan limited to 1 active workshop');
}
```

Now create the Edge Function with proper security!
