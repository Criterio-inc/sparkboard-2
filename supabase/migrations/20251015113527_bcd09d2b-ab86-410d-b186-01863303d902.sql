-- Lägg till active_board_id kolumn för att spåra vilket board som är aktivt
ALTER TABLE workshops 
ADD COLUMN active_board_id uuid REFERENCES boards(id);

-- Sätt default till första board för befintliga workshops
UPDATE workshops w
SET active_board_id = (
  SELECT id FROM boards 
  WHERE workshop_id = w.id 
  ORDER BY order_index ASC 
  LIMIT 1
)
WHERE active_board_id IS NULL;