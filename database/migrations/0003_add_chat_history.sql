-- Adds chat_history column to users table

ALTER TABLE users
DROP COLUMN chat_history; -- can be ignored if not in schema

CREATE TABLE "ai_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
    "messages" jsonb NOT NULL, -- check syntax
	"created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);
