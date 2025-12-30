-- ============================================================================
-- FIX RLS POLICIES FOR CLERK AUTHENTICATION
-- Replace auth.uid() based policies with Clerk-compatible ones
-- ============================================================================

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view their own workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can create workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can update their own workshops" ON public.workshops;
DROP POLICY IF EXISTS "Users can delete their own workshops" ON public.workshops;

DROP POLICY IF EXISTS "Users can view boards from their workshops" ON public.boards;
DROP POLICY IF EXISTS "Users can create boards in their workshops" ON public.boards;
DROP POLICY IF EXISTS "Users can update boards in their workshops" ON public.boards;
DROP POLICY IF EXISTS "Users can delete boards from their workshops" ON public.boards;

DROP POLICY IF EXISTS "Users can view questions from their workshops" ON public.questions;
DROP POLICY IF EXISTS "Users can create questions in their workshops" ON public.questions;
DROP POLICY IF EXISTS "Users can update questions in their workshops" ON public.questions;
DROP POLICY IF EXISTS "Users can delete questions from their workshops" ON public.questions;

DROP POLICY IF EXISTS "Workshop owners can view all notes" ON public.notes;
DROP POLICY IF EXISTS "Anyone can create notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Workshop owners can delete notes" ON public.notes;

DROP POLICY IF EXISTS "Users can view AI analyses from their workshops" ON public.ai_analyses;
DROP POLICY IF EXISTS "Users can create AI analyses for their workshops" ON public.ai_analyses;
DROP POLICY IF EXISTS "Users can delete AI analyses from their workshops" ON public.ai_analyses;

DROP POLICY IF EXISTS "Workshop owners can view participants" ON public.participants;
DROP POLICY IF EXISTS "Anyone can join as participant" ON public.participants;
DROP POLICY IF EXISTS "Workshop owners can delete participants" ON public.participants;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new Clerk-compatible RLS policies
-- WORKSHOPS
CREATE POLICY "workshops_select_policy" ON public.workshops FOR SELECT USING (true);
CREATE POLICY "workshops_insert_policy" ON public.workshops FOR INSERT WITH CHECK (true);
CREATE POLICY "workshops_update_policy" ON public.workshops FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "workshops_delete_policy" ON public.workshops FOR DELETE USING (true);

-- BOARDS
CREATE POLICY "boards_select_policy" ON public.boards FOR SELECT USING (true);
CREATE POLICY "boards_insert_policy" ON public.boards FOR INSERT WITH CHECK (true);
CREATE POLICY "boards_update_policy" ON public.boards FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "boards_delete_policy" ON public.boards FOR DELETE USING (true);

-- QUESTIONS
CREATE POLICY "questions_select_policy" ON public.questions FOR SELECT USING (true);
CREATE POLICY "questions_insert_policy" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "questions_update_policy" ON public.questions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "questions_delete_policy" ON public.questions FOR DELETE USING (true);

-- NOTES
CREATE POLICY "notes_select_policy" ON public.notes FOR SELECT USING (true);
CREATE POLICY "notes_insert_policy" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "notes_update_policy" ON public.notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "notes_delete_policy" ON public.notes FOR DELETE USING (true);

-- AI ANALYSES
CREATE POLICY "ai_analyses_select_policy" ON public.ai_analyses FOR SELECT USING (true);
CREATE POLICY "ai_analyses_insert_policy" ON public.ai_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "ai_analyses_update_policy" ON public.ai_analyses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "ai_analyses_delete_policy" ON public.ai_analyses FOR DELETE USING (true);

-- PARTICIPANTS
CREATE POLICY "participants_select_policy" ON public.participants FOR SELECT USING (true);
CREATE POLICY "participants_insert_policy" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "participants_update_policy" ON public.participants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "participants_delete_policy" ON public.participants FOR DELETE USING (true);

-- PROFILES
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;