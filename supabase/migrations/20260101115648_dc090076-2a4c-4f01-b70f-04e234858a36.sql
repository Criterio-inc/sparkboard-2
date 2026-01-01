-- FIX #1: Säkra profiles-tabellen - endast egen profil läsbar

-- Ta bort den osäkra policyn som tillåter alla att läsa alla profiler
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_owner_select" ON profiles;

-- Skapa säker policy - användare kan endast läsa sin egen profil
-- Notera: profiles.id är Clerk user ID (text), matchar JWT sub claim
CREATE POLICY "profiles_owner_select" ON profiles
  FOR SELECT USING (
    id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Skapa en publik vy för visningsnamn (för participant lists etc)
CREATE OR REPLACE VIEW public.profile_display AS
  SELECT id, first_name, image_url, created_at FROM profiles;

-- Ge tillgång till vyn
GRANT SELECT ON public.profile_display TO anon, authenticated;