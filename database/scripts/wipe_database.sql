-- Safe Database Wipe Script for CivicScape
-- This script removes all data and tables from the database
-- Run with: psql "$DATABASE_URL" -f scripts/wipe_database.sql

BEGIN;

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS ai_chat_messages CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS class_teachers CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS library_files CASCADE;
DROP TABLE IF EXISTS class_comments CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS sample_assignments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

COMMIT;

-- Confirmation message
SELECT 'Database wiped successfully. Run migrations to recreate tables.' AS status;
