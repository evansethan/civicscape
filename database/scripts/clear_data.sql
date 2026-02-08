-- Clear All Data Script for CivicScape
-- This script removes all data but keeps the table structure intact
-- Run with: psql "$DATABASE_URL" -f scripts/clear_data.sql

BEGIN;

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Truncate all tables (removes data, resets sequences)
TRUNCATE TABLE ai_chat_messages RESTART IDENTITY;
TRUNCATE TABLE password_reset_tokens RESTART IDENTITY;
TRUNCATE TABLE class_teachers RESTART IDENTITY;
TRUNCATE TABLE grades RESTART IDENTITY;
TRUNCATE TABLE comments RESTART IDENTITY;
TRUNCATE TABLE submissions RESTART IDENTITY;
TRUNCATE TABLE notifications RESTART IDENTITY;
TRUNCATE TABLE messages RESTART IDENTITY;
TRUNCATE TABLE library_files RESTART IDENTITY;
TRUNCATE TABLE class_comments RESTART IDENTITY;
TRUNCATE TABLE assignments RESTART IDENTITY;
TRUNCATE TABLE enrollments RESTART IDENTITY;
TRUNCATE TABLE units RESTART IDENTITY;
TRUNCATE TABLE sample_assignments RESTART IDENTITY;
TRUNCATE TABLE classes RESTART IDENTITY;
TRUNCATE TABLE users RESTART IDENTITY;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

COMMIT;

SELECT 'All data cleared. Table structures preserved. ID sequences reset.' AS status;
