DROP TABLE "class_teachers";

CREATE TABLE IF NOT EXISTS "class_teachers" (
    "id" serial PRIMARY KEY NOT NULL,
    "teacher_id" integer NOT NULL,
    "class_id" integer NOT NULL,
    "enrolled_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "class_teachers" ADD CONSTRAINT "class_teachers_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
