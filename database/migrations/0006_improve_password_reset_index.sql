-- Improve password_reset_tokens index to include 'used' column
-- This optimizes queries that filter by both user_id and used status

DROP INDEX IF EXISTS "idx_password_reset_tokens_user_id";
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id", "used");

