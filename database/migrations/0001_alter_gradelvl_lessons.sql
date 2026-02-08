-- Updates "duration" to "weeks" and "lessons per week"
-- Updates "difficulty" to "grade_level"

ALTER TABLE classes
  ADD COLUMN weeks integer,
  ADD COLUMN lessons integer NOT NULL DEFAULT 1,
  ADD COLUMN grade_level text NOT NULL DEFAULT '';

UPDATE classes
SET weeks = duration;

ALTER TABLE classes
  ALTER COLUMN weeks SET NOT NULL,
  DROP COLUMN duration,
  DROP COLUMN difficulty;

ALTER TABLE assignments
  ADD COLUMN grade_level text NOT NULL DEFAULT '',
  DROP COLUMN difficulty;

ALTER TABLE sample_assignments
  ADD COLUMN grade_level text NOT NULL DEFAULT '',
  DROP COLUMN difficulty;
