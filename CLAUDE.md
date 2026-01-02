# Sparkboard - Collaborative Workshop Platform

> A full-stack SaaS platform for facilitating collaborative workshops with real-time participant interaction and AI-powered insights.

## Project Overview

**Type**: Full-stack SaaS application
**Architecture**: Edge Function-centralized with Clerk + Supabase + Stripe
**Domain**: Workshop facilitation, brainstorming, and collaborative note-taking
**Deployment**: Lovable.dev integration

## Tech Stack

### Frontend
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool with SWC (fast compilation)
- **shadcn/ui** - 49 accessible UI components built on Radix UI
- **Tailwind CSS 3.4.17** - Utility-first styling
- **TanStack Query 5.83.0** - Server state management and caching
- **React Router 6.30.1** - Client-side routing
- **next-themes 0.3.0** - Dark mode support

### Backend
- **Supabase Edge Functions** - Serverless functions (Deno runtime)
- **PostgreSQL** - Supabase-hosted database
- **Clerk** - Authentication (custom domain: clerk.sparkboard.eu)
- **Stripe** - Payment processing and subscriptions

### Monitoring
- **Sentry 10.32.1** - Error tracking with session replay

## Critical Architecture Patterns

### 🚨 MOST IMPORTANT: Authentication & Database Access

**CRITICAL RULE**: Direct Supabase queries from the frontend DO NOT work with Clerk JWT.

**ALL authenticated database operations MUST go through Edge Functions.**

#### ✅ Correct Pattern
```typescript
import { useAuthenticatedFunctions } from "@/hooks/useAuthenticatedFunctions";

const { invokeWithAuth } = useAuthenticatedFunctions();
const { data, error } = await invokeWithAuth('workshop-operations', {
  operation: 'list-workshops'
});
```

#### ❌ Incorrect Pattern
```typescript
// This FAILS because Supabase PostgREST cannot verify Clerk JWT
const { data } = await supabase.from('workshops').select('*');
```

#### Why This Pattern?
1. **Supabase PostgREST** cannot verify Clerk JWT signatures
2. **Edge Functions** verify JWT using Clerk's JWKS endpoint
3. **Edge Functions** use service role key for database access
4. **Manual filtering** by userId ensures tenant isolation
5. **Subscription logic** is enforced in Edge Functions

For full details, read `/ARCHITECTURE.md` and `/SECURITY.md`.

### Edge Function Security Pattern

When creating or modifying Edge Functions, follow this pattern:

```typescript
// 1. Verify Clerk JWT and extract userId
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { userId } = await verifyClerkToken(token);

// 2. Fetch user plan from profiles
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('plan')
  .eq('id', userId)
  .single();

// 3. Check business logic (subscription limits)
if (profile.plan === 'free' && restrictedFeature) {
  return new Response(JSON.stringify({ error: 'Upgrade required' }), {
    status: 403
  });
}

// 4. Manually filter queries by userId
const { data } = await supabaseAdmin
  .from('workshops')
  .select('*')
  .eq('facilitator_id', userId); // CRITICAL: Always filter by userId

// 5. Return filtered results
return new Response(JSON.stringify({ data }), {
  headers: { 'Content-Type': 'application/json' }
});
```

Reference: `/supabase/functions/workshop-operations/index.ts`

### Subscription Tiers

The platform has three subscription tiers enforced in Edge Functions:

| Plan | Workshops | Participants/Workshop | AI Features | Detection |
|------|-----------|----------------------|-------------|-----------|
| **Free** | 1 active | 5 max | ❌ | Default |
| **Pro** | Unlimited | Unlimited | ✅ | Stripe subscription |
| **Curago** | Unlimited | Unlimited | ✅ | @curago.se email |

**Enforcement**:
- Edge Functions check `profiles.plan` before operations
- Workshop creation: Check active workshop count for Free plan
- Participant limits: Enforced when joining workshops
- AI features: Blocked for Free plan users

### Security Model

**Defense in Depth**:
1. **Primary**: Edge Functions verify Clerk JWT + manual userId filtering
2. **Backup**: Row Level Security (RLS) policies on database tables
3. **Service Role Key**: Only used in Edge Functions, never exposed to client

