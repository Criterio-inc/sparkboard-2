-- ============================================================================
-- SPARKBOARD SECURITY MIGRATION
-- Implements proper Row Level Security with Clerk authentication
-- ============================================================================

-- Step 1: Drop all existing insecure policies
-- ============================================================================

-- Workshops policies
DROP POLICY IF EXISTS "Workshops are viewable by everyone" ON public.workshops;
DROP POLICY IF EXISTS "Workshops are insertable by everyone" ON public.workshops;
DROP POLICY IF EXISTS "Workshops are updatable by everyone" ON public.workshops;
DROP POLICY IF EXISTS "Workshops are deletable by everyone" ON public.workshops;

-- Boards policies
DROP POLICY IF EXISTS "Boards are viewable by everyone" ON public.boards;
DROP POLICY IF EXISTS "Boards are insertable by everyone" ON public.boards;
DROP POLICY IF EXISTS "Boards are updatable by everyone" ON public.boards;
DROP POLICY IF EXISTS "Boards are deletable by everyone" ON public.boards;

-- Questions policies
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions are insertable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions are updatable by everyone" ON public.questions;
DROP POLICY IF EXISTS "Questions are deletable by everyone" ON public.questions;

-- Notes policies
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON public.notes;
DROP POLICY IF EXISTS "Notes are insertable by everyone" ON public.notes;
DROP POLICY IF EXISTS "Notes are updatable by everyone" ON public.notes;
DROP POLICY IF EXISTS "Notes are deletable by everyone" ON public.notes;

-- AI analyses policies
DROP POLICY IF EXISTS "AI analyses are viewable by everyone" ON public.ai_analyses;
DROP POLICY IF EXISTS "AI analyses are insertable by everyone" ON public.ai_analyses;
DROP POLICY IF EXISTS "AI analyses are updatable by everyone" ON public.ai_analyses;
DROP POLICY IF EXISTS "AI analyses are deletable by everyone" ON public.ai_analyses;

-- Participants policies
DROP POLICY IF EXISTS "Participants are viewable by everyone" ON public.participants;
DROP POLICY IF EXISTS "Participants are insertable by everyone" ON public.participants;
DROP POLICY IF EXISTS "Participants are updatable by everyone" ON public.participants;
DROP POLICY IF EXISTS "Participants are deletable by everyone" ON public.participants;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Facilitator tables policies (will be dropped)
DROP POLICY IF EXISTS "Facilitators are viewable by everyone" ON public.facilitators;
DROP POLICY IF EXISTS "Facilitators are insertable by everyone" ON public.facilitators;
DROP POLICY IF EXISTS "Facilitators are updatable by everyone" ON public.facilitators;
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.facilitator_sessions;
DROP POLICY IF EXISTS "Sessions are insertable by everyone" ON public.facilitator_sessions;
DROP POLICY IF EXISTS "Sessions are updatable by everyone" ON public.facilitator_sessions;
DROP POLICY IF EXISTS "Sessions are deletable by everyone" ON public.facilitator_sessions;

-- Drop additional facilitator policies that exist
DROP POLICY IF EXISTS "Facilitators are deletable by everyone" ON public.facilitators;
DROP POLICY IF EXISTS "Anyone can delete sessions" ON public.facilitator_sessions;
DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.facilitator_sessions;
DROP POLICY IF EXISTS "Anyone can select sessions" ON public.facilitator_sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.facilitator_sessions;

-- Step 2: Drop old facilitator authentication tables
-- ============================================================================
DROP TABLE IF EXISTS public.facilitator_sessions CASCADE;
DROP TABLE IF EXISTS public.facilitators CASCADE;

-- Step 3: Create secure RLS policies using Clerk auth.uid()
-- ============================================================================

-- WORKSHOPS: Only owner can manage their workshops
-- ============================================================================
CREATE POLICY "Users can view their own workshops"
  ON public.workshops
  FOR SELECT
  USING (auth.uid()::text = facilitator_id);

CREATE POLICY "Users can create workshops"
  ON public.workshops
  FOR INSERT
  WITH CHECK (auth.uid()::text = facilitator_id);

CREATE POLICY "Users can update their own workshops"
  ON public.workshops
  FOR UPDATE
  USING (auth.uid()::text = facilitator_id)
  WITH CHECK (auth.uid()::text = facilitator_id);

CREATE POLICY "Users can delete their own workshops"
  ON public.workshops
  FOR DELETE
  USING (auth.uid()::text = facilitator_id);

