import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(), // Made optional for students
  role: text("role", { enum: ["admin", "teacher", "student"] }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  weeks: integer("weeks").notNull(),
  lessons: integer("lessons").notNull(),
  grade_level: text("grade_level", { enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] }).notNull(),
  objectives: jsonb("objectives").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  enrollmentCode: text("enrollment_code").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  classId: integer("class_id").notNull().references(() => classes.id),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["text", "gis", "mixed"] }).notNull(),
  classId: integer("class_id").notNull().references(() => classes.id),
  unitId: integer("unit_id").references(() => units.id),
  dueDate: timestamp("due_date"),
  attachments: text("attachments").array(),
  instructions: text("instructions"),
  reflectionQuestions: jsonb("reflection_questions").$type<string[]>(),
  resources: jsonb("resources").$type<string[]>(),
  rubricCriteria: jsonb("rubric_criteria").$type<string[]>(),
  estimatedDuration: text("estimated_duration"),
  isActive: boolean("is_active").default(true).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  isGraded: boolean("is_graded").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  selectedMaps: jsonb("maps"),
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  classId: integer("class_id").notNull().references(() => classes.id),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const classTeachers = pgTable("class_teachers", {
    id: serial("id").primaryKey(),
    teacherId: integer("teacher_id").notNull().references(() => users.id),
    classId: integer("class_id").notNull().references(() => classes.id),
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
  type: text("type", { enum: ["new_assignment", "submission_received", "assignment_graded", "comment_received"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  assignmentId: integer("assignment_id").references(() => assignments.id),
  submissionId: integer("submission_id").references(() => submissions.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classComments = pgTable("class_comments", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  tag: text("tag", { enum: ["question", "discussion"] }).notNull().default("discussion"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sample assignments for the library
export const sampleAssignments = pgTable("sample_assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["text", "gis", "mixed"] }).notNull(),
  instructions: text("instructions").notNull(),
  reflectionQuestions: jsonb("reflection_questions").$type<string[]>(),
  resources: jsonb("resources").$type<{name: string, url: string, description?: string}[]>(),
  estimatedDuration: text("estimated_duration"),
  grade_level: text("grade_level", { enum: ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] }).notNull(),
  category: text("category").notNull(), // e.g., "Climate", "Justice", "Urban Planning"
  tags: text("tags").array(),
  rubricCriteria: jsonb("rubric_criteria").$type<string[]>(),
  attachmentPath: text("attachment_path"), // Path to the original PDF or other file
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const libraryFiles = pgTable("library_files", {
  id: serial("id").primaryKey(),
  originalName: text("original_name").notNull(),
  filename: text("filename").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  category: text("category").default("general").notNull(),
  description: text("description"),
  uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  isGlobal: boolean("is_global").default(false).notNull(),
  originalFileId: integer("original_file_id").references(() => libraryFiles.id),
});

export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversations.id),
  messages: jsonb("messages").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Password reset tokens for forgot password flow
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdClasses: many(classes),
  enrollments: many(enrollments),
  submissions: many(submissions),
  grades: many(grades),
  comments: many(comments),
  sentMessages: many(messages, { relationName: 'sender' }),
  receivedMessages: many(messages, { relationName: 'receiver' }),
  aiConversations: many(aiConversations),
  passwordResetTokens: many(passwordResetTokens),
  taughtClasses: many(classTeachers),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  teacher: one(users, {
    fields: [classes.teacherId],
    references: [users.id],
  }),
  assignments: many(assignments),
  units: many(units),
  enrollments: many(enrollments),
  classComments: many(classComments),
  coaughtClasses: many(classTeachers),
}));

export const unitsRelations = relations(units, ({ one, many }) => ({
  class: one(classes, {
    fields: [units.classId],
    references: [classes.id],
  }),
  assignments: many(assignments),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  unit: one(units, {
    fields: [assignments.unitId],
    references: [units.id],
  }),
  submissions: many(submissions),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));

export const classTeachersRelations = relations(classTeachers, ({ one }) => ({
    teacher: one(users, {
        fields: [classTeachers.teacherId],
        references: [users.id],
    }),
    class: one(classes, {
        fields: [classTeachers.classId],
        references: [classes.id],
    }),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
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
  comments: many(comments),
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

export const commentsRelations = relations(comments, ({ one }) => ({
  submission: one(submissions, {
    fields: [comments.submissionId],
    references: [submissions.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: 'receiver',
  }),
}));

export const classCommentsRelations = relations(classComments, ({ one }) => ({
  class: one(classes, {
    fields: [classComments.classId],
    references: [classes.id],
  }),
  user: one(users, {
    fields: [classComments.userId],
    references: [users.id],
  }),
}));

export const libraryFilesRelations = relations(libraryFiles, ({ one }) => ({
  uploader: one(users, {
    fields: [libraryFiles.uploadedBy],
    references: [users.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  chatMessages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiChatMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Student schema with optional email
export const insertStudentSchema = insertUserSchema.extend({
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  role: z.literal('student'),
});

// Teacher schema with required email
export const insertTeacherSchema = insertUserSchema.extend({
  email: z.string().email('Please enter a valid email'),
  role: z.literal('teacher'),
});

// Type exports
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;

export const insertClassSchema = createInsertSchema(classes).omit({
  id: true,
  createdAt: true,
  enrollmentCode: true, // Generated automatically
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments, {
  dueDate: z.union([z.string(), z.date(), z.null()]).optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Instructions are required'),
}).omit({
  id: true,
  createdAt: true,
}).extend({
  rubricCriteria: z.array(z.string()).optional(),
  reflectionQuestions: z.array(z.string()).optional(),
  selectedMaps: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    thumbnailUrl: z.string().optional(),
  })).optional(),
});

export const updateAssignmentSchema = insertAssignmentSchema.partial().omit({
  classId: true,
}).extend({
  instructions: z.string().optional(),
  estimatedDuration: z.string().optional(),
  resources: z.string().optional(),
  rubricCriteria: z.array(z.string()).optional(),
  reflectionQuestions: z.array(z.string()).optional(),
  attachmentPath: z.string().optional().nullable(), // Allow clearing the legacy field
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

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertClassCommentSchema = createInsertSchema(classComments).omit({
  id: true,
  createdAt: true,
});

export const insertLibraryFileSchema = createInsertSchema(libraryFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertSampleAssignmentSchema = createInsertSchema(sampleAssignments).omit({
  id: true,
  createdAt: true,
}).extend({
  reflectionQuestions: z.array(z.string()).optional(),
  resources: z.array(z.object({
    name: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  rubricCriteria: z.array(z.string()).optional(),
});

export const insertAiConversationSchema = createInsertSchema(aiConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Grade = typeof grades.$inferSelect;
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ClassComment = typeof classComments.$inferSelect;
export type InsertClassComment = z.infer<typeof insertClassCommentSchema>;
export type SampleAssignment = typeof sampleAssignments.$inferSelect;
export type InsertSampleAssignment = z.infer<typeof insertSampleAssignmentSchema>;
export type LibraryFile = typeof libraryFiles.$inferSelect;
export type InsertLibraryFile = z.infer<typeof insertLibraryFileSchema>;
export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