**Tenant Isolation**:
- All workshops have `facilitator_id` (creator's Clerk userId)
- All queries filter by `facilitator_id` or participant membership
- RLS policies use `auth.uid()::text` (from service role context)

## Project Structure

```
sparkboard2/
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # 49 shadcn/ui components (DO NOT EDIT manually)
│   │   ├── BoardCard.tsx    # Workshop board display
│   │   ├── Navigation.tsx   # Main navigation
│   │   ├── AuthWrapper.tsx  # Protected route wrapper
│   │   └── ...              # Business components
│   ├── pages/               # Route pages (10 pages)
│   │   ├── Index.tsx        # Landing page
│   │   ├── Dashboard.tsx    # Workshop dashboard
│   │   ├── WorkshopDashboard.tsx
│   │   ├── BoardView.tsx    # Participant board view
│   │   ├── ControlPanel.tsx # Facilitator control panel
│   │   └── ...
│   ├── hooks/               # Custom React hooks (7 hooks)
│   │   ├── useAuthenticatedFunctions.ts  # 🚨 CRITICAL: Auth pattern
│   │   ├── useProfile.ts    # User profile management
│   │   ├── useSubscription.ts
│   │   └── useWorkshopLimit.ts
│   ├── contexts/
│   │   └── LanguageContext.tsx  # i18n support (67KB translations)
│   ├── integrations/supabase/
│   │   ├── client.ts        # Supabase client configuration
│   │   └── types.ts         # 🚨 AUTO-GENERATED - DO NOT EDIT
│   ├── lib/                 # Utility libraries
│   ├── utils/               # Helper utilities
│   └── main.tsx             # Application entry point
├── supabase/
│   ├── functions/           # 11 Supabase Edge Functions (Deno)
│   │   ├── workshop-operations/    # Main CRUD operations
│   │   ├── join-workshop/
│   │   ├── create-note/
│   │   ├── analyze-notes/   # AI analysis
│   │   ├── cluster-notes/   # AI clustering
│   │   ├── create-checkout/ # Stripe checkout
│   │   ├── check-subscription/
│   │   ├── customer-portal/ # Stripe portal
│   │   ├── clerk-webhook/   # Clerk user sync
│   │   ├── participant-data/
│   │   └── send-email/
│   ├── migrations/          # 17 SQL migration files
│   └── config.toml          # Supabase configuration
├── public/                  # Static assets
├── .claude/                 # Claude Code configuration
│   ├── commands/            # Custom slash commands
│   └── agents/              # Subagent definitions
├── ARCHITECTURE.md          # 🚨 READ THIS: Detailed architecture docs
├── SECURITY.md              # 🚨 READ THIS: Security model explanation
└── [config files]
```

## Development Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:8080)
npm run build            # Production build
npm run build:dev        # Development mode build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint on all files
npm run typecheck        # Type check with TypeScript (recommended to add)

# Supabase (if working locally)
supabase start           # Start local Supabase
supabase db reset        # Reset local database
supabase functions serve # Serve Edge Functions locally
```

## Workflow: Making Changes

### Adding a New Feature

1. **Plan the change**
   - Identify affected components, pages, hooks
   - Determine if Edge Function changes needed
   - Check subscription tier implications

2. **Database changes** (if needed)
   - Create migration: `/workshop:add-migration`
   - Update RLS policies
   - Regenerate types.ts from Supabase dashboard

3. **Edge Function changes** (if authenticated data access)
   - Use `/workshop:new-edge-function` command
   - Follow security pattern (JWT verification + manual filtering)
   - Check subscription plan before restricted operations

4. **Frontend changes**
   - Add/modify components in `src/components/`
   - Add pages in `src/pages/`
   - Create hooks in `src/hooks/` for reusable logic
   - Use `useAuthenticatedFunctions` for Edge Function calls

5. **Verify**
   ```bash
   npm run lint         # Check code style
   npm run typecheck    # Verify TypeScript
   npm run build        # Ensure builds successfully
   ```

6. **Test across subscription tiers**
   - Use `/workshop:test-subscription-tier` command
   - Verify Free plan limits work
   - Verify Pro/Curago features accessible

### Bug Fixes

1. **Gather context**
   - Read relevant files
   - Check Sentry for error details
   - Review recent changes in git

2. **Identify root cause**
   - Is it frontend or backend?
   - Is it subscription-tier specific?
   - Does it affect tenant isolation?

3. **Fix and verify**
   - Make minimal changes
   - Test across tiers if applicable
   - Check for similar issues elsewhere

4. **Commit with clear message**
   ```bash
   git add .
   git commit -m "fix: [clear description of what was fixed]"
   ```

## Common Patterns

### Creating a Component

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <Card>
      <CardHeader>{title}</CardHeader>
      <CardContent>
        <Button onClick={onAction}>Click me</Button>
      </CardContent>
    </Card>
  );
}
```

**Conventions**:
- Use shadcn/ui components from `@/components/ui/`
- Use Tailwind CSS for styling
- Define TypeScript interfaces for props
- Support dark mode (components inherit theme)

### Fetching Data with Edge Functions

```typescript
import { useAuthenticatedFunctions } from "@/hooks/useAuthenticatedFunctions";
import { useQuery } from "@tanstack/react-query";

export function MyComponent() {
  const { invokeWithAuth } = useAuthenticatedFunctions();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-data'],
    queryFn: async () => {
      const { data, error } = await invokeWithAuth('workshop-operations', {
        operation: 'list-workshops'
      });
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Render data */}</div>;
}
```

### Creating Forms

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Handle form submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## File Boundaries

### ✅ Safe to Edit
- `/src/` (all files except types.ts)
- `/supabase/functions/` (Edge Functions)
- `/supabase/migrations/` (new migrations only, never edit old ones)
- `/.claude/` (commands and agents)
- `/public/` (static assets)

### 📖 Read-Only (Generated or External)
- `/src/integrations/supabase/types.ts` - Auto-generated from Supabase schema
- `/src/components/ui/` - shadcn/ui components (regenerate instead of editing)
- `/.env` - Contains secrets (never commit, copy from .env.example)

### 🚫 Never Touch
- `/node_modules/` - Package dependencies
- `/.git/` - Git internals
- `/dist/` - Build output
- `/bun.lockb`, `/package-lock.json` - Lock files

## Verification Commands

After making changes, run these to verify:

```bash
# Type safety
npm run typecheck        # Verify TypeScript types

# Code quality
npm run lint             # Check ESLint rules

# Build
npm run build            # Ensure production build succeeds

# Manual testing checklist
# - Test in both light and dark mode
# - Test across Free, Pro, and Curago plans
# - Verify responsive design (mobile, tablet, desktop)
# - Check browser console for errors
```

## Important Files to Reference

| File | Purpose |
|------|---------|
| `/ARCHITECTURE.md` | Detailed architecture explanation |
| `/SECURITY.md` | Security model and RLS policies |
| `/src/hooks/useAuthenticatedFunctions.ts` | Auth pattern implementation |
| `/supabase/functions/workshop-operations/index.ts` | Edge Function example |
| `/src/integrations/supabase/types.ts` | Database type definitions |
| `/components.json` | shadcn/ui configuration |

## Gotchas & Common Issues

### 1. TypeScript is Lenient
The `tsconfig.json` has strict mode disabled:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedLocals: false`

**Recommendation**: Still aim for type safety even though compiler is permissive.

### 2. No Automated Tests
There are currently no tests in the codebase.
- Manual testing is required
- Consider adding Vitest for unit/integration tests

### 3. RLS Policies are Backup Only
Don't rely on RLS alone - Edge Functions handle primary security.
- RLS exists for defense in depth
- All authenticated operations go through Edge Functions

### 4. Curago Auto-Detection
Users with `@curago.se` email automatically get Curago plan:
- Detected in Edge Functions
- Check `profiles.plan` field
- No Stripe subscription needed

### 5. Mixed Package Managers
Project has both `package-lock.json` and `bun.lockb`.
- Use `npm` for consistency (matches npm scripts)
- Consider removing one lock file

### 6. Lovable.dev Integration
This project uses Lovable for deployment:
- `lovable-tagger` dev dependency
- Specific deployment workflows may exist

## Language Support

The application has comprehensive internationalization:
- Context: `LanguageContext.tsx` (67KB of translations)
- Supports multiple languages for the UI
- Check context for adding new translatable strings

## AI Features

AI-powered features (Pro/Curago plans only):
- **Note Analysis**: Summarize and extract insights from notes
- **Note Clustering**: Group similar notes using AI
- Edge Functions: `analyze-notes`, `cluster-notes`

## Getting Help

### Custom Slash Commands
- `/workshop:new-edge-function` - Create new Edge Function with auth
- `/workshop:add-migration` - Create database migration with RLS
- `/workshop:test-subscription-tier` - Test across subscription tiers
- `/workshop:add-ui-component` - Add shadcn/ui component

### Specialized Subagents
- **edge-function-creator** - Expert in secure Edge Functions
- **type-safety-reviewer** - Reviews TypeScript for type safety
- **subscription-validator** - Validates subscription logic

### External Resources
- shadcn/ui docs: https://ui.shadcn.com
- Supabase docs: https://supabase.com/docs
- Clerk docs: https://clerk.com/docs
- React Query docs: https://tanstack.com/query

## Quick Reference: Subscription Logic

```typescript
// In Edge Functions
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('plan')
  .eq('id', userId)
  .single();

if (profile.plan === 'free') {
  // Check limits
  const activeWorkshops = await getActiveWorkshopCount(userId);
  if (activeWorkshops >= 1) {
    return new Response(JSON.stringify({
      error: 'Free plan limited to 1 active workshop'
    }), { status: 403 });
  }
}

if (aiFeature && profile.plan === 'free') {
  return new Response(JSON.stringify({
    error: 'AI features require Pro or Curago plan'
  }), { status: 403 });
}
```

## Testing Checklist

When adding features or fixing bugs:

- [ ] Tested with Free plan (1 workshop limit, 5 participants, no AI)
- [ ] Tested with Pro plan (unlimited workshops, AI enabled)
- [ ] Tested with Curago plan (@curago.se auto-detect)
- [ ] Tested in light mode
- [ ] Tested in dark mode
- [ ] Tested on mobile viewport
- [ ] Checked browser console for errors
- [ ] Verified TypeScript types
- [ ] Ran linter
- [ ] Verified build succeeds
- [ ] Checked that users can't access other users' data

## Contributing

When working on this project:
1. Follow the Edge Function security pattern religiously
2. Always filter database queries by userId
3. Test across all subscription tiers
4. Keep components small and focused
5. Use TypeScript types even though strictness is off
6. Add comments for complex business logic
7. Reference ARCHITECTURE.md and SECURITY.md when unsure