-- BOARDS: Only workshop owner can manage boards
-- ============================================================================
CREATE POLICY "Users can view boards from their workshops"
  ON public.boards
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT id FROM public.workshops
      WHERE facilitator_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can create boards in their workshops"
  ON public.boards
  FOR INSERT
  WITH CHECK (
    workshop_id IN (
      SELECT id FROM public.workshops
      WHERE facilitator_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update boards in their workshops"
  ON public.boards
  FOR UPDATE
  USING (
    workshop_id IN (
      SELECT id FROM public.workshops
      WHERE facilitator_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete boards from their workshops"
  ON public.boards
  FOR DELETE
  USING (
    workshop_id IN (
      SELECT id FROM public.workshops
      WHERE facilitator_id = auth.uid()::text
    )
  );

-- QUESTIONS: Only workshop owner can manage questions
-- ============================================================================
CREATE POLICY "Users can view questions from their workshops"
  ON public.questions
  FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can create questions in their workshops"
  ON public.questions
  FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can update questions in their workshops"
  ON public.questions
  FOR UPDATE
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete questions from their workshops"
  ON public.questions
  FOR DELETE
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

-- NOTES: Workshop owner can view all notes, participants can create/edit own
-- ============================================================================
CREATE POLICY "Workshop owners can view all notes"
  ON public.notes
  FOR SELECT
  USING (
    question_id IN (
      SELECT q.id FROM public.questions q
      INNER JOIN public.boards b ON q.board_id = b.id
      INNER JOIN public.workshops w ON b.workshop_id = w.id
      WHERE w.facilitator_id = auth.uid()::text
    )
  );

CREATE POLICY "Anyone can create notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notes"
  ON public.notes
  FOR UPDATE
  USING (author_id = auth.uid()::text);

CREATE POLICY "Workshop owners can delete notes"
  ON public.notes
  FOR DELETE
  USING (
    question_id IN (
      SELECT q.id FROM public.questions q
      INNER JOIN public.boards b ON q.board_id = b.id
      INNER JOIN public.workshops w ON b.workshop_id = w.id
      WHERE w.facilitator_id = auth.uid()::text
    )
  );

-- AI ANALYSES: Only workshop owner can view/create
-- ============================================================================
CREATE POLICY "Users can view AI analyses from their workshops"
  ON public.ai_analyses
  FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can create AI analyses for their workshops"
  ON public.ai_analyses
  FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can delete AI analyses from their workshops"
  ON public.ai_analyses
  FOR DELETE
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workshop_id IN (
        SELECT id FROM public.workshops
        WHERE facilitator_id = auth.uid()::text
      )
    )
  );

-- PARTICIPANTS: Workshop owner can manage, anyone can join
-- ============================================================================
CREATE POLICY "Workshop owners can view participants"
  ON public.participants
  FOR SELECT
  USING (
    workshop_id IN (
      SELECT id FROM public.workshops
      WHERE facilitator_id = auth.uid()::text
    )
  );

CREATE POLICY "Anyone can join as participant"
  ON public.participants
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Workshop owners can delete participants"
  ON public.participants
  FOR DELETE
  USING (
    workshop_id IN (
      SELECT id FROM public.workshops
      WHERE facilitator_id = auth.uid()::text
    )
  );

-- PROFILES: Users can only view/update their own profile
-- ============================================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- Step 4: Create helper function for participant limit check
-- ============================================================================
CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER AS $$
DECLARE
  workshop_owner_id TEXT;
  owner_plan TEXT;
  current_participant_count INT;
BEGIN
  -- Get workshop owner and their plan
  SELECT w.facilitator_id, p.plan INTO workshop_owner_id, owner_plan
  FROM workshops w
  LEFT JOIN profiles p ON p.id = w.facilitator_id
  WHERE w.id = NEW.workshop_id;

  -- If owner has free plan, check participant limit (max 5)
  IF owner_plan = 'free' THEN
    SELECT COUNT(*) INTO current_participant_count
    FROM participants
    WHERE workshop_id = NEW.workshop_id;

    IF current_participant_count >= 5 THEN
      RAISE EXCEPTION 'Workshop has reached maximum participant limit (5) for free plan';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for participant limit
DROP TRIGGER IF EXISTS enforce_participant_limit ON participants;
CREATE TRIGGER enforce_participant_limit
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION check_participant_limit();

-- Step 5: Add comment for documentation
-- ============================================================================
COMMENT ON POLICY "Users can view their own workshops" ON public.workshops IS
  'Ensures tenant isolation - users can only see workshops they own';

COMMENT ON FUNCTION check_participant_limit() IS
  'Enforces participant limit: Free plan = 5 participants, Pro/Curago = unlimited';