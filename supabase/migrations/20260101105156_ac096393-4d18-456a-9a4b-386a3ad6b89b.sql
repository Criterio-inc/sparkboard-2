-- ============================================
-- SECURITY FIX: Replace open RLS policies
-- ============================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "workshops_select_policy" ON workshops;
DROP POLICY IF EXISTS "workshops_insert_policy" ON workshops;
DROP POLICY IF EXISTS "workshops_update_policy" ON workshops;
DROP POLICY IF EXISTS "workshops_delete_policy" ON workshops;

DROP POLICY IF EXISTS "boards_select_policy" ON boards;
DROP POLICY IF EXISTS "boards_insert_policy" ON boards;
DROP POLICY IF EXISTS "boards_update_policy" ON boards;
DROP POLICY IF EXISTS "boards_delete_policy" ON boards;

DROP POLICY IF EXISTS "questions_select_policy" ON questions;
DROP POLICY IF EXISTS "questions_insert_policy" ON questions;
DROP POLICY IF EXISTS "questions_update_policy" ON questions;
DROP POLICY IF EXISTS "questions_delete_policy" ON questions;

DROP POLICY IF EXISTS "notes_select_policy" ON notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON notes;
DROP POLICY IF EXISTS "notes_update_policy" ON notes;
DROP POLICY IF EXISTS "notes_delete_policy" ON notes;

DROP POLICY IF EXISTS "participants_select_policy" ON participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON participants;
DROP POLICY IF EXISTS "participants_update_policy" ON participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON participants;

DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

DROP POLICY IF EXISTS "ai_analyses_select_policy" ON ai_analyses;
DROP POLICY IF EXISTS "ai_analyses_insert_policy" ON ai_analyses;
DROP POLICY IF EXISTS "ai_analyses_update_policy" ON ai_analyses;
DROP POLICY IF EXISTS "ai_analyses_delete_policy" ON ai_analyses;

-- ============================================
-- WORKSHOPS: Public read for joining by code, service role for writes
-- ============================================

-- Anyone can read workshops (needed for joining by code)
CREATE POLICY "workshops_public_read" ON workshops
  FOR SELECT
  USING (true);

-- Only service role can insert/update/delete (via edge functions)
-- Regular clients cannot write directly
CREATE POLICY "workshops_service_insert" ON workshops
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "workshops_service_update" ON workshops
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "workshops_service_delete" ON workshops
  FOR DELETE
  USING (false);

-- ============================================
-- BOARDS: Read all, write via service role only
-- ============================================

CREATE POLICY "boards_public_read" ON boards
  FOR SELECT
  USING (true);

CREATE POLICY "boards_service_insert" ON boards
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "boards_service_update" ON boards
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "boards_service_delete" ON boards
  FOR DELETE
  USING (false);

-- ============================================
-- QUESTIONS: Read all, write via service role only
-- ============================================

CREATE POLICY "questions_public_read" ON questions
  FOR SELECT
  USING (true);

CREATE POLICY "questions_service_insert" ON questions
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "questions_service_update" ON questions
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "questions_service_delete" ON questions
  FOR DELETE
  USING (false);

-- ============================================
-- NOTES: Read all, participants can insert, no update/delete from client
-- ============================================

CREATE POLICY "notes_public_read" ON notes
  FOR SELECT
  USING (true);

-- Allow anonymous inserts for participants (they don't have auth)
CREATE POLICY "notes_participant_insert" ON notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "notes_service_update" ON notes
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "notes_service_delete" ON notes
  FOR DELETE
  USING (false);

-- ============================================
-- PARTICIPANTS: Read all, insert allowed (joining), no update/delete
-- ============================================

CREATE POLICY "participants_public_read" ON participants
  FOR SELECT
  USING (true);

-- Allow participants to join workshops
CREATE POLICY "participants_join_insert" ON participants
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "participants_service_update" ON participants
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "participants_service_delete" ON participants
  FOR DELETE
  USING (false);

-- ============================================
-- PROFILES: CRITICAL - Prevent privilege escalation
-- ============================================

-- Users can read all profiles (for display names)
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT
  USING (true);

-- Insert only via service role (clerk-webhook)
CREATE POLICY "profiles_service_insert" ON profiles
  FOR INSERT
  WITH CHECK (false);

-- CRITICAL: Users cannot modify their own plan/subscription fields
-- Only service role (via edge functions) can update these
CREATE POLICY "profiles_service_update" ON profiles
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "profiles_service_delete" ON profiles
  FOR DELETE
  USING (false);

-- ============================================
-- AI_ANALYSES: Read all, write via service role only
-- ============================================

CREATE POLICY "ai_analyses_public_read" ON ai_analyses
  FOR SELECT
  USING (true);

CREATE POLICY "ai_analyses_service_insert" ON ai_analyses
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "ai_analyses_service_update" ON ai_analyses
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "ai_analyses_service_delete" ON ai_analyses
  FOR DELETE
  USING (false);