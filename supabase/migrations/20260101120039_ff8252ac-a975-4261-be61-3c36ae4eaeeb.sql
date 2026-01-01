-- FIX #3: Stäng ner client-side writes för notes och participants

-- Ta bort gamla policies
DROP POLICY IF EXISTS "notes_participant_insert" ON notes;
DROP POLICY IF EXISTS "notes_insert_policy" ON notes;
DROP POLICY IF EXISTS "notes_no_client_insert" ON notes;

DROP POLICY IF EXISTS "participants_join_insert" ON participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON participants;
DROP POLICY IF EXISTS "participants_no_client_insert" ON participants;

-- Blockera alla direkta client writes - endast via edge functions (service role)
CREATE POLICY "notes_service_only_insert" ON notes
  FOR INSERT WITH CHECK (false);

CREATE POLICY "participants_service_only_insert" ON participants
  FOR INSERT WITH CHECK (false);