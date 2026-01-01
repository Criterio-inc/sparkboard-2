-- Fixa security definer view - sätt explicit security invoker
ALTER VIEW public.profile_display SET (security_invoker = true);