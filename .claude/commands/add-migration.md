---
description: Create a new database migration with proper RLS policies for tenant isolation
---

Create a new database migration for Sparkboard with Row Level Security policies.

## Requirements

Ask me for:
1. **Migration purpose** (e.g., "add comments table", "add workshop templates")
2. **Table(s) to create/modify**
3. **Columns and types**
4. **Who should have access** (facilitator only, participants, public?)
5. **Relationships** (foreign keys to other tables)

## Implementation Steps

### 1. Create Migration File

Generate a timestamped migration file:

```bash
# Get current timestamp
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")
FILENAME="${TIMESTAMP}_[descriptive_name].sql"

# Create file in supabase/migrations/
touch "/home/user/sparkboard2/supabase/migrations/${FILENAME}"
```

Example: `20250102153045_add_comments_table.sql`

### 2. Migration Template

Use this template for the migration:

```sql
-- Migration: [Description of what this does]
-- Created: [Date]

-- Create table
CREATE TABLE IF NOT EXISTS public.[table_name] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User/tenant association (CRITICAL for RLS)
  facilitator_id TEXT NOT NULL,
  -- OR
  -- workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,

  -- Your columns here
  name TEXT NOT NULL,
  description TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS [table_name]_facilitator_id_idx
  ON public.[table_name](facilitator_id);

CREATE INDEX IF NOT EXISTS [table_name]_created_at_idx
  ON public.[table_name](created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.[table_name] ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own records
CREATE POLICY "[table_name]_select_own" ON public.[table_name]
  FOR SELECT
  USING (auth.uid()::text = facilitator_id);

-- Policy: Users can insert their own records
CREATE POLICY "[table_name]_insert_own" ON public.[table_name]
  FOR INSERT
  WITH CHECK (auth.uid()::text = facilitator_id);

-- Policy: Users can update their own records
CREATE POLICY "[table_name]_update_own" ON public.[table_name]
  FOR UPDATE
  USING (auth.uid()::text = facilitator_id)
  WITH CHECK (auth.uid()::text = facilitator_id);

-- Policy: Users can delete their own records
CREATE POLICY "[table_name]_delete_own" ON public.[table_name]
  FOR DELETE
  USING (auth.uid()::text = facilitator_id);

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER [table_name]_updated_at
  BEFORE UPDATE ON public.[table_name]
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Grant access to service role (used by Edge Functions)
GRANT ALL ON public.[table_name] TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.[table_name] IS '[Description of table purpose]';
COMMENT ON COLUMN public.[table_name].facilitator_id IS 'Clerk user ID of the owner';
```

### 3. Common RLS Patterns

#### Pattern 1: Direct User Ownership
```sql
-- User owns the record directly
CREATE POLICY "[table]_select" ON public.[table]
  FOR SELECT
  USING (auth.uid()::text = facilitator_id);
```

#### Pattern 2: Workshop-Based Access
```sql
-- User has access via workshop (as facilitator or participant)
CREATE POLICY "[table]_select_via_workshop" ON public.[table]
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workshops w
      WHERE w.id = [table].workshop_id
      AND (
        w.facilitator_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM public.participants p
          WHERE p.workshop_id = w.id
          AND p.clerk_id = auth.uid()::text
        )
      )
    )
  );
```

#### Pattern 3: Public Read, Owner Write
```sql
-- Anyone can read, only owner can write
CREATE POLICY "[table]_select_all" ON public.[table]
  FOR SELECT
  USING (true);

CREATE POLICY "[table]_write_own" ON public.[table]
  FOR INSERT
  WITH CHECK (auth.uid()::text = facilitator_id);
```

#### Pattern 4: Participant Data
```sql
-- Participant can read/write their own data
CREATE POLICY "participants_select_own" ON public.participants
  FOR SELECT
  USING (clerk_id = auth.uid()::text);

-- Facilitator can read all participants in their workshop
CREATE POLICY "participants_select_facilitator" ON public.participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workshops w
      WHERE w.id = participants.workshop_id
      AND w.facilitator_id = auth.uid()::text
    )
  );
```

