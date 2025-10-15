-- Aktivera Supabase Realtime för alla relevanta tabeller
-- Detta gör att alla ändringar i tabellerna broadcastas i realtid till alla anslutna klienter

-- Aktivera realtime för participants-tabellen
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;

-- Aktivera realtime för notes-tabellen
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;

-- Aktivera realtime för workshops-tabellen
ALTER PUBLICATION supabase_realtime ADD TABLE public.workshops;

-- Aktivera realtime för boards-tabellen (kan behövas för framtida funktionalitet)
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;

-- Aktivera realtime för questions-tabellen (kan behövas för framtida funktionalitet)
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;