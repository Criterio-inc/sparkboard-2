-- Lägg till facilitator_id till workshops-tabellen
ALTER TABLE public.workshops 
ADD COLUMN facilitator_id TEXT;

-- Uppdatera befintliga workshops att tillhöra första facilitator (temporär lösning)
-- Detta kommer att uppdateras när facilitators skapar/uppdaterar workshops i frontend
UPDATE public.workshops 
SET facilitator_id = 'temp-facilitator-id' 
WHERE facilitator_id IS NULL;

-- Gör facilitator_id obligatorisk
ALTER TABLE public.workshops 
ALTER COLUMN facilitator_id SET NOT NULL;

-- Skapa index för snabbare filtrering
CREATE INDEX idx_workshops_facilitator_id ON public.workshops(facilitator_id);

-- Uppdatera RLS policies för workshops-tabellen
-- Radera gamla policies
DROP POLICY IF EXISTS "Workshops are viewable by everyone" ON public.workshops;
DROP POLICY IF EXISTS "Workshops are insertable by everyone" ON public.workshops;
DROP POLICY IF EXISTS "Workshops are updatable by everyone" ON public.workshops;
DROP POLICY IF EXISTS "Workshops are deletable by everyone" ON public.workshops;

-- Skapa nya policies som filtrerar på facilitator_id
-- OBS: Eftersom facilitator-autentisering görs i localStorage (ej Supabase Auth),
-- behåller vi öppna policies men filtrering görs i frontend
CREATE POLICY "Workshops are viewable by everyone" 
ON public.workshops 
FOR SELECT 
USING (true);

CREATE POLICY "Workshops are insertable by everyone" 
ON public.workshops 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Workshops are updatable by everyone" 
ON public.workshops 
FOR UPDATE 
USING (true);

CREATE POLICY "Workshops are deletable by everyone" 
ON public.workshops 
FOR DELETE 
USING (true);