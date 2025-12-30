-- Fix security warning: Set search_path for check_participant_limit function
CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER AS $$
DECLARE
  workshop_owner_id TEXT;
  owner_plan TEXT;
  current_participant_count INT;
BEGIN
  -- Get workshop owner and their plan
  SELECT w.facilitator_id, p.plan INTO workshop_owner_id, owner_plan
  FROM public.workshops w
  LEFT JOIN public.profiles p ON p.id = w.facilitator_id
  WHERE w.id = NEW.workshop_id;

  -- If owner has free plan, check participant limit (max 5)
  IF owner_plan = 'free' OR owner_plan IS NULL THEN
    SELECT COUNT(*) INTO current_participant_count
    FROM public.participants
    WHERE workshop_id = NEW.workshop_id;

    IF current_participant_count >= 5 THEN
      RAISE EXCEPTION 'Workshop has reached maximum participant limit (5) for free plan';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;