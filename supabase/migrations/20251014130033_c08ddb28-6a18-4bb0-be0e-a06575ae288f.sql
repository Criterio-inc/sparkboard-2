-- Create workshops table
CREATE TABLE public.workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create boards table
CREATE TABLE public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  time_limit INTEGER NOT NULL,
  color_index INTEGER NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_id TEXT NOT NULL,
  color_index INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create ai_analyses table
CREATE TABLE public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  analysis TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create participants table
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  color_index INTEGER NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (workshop collaboration)
CREATE POLICY "Workshops are viewable by everyone" ON public.workshops FOR SELECT USING (true);
CREATE POLICY "Workshops are insertable by everyone" ON public.workshops FOR INSERT WITH CHECK (true);
CREATE POLICY "Workshops are updatable by everyone" ON public.workshops FOR UPDATE USING (true);
CREATE POLICY "Workshops are deletable by everyone" ON public.workshops FOR DELETE USING (true);

CREATE POLICY "Boards are viewable by everyone" ON public.boards FOR SELECT USING (true);
CREATE POLICY "Boards are insertable by everyone" ON public.boards FOR INSERT WITH CHECK (true);
CREATE POLICY "Boards are updatable by everyone" ON public.boards FOR UPDATE USING (true);
CREATE POLICY "Boards are deletable by everyone" ON public.boards FOR DELETE USING (true);

CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Questions are insertable by everyone" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Questions are updatable by everyone" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Questions are deletable by everyone" ON public.questions FOR DELETE USING (true);

CREATE POLICY "Notes are viewable by everyone" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Notes are insertable by everyone" ON public.notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Notes are updatable by everyone" ON public.notes FOR UPDATE USING (true);
CREATE POLICY "Notes are deletable by everyone" ON public.notes FOR DELETE USING (true);

CREATE POLICY "AI analyses are viewable by everyone" ON public.ai_analyses FOR SELECT USING (true);
CREATE POLICY "AI analyses are insertable by everyone" ON public.ai_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "AI analyses are updatable by everyone" ON public.ai_analyses FOR UPDATE USING (true);
CREATE POLICY "AI analyses are deletable by everyone" ON public.ai_analyses FOR DELETE USING (true);

CREATE POLICY "Participants are viewable by everyone" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Participants are insertable by everyone" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Participants are updatable by everyone" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "Participants are deletable by everyone" ON public.participants FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_boards_workshop_id ON public.boards(workshop_id);
CREATE INDEX idx_questions_board_id ON public.questions(board_id);
CREATE INDEX idx_notes_question_id ON public.notes(question_id);
CREATE INDEX idx_ai_analyses_board_id ON public.ai_analyses(board_id);
CREATE INDEX idx_participants_workshop_id ON public.participants(workshop_id);
CREATE INDEX idx_workshops_code ON public.workshops(code);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workshops table
CREATE TRIGGER update_workshops_updated_at
  BEFORE UPDATE ON public.workshops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();