-- Adds multi-conversation support for AI Copilot
-- Creates ai_conversations table and updates ai_chat_messages to reference conversations

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS "ai_conversations" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
    "title" varchar(255) NOT NULL DEFAULT 'New Conversation',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Migrate ai_chat_messages to use conversation_id instead of user_id
-- First, truncate existing messages (since structure is changing)
TRUNCATE TABLE "ai_chat_messages" CASCADE;

-- Remove the old user_id constraint if it exists
ALTER TABLE "ai_chat_messages" DROP CONSTRAINT IF EXISTS "ai_chat_messages_user_id_unique";

-- Drop user_id column if it exists
ALTER TABLE "ai_chat_messages" DROP COLUMN IF EXISTS "user_id";

-- Add conversation_id column
ALTER TABLE "ai_chat_messages" ADD COLUMN IF NOT EXISTS "conversation_id" integer NOT NULL REFERENCES "ai_conversations"("id") ON DELETE CASCADE;

-- Create index for faster conversation lookups
CREATE INDEX IF NOT EXISTS "ai_conversations_user_id_idx" ON "ai_conversations"("user_id");
CREATE INDEX IF NOT EXISTS "ai_chat_messages_conversation_id_idx" ON "ai_chat_messages"("conversation_id");
