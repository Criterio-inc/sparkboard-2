-- SÄKERHETSFIX: Begränsa läsåtkomst till endast autentiserade användare med relation till workshopen

-- 1. WORKSHOPS - endast facilitator kan läsa sin egen workshop, eller deltagare
DROP POLICY IF EXISTS "workshops_public_read" ON workshops;
CREATE POLICY "workshops_authenticated_read" ON workshops
  FOR SELECT USING (
    -- Facilitator kan läsa sin egen workshop
    facilitator_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- 2. BOARDS - endast om man har tillgång till workshopen (via service role för deltagare)
DROP POLICY IF EXISTS "boards_public_read" ON boards;
CREATE POLICY "boards_workshop_access" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workshops w 
      WHERE w.id = boards.workshop_id 
      AND w.facilitator_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- 3. QUESTIONS - endast om man har tillgång till boarden
DROP POLICY IF EXISTS "questions_public_read" ON questions;
CREATE POLICY "questions_board_access" ON questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN workshops w ON w.id = b.workshop_id
      WHERE b.id = questions.board_id 
      AND w.facilitator_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- 4. NOTES - endast om man har tillgång till frågan
DROP POLICY IF EXISTS "notes_public_read" ON notes;
CREATE POLICY "notes_question_access" ON notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM questions q
      JOIN boards b ON b.id = q.board_id
      JOIN workshops w ON w.id = b.workshop_id
      WHERE q.id = notes.question_id 
      AND w.facilitator_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- 5. PARTICIPANTS - endast facilitator kan se deltagare i sin workshop
DROP POLICY IF EXISTS "participants_public_read" ON participants;
CREATE POLICY "participants_facilitator_read" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workshops w 
      WHERE w.id = participants.workshop_id 
      AND w.facilitator_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- 6. AI_ANALYSES - endast facilitator kan se analyser för sin workshop
DROP POLICY IF EXISTS "ai_analyses_public_read" ON ai_analyses;
CREATE POLICY "ai_analyses_facilitator_read" ON ai_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN workshops w ON w.id = b.workshop_id
      WHERE b.id = ai_analyses.board_id 
      AND w.facilitator_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );