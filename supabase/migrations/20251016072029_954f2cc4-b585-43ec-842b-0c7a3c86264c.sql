-- Add timer state columns to workshops table
ALTER TABLE public.workshops 
ADD COLUMN timer_running BOOLEAN DEFAULT false,
ADD COLUMN timer_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN time_remaining INTEGER;