### 4. Common Table Patterns

#### Owned by User
```sql
CREATE TABLE public.[table] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id TEXT NOT NULL,  -- Owner
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

#### Belongs to Workshop
```sql
CREATE TABLE public.[table] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

#### Many-to-Many Relationship
```sql
CREATE TABLE public.[table1]_[table2] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  [table1]_id UUID NOT NULL REFERENCES public.[table1](id) ON DELETE CASCADE,
  [table2]_id UUID NOT NULL REFERENCES public.[table2](id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Prevent duplicates
  UNIQUE([table1]_id, [table2]_id)
);
```

### 5. After Creating Migration

#### Apply Migration (Local Development)
```bash
cd /home/user/sparkboard2
supabase db reset  # Reset and apply all migrations
```

#### Apply Migration (Production)
Migrations are automatically applied when pushed to Supabase.

#### Regenerate TypeScript Types

After migration is applied:

1. Go to Supabase Dashboard
2. Navigate to Project Settings → API → Generate Types
3. Copy the generated types
4. Replace content in `/src/integrations/supabase/types.ts`

OR use Supabase CLI:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 6. Verification Checklist

After creating the migration, verify:

- [ ] Table name follows existing naming convention (singular/plural?)
- [ ] `facilitator_id` or `workshop_id` column for tenant isolation
- [ ] All foreign keys have `ON DELETE CASCADE` or `ON DELETE SET NULL`
- [ ] Indexes created for foreign keys and commonly queried columns
- [ ] RLS enabled on table
- [ ] RLS policies prevent cross-tenant access
- [ ] Service role has proper grants
- [ ] `updated_at` trigger created (if applicable)
- [ ] Types regenerated in `types.ts`

### 7. Test Migration

Test the migration with these scenarios:

```typescript
// Test 1: Can create record
const { data, error } = await supabaseAdmin
  .from('[table]')
  .insert({ facilitator_id: userId, /* ... */ })
  .select()
  .single();

// Test 2: Can read own records
const { data: records } = await supabaseAdmin
  .from('[table]')
  .select('*')
  .eq('facilitator_id', userId);

// Test 3: CANNOT read other users' records (should return empty)
const { data: otherRecords } = await supabaseAdmin
  .from('[table]')
  .select('*')
  .eq('facilitator_id', 'different-user-id');
// Should return [] due to RLS
```

## Common Migration Examples

### Adding a Column
```sql
-- Add column to existing table
ALTER TABLE public.[table]
  ADD COLUMN new_column TEXT;

-- Add column with default value
ALTER TABLE public.[table]
  ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;

-- Add index on new column
CREATE INDEX IF NOT EXISTS [table]_new_column_idx
  ON public.[table](new_column);
```

### Modifying a Column
```sql
-- Change column type
ALTER TABLE public.[table]
  ALTER COLUMN column_name TYPE BIGINT;

-- Add NOT NULL constraint
ALTER TABLE public.[table]
  ALTER COLUMN column_name SET NOT NULL;

-- Add default value
ALTER TABLE public.[table]
  ALTER COLUMN column_name SET DEFAULT 'value';
```

### Adding Foreign Key
```sql
-- Add foreign key constraint
ALTER TABLE public.[table]
  ADD CONSTRAINT [table]_[referenced_table]_fkey
  FOREIGN KEY (referenced_id)
  REFERENCES public.[referenced_table](id)
  ON DELETE CASCADE;
```

## Important Notes

1. **Never edit old migrations** - Always create new ones
2. **RLS is backup only** - Primary security is in Edge Functions
3. **Use auth.uid()::text** - Clerk user IDs are strings, not UUIDs
4. **Cascade deletes** - Use `ON DELETE CASCADE` for dependent data
5. **Regenerate types** - Always update types.ts after migrations

## Reference Files

- **Existing migrations**: `/supabase/migrations/`
- **RLS examples**: Look at existing table policies in migrations
- **Types file**: `/src/integrations/supabase/types.ts`

Now create your migration!
