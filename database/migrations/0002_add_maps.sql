-- Adds maps column to assignments table

ALTER TABLE assignments
  ADD COLUMN maps jsonb;
