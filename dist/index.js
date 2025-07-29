var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  assignments: () => assignments,
  assignmentsRelations: () => assignmentsRelations,
  enrollments: () => enrollments,
  enrollmentsRelations: () => enrollmentsRelations,
  grades: () => grades,
  gradesRelations: () => gradesRelations,
  insertAssignmentSchema: () => insertAssignmentSchema,
  insertGradeSchema: () => insertGradeSchema,
  insertModuleSchema: () => insertModuleSchema,
  insertSubmissionSchema: () => insertSubmissionSchema,
  insertUserSchema: () => insertUserSchema,
  modules: () => modules,
  modulesRelations: () => modulesRelations,
  submissions: () => submissions,
  submissionsRelations: () => submissionsRelations,
  updateAssignmentSchema: () => updateAssignmentSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["teacher", "student"] }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(),
  difficulty: text("difficulty", { enum: ["Beginner", "Intermediate", "Advanced"] }).notNull(),
  objectives: jsonb("objectives").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type", { enum: ["text", "gis", "mixed"] }).notNull(),
  moduleId: integer("module_id").references(() => modules.id),
  teacherId: integer("teacher_id").notNull().references(() => users.id),
  points: integer("points").notNull(),
  dueDate: timestamp("due_date"),
  isActive: boolean("is_active").default(true).notNull(),
  isPublished: boolean("is_published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => modules.id),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull()
});
var submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => assignments.id),
  studentId: integer("student_id").notNull().references(() => users.id),
  writtenResponse: text("written_response"),
  mapData: jsonb("map_data"),
  attachments: jsonb("attachments"),
  status: text("status", { enum: ["draft", "submitted", "graded"] }).default("draft").notNull(),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var grades = pgTable("grades", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => submissions.id),
  score: integer("score").notNull(),
  maxScore: integer("max_score").notNull(),
  feedback: text("feedback"),
  rubric: jsonb("rubric").$type(),
  gradedAt: timestamp("graded_at").defaultNow().notNull(),
  gradedBy: integer("graded_by").notNull().references(() => users.id)
});
var usersRelations = relations(users, ({ many }) => ({
  createdModules: many(modules),
  enrollments: many(enrollments),
  submissions: many(submissions),
  grades: many(grades)
}));
var modulesRelations = relations(modules, ({ one, many }) => ({
  teacher: one(users, {
    fields: [modules.teacherId],
    references: [users.id]
  }),
  assignments: many(assignments),
  enrollments: many(enrollments)
}));
var assignmentsRelations = relations(assignments, ({ one, many }) => ({
  module: one(modules, {
    fields: [assignments.moduleId],
    references: [modules.id]
  }),
  teacher: one(users, {
    fields: [assignments.teacherId],
    references: [users.id]
  }),
  submissions: many(submissions)
}));
var enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id]
  }),
  module: one(modules, {
    fields: [enrollments.moduleId],
    references: [modules.id]
  })
}));
var submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id]
  }),
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id]
  }),
  grade: one(grades, {
    fields: [submissions.id],
    references: [grades.submissionId]
  })
}));
var gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, {
    fields: [grades.submissionId],
    references: [submissions.id]
  }),
  teacher: one(users, {
    fields: [grades.gradedBy],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true
});
var insertAssignmentSchema = createInsertSchema(assignments, {
  dueDate: z.coerce.date().optional()
}).omit({
  id: true,
  createdAt: true
});
var updateAssignmentSchema = insertAssignmentSchema.partial().omit({
  moduleId: true,
  teacherId: true
});
var insertSubmissionSchema = createInsertSchema(submissions, {
  submittedAt: z.coerce.date().optional()
}).omit({
  id: true,
  createdAt: true
});
var insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
  gradedAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, desc } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || void 0;
  }
  async getUsersByRole(role) {
    return await db.select().from(users).where(eq(users.role, role));
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getModulesByTeacher(teacherId) {
    return await db.select().from(modules).where(eq(modules.teacherId, teacherId));
  }
  async getModuleById(id) {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module || void 0;
  }
  async createModule(module) {
    const [newModule] = await db.insert(modules).values(module).returning();
    return newModule;
  }
  async updateModule(id, module) {
    const [updatedModule] = await db.update(modules).set(module).where(eq(modules.id, id)).returning();
    return updatedModule || void 0;
  }
  async deleteModule(id) {
    try {
      await pool.query(`
        DELETE FROM grades 
        WHERE submission_id IN (
          SELECT s.id FROM submissions s
          JOIN assignments a ON s.assignment_id = a.id
          WHERE a.module_id = $1
        )
      `, [id]);
      await pool.query(`
        DELETE FROM submissions 
        WHERE assignment_id IN (
          SELECT id FROM assignments WHERE module_id = $1
        )
      `, [id]);
      await db.delete(assignments).where(eq(assignments.moduleId, id));
      await db.delete(enrollments).where(eq(enrollments.moduleId, id));
      const result = await db.delete(modules).where(eq(modules.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting module:", error);
      return false;
    }
  }
  async getAssignmentsByModule(moduleId) {
    return await db.select().from(assignments).where(eq(assignments.moduleId, moduleId));
  }
  async getAssignmentById(id) {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment || void 0;
  }
  async createAssignment(assignment) {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }
  async updateAssignment(id, assignment) {
    const [updatedAssignment] = await db.update(assignments).set(assignment).where(eq(assignments.id, id)).returning();
    return updatedAssignment || void 0;
  }
  async deleteAssignment(id) {
    const result = await db.delete(assignments).where(eq(assignments.id, id));
    return result.rowCount > 0;
  }
  // Assignment Library Methods
  async getLibraryAssignments(teacherId) {
    return await db.select().from(assignments).where(and(eq(assignments.teacherId, teacherId), isNull(assignments.moduleId)));
  }
  async getLibraryAssignment(id) {
    const [assignment] = await db.select().from(assignments).where(and(eq(assignments.id, id), isNull(assignments.moduleId)));
    return assignment || void 0;
  }
  async createLibraryAssignment(assignment) {
    const [newAssignment] = await db.insert(assignments).values({
      ...assignment,
      moduleId: null
    }).returning();
    return newAssignment;
  }
  async updateLibraryAssignment(id, assignmentData, teacherId) {
    const [updatedAssignment] = await db.update(assignments).set(assignmentData).where(and(eq(assignments.id, id), eq(assignments.teacherId, teacherId), isNull(assignments.moduleId))).returning();
    return updatedAssignment || void 0;
  }
  async deleteLibraryAssignment(id, teacherId) {
    const result = await db.delete(assignments).where(and(eq(assignments.id, id), eq(assignments.teacherId, teacherId), isNull(assignments.moduleId)));
    return result.rowCount > 0;
  }
  async importAssignmentToModule(assignmentId, moduleId, teacherId, dueDate) {
    const libraryAssignment = await this.getLibraryAssignment(assignmentId);
    if (!libraryAssignment || libraryAssignment.teacherId !== teacherId) {
      return void 0;
    }
    const module = await this.getModuleById(moduleId);
    if (!module || module.teacherId !== teacherId) {
      return void 0;
    }
    const [importedAssignment] = await db.insert(assignments).values({
      title: libraryAssignment.title,
      description: libraryAssignment.description,
      type: libraryAssignment.type,
      moduleId,
      teacherId,
      points: libraryAssignment.points,
      dueDate: dueDate ? new Date(dueDate) : libraryAssignment.dueDate,
      isActive: libraryAssignment.isActive,
      isPublished: false
      // New imported assignments are unpublished by default
    }).returning();
    return importedAssignment;
  }
  async getEnrollmentsByStudent(studentId) {
    return await db.select({
      id: enrollments.id,
      moduleId: enrollments.moduleId,
      enrolledAt: enrollments.enrolledAt,
      module: modules
    }).from(enrollments).innerJoin(modules, eq(enrollments.moduleId, modules.id)).where(and(eq(enrollments.studentId, studentId), eq(modules.isActive, true)));
  }
  async getEnrollmentsByModule(moduleId) {
    return await db.select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      enrolledAt: enrollments.enrolledAt,
      student: users
    }).from(enrollments).innerJoin(users, eq(enrollments.studentId, users.id)).where(eq(enrollments.moduleId, moduleId));
  }
  async createEnrollment(studentId, moduleId) {
    const [enrollment] = await db.insert(enrollments).values({
      studentId,
      moduleId
    }).returning();
    return enrollment;
  }
  async deleteEnrollment(studentId, moduleId) {
    await db.delete(enrollments).where(and(eq(enrollments.studentId, studentId), eq(enrollments.moduleId, moduleId)));
  }
  async getStudentAssignments(studentId) {
    return await db.select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      type: assignments.type,
      moduleId: assignments.moduleId,
      points: assignments.points,
      dueDate: assignments.dueDate,
      isActive: assignments.isActive,
      createdAt: assignments.createdAt,
      module: modules,
      submission: submissions
    }).from(assignments).innerJoin(modules, eq(assignments.moduleId, modules.id)).innerJoin(enrollments, eq(modules.id, enrollments.moduleId)).leftJoin(submissions, and(
      eq(assignments.id, submissions.assignmentId),
      eq(submissions.studentId, studentId)
    )).where(and(
      eq(enrollments.studentId, studentId),
      eq(assignments.isActive, true),
      eq(assignments.isPublished, true),
      eq(modules.isActive, true)
    )).orderBy(assignments.dueDate);
  }
  async getSubmissionsByAssignment(assignmentId) {
    const result = await pool.query(`
      SELECT 
        s.*,
        u.username, u.first_name, u.last_name, u.email,
        a.title as assignment_title, a.type as assignment_type, 
        a.points as assignment_points, a.due_date as assignment_due_date
      FROM submissions s
      LEFT JOIN users u ON s.student_id = u.id
      LEFT JOIN assignments a ON s.assignment_id = a.id
      WHERE s.assignment_id = $1
      ORDER BY s.submitted_at DESC
    `, [assignmentId]);
    return result.rows.map((row) => ({
      id: row.id,
      assignmentId: row.assignment_id,
      studentId: row.student_id,
      writtenResponse: row.written_response,
      mapData: row.map_data,
      attachments: row.attachments,
      status: row.status,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      student: row.username ? {
        id: row.student_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email
      } : null,
      assignment: row.assignment_title ? {
        id: row.assignment_id,
        title: row.assignment_title,
        type: row.assignment_type,
        points: row.assignment_points,
        dueDate: row.assignment_due_date
      } : null,
      grade: null
    }));
  }
  async getSubmissionsByStudent(studentId) {
    return await db.select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      studentId: submissions.studentId,
      writtenResponse: submissions.writtenResponse,
      mapData: submissions.mapData,
      attachments: submissions.attachments,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      createdAt: submissions.createdAt,
      assignment: {
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        points: assignments.points,
        dueDate: assignments.dueDate
      },
      module: {
        id: modules.id,
        title: modules.title,
        description: modules.description
      },
      grade: grades
    }).from(submissions).innerJoin(assignments, eq(submissions.assignmentId, assignments.id)).innerJoin(modules, eq(assignments.moduleId, modules.id)).leftJoin(grades, eq(submissions.id, grades.submissionId)).where(eq(submissions.studentId, studentId)).orderBy(desc(submissions.submittedAt));
  }
  async getSubmissionsByTeacher(teacherId) {
    return await db.select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      studentId: submissions.studentId,
      writtenResponse: submissions.writtenResponse,
      mapData: submissions.mapData,
      attachments: submissions.attachments,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      createdAt: submissions.createdAt,
      student: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      },
      assignment: {
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        points: assignments.points,
        dueDate: assignments.dueDate
      },
      grade: grades
    }).from(submissions).innerJoin(assignments, eq(submissions.assignmentId, assignments.id)).innerJoin(modules, eq(assignments.moduleId, modules.id)).innerJoin(users, eq(submissions.studentId, users.id)).leftJoin(grades, eq(submissions.id, grades.submissionId)).where(eq(modules.teacherId, teacherId)).orderBy(desc(submissions.submittedAt));
  }
  async getSubmission(assignmentId, studentId) {
    const [submission] = await db.select().from(submissions).where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId)));
    return submission || void 0;
  }
  async getSubmissionById(submissionId) {
    const [submission] = await db.select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      studentId: submissions.studentId,
      writtenResponse: submissions.writtenResponse,
      mapData: submissions.mapData,
      attachments: submissions.attachments,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      createdAt: submissions.createdAt,
      student: {
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      },
      assignment: {
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        points: assignments.points,
        dueDate: assignments.dueDate
      },
      grade: grades
    }).from(submissions).innerJoin(users, eq(submissions.studentId, users.id)).innerJoin(assignments, eq(submissions.assignmentId, assignments.id)).leftJoin(grades, eq(submissions.id, grades.submissionId)).where(eq(submissions.id, submissionId));
    return submission || void 0;
  }
  async createSubmission(submission) {
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }
  async updateSubmission(id, submission) {
    const [updatedSubmission] = await db.update(submissions).set(submission).where(eq(submissions.id, id)).returning();
    return updatedSubmission;
  }
  async getGradesBySubmission(submissionId) {
    const [grade] = await db.select().from(grades).where(eq(grades.submissionId, submissionId));
    return grade || void 0;
  }
  async createGrade(grade) {
    const [newGrade] = await db.insert(grades).values(grade).returning();
    return newGrade;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcrypt";
var sessions = /* @__PURE__ */ new Map();
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
function requireAuth(req, res, next) {
  const sessionId = req.headers.authorization?.replace("Bearer ", "");
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = sessions.get(sessionId);
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
async function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      res.json({ success: true, user: { ...user, password: void 0 } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid input" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const sessionId = generateSessionId();
      const sessionData = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      };
      sessions.set(sessionId, sessionData);
      res.json({
        success: true,
        token: sessionId,
        user: { ...user, password: void 0 }
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Login failed" });
    }
  });
  app2.post("/api/auth/logout", requireAuth, (req, res) => {
    const sessionId = req.headers.authorization?.replace("Bearer ", "");
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ success: true });
  });
  app2.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });
  app2.get("/api/modules", requireAuth, async (req, res) => {
    try {
      if (req.user?.role === "teacher") {
        const modules2 = await storage.getModulesByTeacher(req.user.id);
        res.json(modules2);
      } else {
        const enrollments2 = await storage.getEnrollmentsByStudent(req.user.id);
        res.json(enrollments2.map((e) => e.module));
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch modules" });
    }
  });
  app2.get("/api/modules/:id", requireAuth, async (req, res) => {
    try {
      const module = await storage.getModuleById(parseInt(req.params.id));
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch module" });
    }
  });
  app2.post("/api/modules", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const moduleData = insertModuleSchema.parse({
        ...req.body,
        teacherId: req.user.id
      });
      const module = await storage.createModule(moduleData);
      res.json(module);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid module data" });
    }
  });
  app2.put("/api/modules/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const moduleData = insertModuleSchema.parse(req.body);
      const updatedModule = await storage.updateModule(moduleId, moduleData);
      if (!updatedModule) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(updatedModule);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid module data" });
    }
  });
  app2.delete("/api/modules/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const module = await storage.getModuleById(moduleId);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      if (module.isActive) {
        return res.status(400).json({ message: "Cannot delete active module. Please deactivate the module first." });
      }
      const success = await storage.deleteModule(moduleId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete module" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete module" });
    }
  });
  app2.patch("/api/modules/:id/activate", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const { isActive } = req.body;
      const updatedModule = await storage.updateModule(moduleId, { isActive });
      if (!updatedModule) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json({ success: true, module: updatedModule });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update module" });
    }
  });
  app2.get("/api/modules/:moduleId/assignments", requireAuth, async (req, res) => {
    try {
      const assignments2 = await storage.getAssignmentsByModule(parseInt(req.params.moduleId));
      res.json(assignments2);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch assignments" });
    }
  });
  app2.post("/api/modules/:moduleId/assignments", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        moduleId: parseInt(req.params.moduleId),
        teacherId: req.user.id
      });
      const assignment = await storage.createAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid assignment data" });
    }
  });
  app2.get("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignmentById(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch assignment" });
    }
  });
  app2.put("/api/assignments/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignmentData = updateAssignmentSchema.parse(req.body);
      const updatedAssignment = await storage.updateAssignment(assignmentId, assignmentData);
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(updatedAssignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid assignment data" });
    }
  });
  app2.delete("/api/assignments/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const success = await storage.deleteAssignment(assignmentId);
      if (!success) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete assignment" });
    }
  });
  app2.patch("/api/assignments/:id/publish", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { isPublished } = req.body;
      const assignment = await storage.getAssignmentById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      const module = await storage.getModuleById(assignment.moduleId);
      if (!module?.isActive && isPublished) {
        return res.status(400).json({ message: "Cannot publish assignments in inactive modules. Activate the module first." });
      }
      const updatedAssignment = await storage.updateAssignment(assignmentId, { isPublished });
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update assignment" });
    }
  });
  app2.get("/api/assignments/library", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const libraryAssignments = await storage.getLibraryAssignments(req.user.id);
      res.json(libraryAssignments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch library assignments" });
    }
  });
  app2.post("/api/assignments/library", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.omit({ moduleId: true }).parse({
        ...req.body,
        teacherId: req.user.id
      });
      const assignment = await storage.createLibraryAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid assignment data" });
    }
  });
  app2.get("/api/assignments/library/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getLibraryAssignment(assignmentId);
      if (!assignment || assignment.teacherId !== req.user.id) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch assignment" });
    }
  });
  app2.put("/api/assignments/library/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignmentData = updateAssignmentSchema.omit({ moduleId: true }).parse(req.body);
      const updatedAssignment = await storage.updateLibraryAssignment(assignmentId, assignmentData, req.user.id);
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(updatedAssignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid assignment data" });
    }
  });
  app2.delete("/api/assignments/library/:id", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const deleted = await storage.deleteLibraryAssignment(assignmentId, req.user.id);
      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to delete assignment" });
    }
  });
  app2.post("/api/assignments/library/:id/import", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { moduleId, dueDate } = req.body;
      const importedAssignment = await storage.importAssignmentToModule(assignmentId, moduleId, req.user.id, dueDate);
      if (!importedAssignment) {
        return res.status(404).json({ message: "Assignment or module not found" });
      }
      res.json(importedAssignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to import assignment" });
    }
  });
  app2.get("/api/assignments/:assignmentId/submissions", requireAuth, async (req, res) => {
    try {
      if (req.user?.role === "teacher") {
        const submissions2 = await storage.getSubmissionsByAssignment(parseInt(req.params.assignmentId));
        res.json(submissions2);
      } else {
        const submission = await storage.getSubmission(parseInt(req.params.assignmentId), req.user.id);
        res.json(submission ? [submission] : []);
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch submissions" });
    }
  });
  app2.post("/api/assignments/:assignmentId/submissions", requireAuth, requireRole("student"), async (req, res) => {
    try {
      const existingSubmission = await storage.getSubmission(parseInt(req.params.assignmentId), req.user.id);
      const submissionData = {
        ...req.body,
        assignmentId: parseInt(req.params.assignmentId),
        studentId: req.user.id
      };
      if (submissionData.status === "submitted") {
        submissionData.submittedAt = /* @__PURE__ */ new Date();
      }
      if (existingSubmission) {
        const updatedSubmission = await storage.updateSubmission(existingSubmission.id, submissionData);
        res.json(updatedSubmission);
      } else {
        const validatedData = insertSubmissionSchema.parse(submissionData);
        const submission = await storage.createSubmission(validatedData);
        res.json(submission);
      }
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid submission data" });
    }
  });
  app2.get("/api/students/:studentId/submissions", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (req.user?.role === "student" && req.user.id !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const submissions2 = await storage.getSubmissionsByStudent(studentId);
      res.json(submissions2);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch submissions" });
    }
  });
  app2.get("/api/submissions/recent", requireAuth, async (req, res) => {
    try {
      if (req.user?.role === "teacher") {
        const submissions2 = await storage.getSubmissionsByTeacher(req.user.id);
        res.json(submissions2);
      } else {
        const submissions2 = await storage.getSubmissionsByStudent(req.user.id);
        res.json(submissions2);
      }
    } catch (error) {
      console.error("Error in submissions/recent:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch submissions" });
    }
  });
  app2.get("/api/submissions/:submissionId", requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch submission" });
    }
  });
  app2.get("/api/submissions/:submissionId/grades", requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      res.json(submission.grade || null);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch grade" });
    }
  });
  app2.post("/api/submissions/:submissionId/grades", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      const gradeData = {
        submissionId,
        score: req.body.score,
        maxScore: req.body.maxScore,
        feedback: req.body.feedback,
        rubric: req.body.rubric,
        gradedBy: req.user.id
      };
      const grade = await storage.createGrade(gradeData);
      await storage.updateSubmission(submissionId, { status: "graded" });
      res.json(grade);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid grade data" });
    }
  });
  app2.get("/api/students", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const students = await storage.getUsersByRole("student");
      res.json(students.map((s) => ({ ...s, password: void 0 })));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch students" });
    }
  });
  app2.post("/api/students", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const studentData = insertUserSchema.parse({
        ...req.body,
        role: "student"
      });
      const hashedPassword = await bcrypt.hash(studentData.password, 10);
      const student = await storage.createUser({
        ...studentData,
        password: hashedPassword
      });
      res.json({ ...student, password: void 0 });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid student data" });
    }
  });
  app2.get("/api/assignments", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const modules2 = await storage.getModulesByTeacher(req.user.id);
      const assignments2 = [];
      for (const module of modules2) {
        const moduleAssignments = await storage.getAssignmentsByModule(module.id);
        assignments2.push(...moduleAssignments);
      }
      res.json(assignments2);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch assignments" });
    }
  });
  app2.get("/api/assignments/:id", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getAssignmentById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch assignment" });
    }
  });
  app2.get("/api/test-db", requireAuth, async (req, res) => {
    try {
      res.json({ success: true, user: req.user, message: "Test successful" });
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ message: "Test failed" });
    }
  });
  app2.post("/api/modules/:moduleId/enroll", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const { studentId } = req.body;
      const enrollment = await storage.createEnrollment(studentId, parseInt(req.params.moduleId));
      res.json(enrollment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Enrollment failed" });
    }
  });
  app2.get("/api/modules/:moduleId/students", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      const students = await storage.getEnrollmentsByModule(parseInt(req.params.moduleId));
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch students" });
    }
  });
  app2.delete("/api/modules/:moduleId/students/:studentId", requireAuth, requireRole("teacher"), async (req, res) => {
    try {
      await storage.deleteEnrollment(parseInt(req.params.studentId), parseInt(req.params.moduleId));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to remove enrollment" });
    }
  });
  app2.get("/api/students/:studentId/assignments", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (req.user?.role === "student" && req.user.id !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const assignments2 = await storage.getStudentAssignments(studentId);
      res.json(assignments2);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch assignments" });
    }
  });
  app2.get("/api/students/:studentId/modules", requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (req.user?.role === "student" && req.user.id !== studentId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const enrollments2 = await storage.getEnrollmentsByStudent(studentId);
      res.json(enrollments2);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to fetch modules" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
