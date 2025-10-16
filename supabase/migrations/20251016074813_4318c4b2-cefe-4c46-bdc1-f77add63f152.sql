-- Clean up OSEFFY workshop and related data (fix foreign key constraint)
-- First, update workshops to remove reference to active_board_id
UPDATE public.workshops SET active_board_id = NULL WHERE id = '7e64439a-6b77-48ff-9424-a54891542810';

-- Then delete in correct order
DELETE FROM public.notes WHERE question_id IN (SELECT id FROM public.questions WHERE board_id IN (SELECT id FROM public.boards WHERE workshop_id = '7e64439a-6b77-48ff-9424-a54891542810'));
DELETE FROM public.questions WHERE board_id IN (SELECT id FROM public.boards WHERE workshop_id = '7e64439a-6b77-48ff-9424-a54891542810');
DELETE FROM public.boards WHERE workshop_id = '7e64439a-6b77-48ff-9424-a54891542810';
DELETE FROM public.participants WHERE workshop_id = '7e64439a-6b77-48ff-9424-a54891542810';
DELETE FROM public.workshops WHERE id = '7e64439a-6b77-48ff-9424-a54891542810';

-- Create facilitator_sessions table for cross-browser/device session management
CREATE TABLE public.facilitator_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id text NOT NULL,
  session_token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  last_active_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.facilitator_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies (open for now since we're using localStorage-based facilitator system)
CREATE POLICY "Anyone can insert sessions"
  ON public.facilitator_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can select sessions"
  ON public.facilitator_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update sessions"
  ON public.facilitator_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete sessions"
  ON public.facilitator_sessions
  FOR DELETE
  USING (true);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.facilitator_sessions
  WHERE expires_at < now();
END;
$$;