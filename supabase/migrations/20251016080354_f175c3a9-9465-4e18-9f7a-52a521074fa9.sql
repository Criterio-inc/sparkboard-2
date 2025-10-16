-- Create facilitators table
CREATE TABLE public.facilitators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  security_question TEXT,
  security_answer_hash TEXT
);

-- Create unique index on lowercase name to prevent duplicates
CREATE UNIQUE INDEX idx_facilitators_name_lower ON public.facilitators (LOWER(name));

-- Enable RLS
ALTER TABLE public.facilitators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (open for now, can be tightened later)
CREATE POLICY "Facilitators are viewable by everyone"
  ON public.facilitators
  FOR SELECT
  USING (true);

CREATE POLICY "Facilitators are insertable by everyone"
  ON public.facilitators
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Facilitators are updatable by everyone"
  ON public.facilitators
  FOR UPDATE
  USING (true);

CREATE POLICY "Facilitators are deletable by everyone"
  ON public.facilitators
  FOR DELETE
  USING (true);