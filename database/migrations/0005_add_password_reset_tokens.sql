-- Adds password_reset_tokens table for forgot password functionality

CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL UNIQUE,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add index on token for faster lookups
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" ("token");

-- Add index on user_id for finding user's tokens
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");

