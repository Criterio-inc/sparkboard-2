-- Säkra profile_display vyn - endast autentiserade användare
DROP VIEW IF EXISTS public.profile_display;

-- Återskapa med minimal exponering
CREATE VIEW public.profile_display AS
  SELECT id, first_name, image_url FROM profiles;

-- Sätt security invoker och begränsa tillgång
ALTER VIEW public.profile_display SET (security_invoker = true);

-- Återkalla publik åtkomst, endast autentiserade
REVOKE ALL ON public.profile_display FROM anon;
GRANT SELECT ON public.profile_display TO authenticated;