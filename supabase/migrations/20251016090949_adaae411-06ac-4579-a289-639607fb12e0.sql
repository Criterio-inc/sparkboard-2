-- Add status column to workshops table to support draft functionality
ALTER TABLE workshops ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active'));