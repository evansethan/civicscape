import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["teacher", "student"] }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(),
  difficulty: text("difficulty", { enum: ["Beginner", "Intermediate", "Advanced"] }).notNull(),
  objectives: jsonb("objectives").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["text", "gis", "mixed"] }).notNull(),
  moduleId: integer("module_id").notNull().references(() => modules.id),
  points: integer("points").notNull(),
  dueDate: timestamp("due_date"),
  isActive: boolean("is_active").default(true).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => modules.id),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  writtenResponse: text("written_response"),
  mapData: jsonb("map_data"),
  attachments: jsonb("attachments"),
  status: text("status", { enum: ["draft", "submitted", "graded"] }).default("draft").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  feedback: text("feedback"),
  rubric: jsonb("rubric").$type<Record<string, number>>(),
  gradedAt: timestamp("graded_at").defaultNow().notNull(),
  gradedBy: integer("graded_by").notNull().references(() => users.id),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["new_assignment", "submission_received", "assignment_graded"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  assignmentId: integer("assignment_id").references(() => assignments.id),
  submissionId: integer("submission_id").references(() => submissions.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdModules: many(modules),
  enrollments: many(enrollments),
  submissions: many(submissions),
  grades: many(grades),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  teacher: one(users, {
    fields: [modules.teacherId],
    references: [users.id],
  }),
  assignments: many(assignments),
  enrollments: many(enrollments),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  module: one(modules, {
    fields: [assignments.moduleId],
    references: [modules.id],
  }),
  submissions: many(submissions),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  module: one(modules, {
    fields: [enrollments.moduleId],
    references: [modules.id],
  }),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  grade: one(grades, {
    fields: [submissions.id],
    references: [grades.submissionId],
  }),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, {
    fields: [grades.submissionId],
    references: [submissions.id],
  }),
  teacher: one(users, {
    fields: [grades.gradedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  assignment: one(assignments, {
    fields: [notifications.assignmentId],
    references: [assignments.id],
  }),
  submission: one(submissions, {
    fields: [notifications.submissionId],
    references: [submissions.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments, {
  dueDate: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const updateAssignmentSchema = insertAssignmentSchema.partial().omit({
  moduleId: true,
});

export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;

export const insertSubmissionSchema = createInsertSchema(submissions, {
  submittedAt: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
}).refine((data) => {
  // For submitted assignments, require at least one form of content
  if (data.status === 'submitted') {
    const hasWrittenResponse = data.writtenResponse && data.writtenResponse.trim().length > 0;
    const hasAttachments = data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0;
    return hasWrittenResponse || hasAttachments;
  }
  return true;
}, {
  message: "Submitted assignments must include a written response or file attachments.",
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  gradedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
