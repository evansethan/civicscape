import {
  users,
  modules,
  assignments,
  enrollments,
  submissions,
  grades,
  notifications,
  type User,
  type InsertUser,
  type Module,
  type InsertModule,
  type Assignment,
  type InsertAssignment,
  type Submission,
  type InsertSubmission,
  type Grade,
  type InsertGrade,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Module methods
  getModulesByTeacher(teacherId: number): Promise<Module[]>;
  getModuleById(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;
  
  // Assignment methods
  getAssignmentsByModule(moduleId: number, isStudent?: boolean): Promise<Assignment[]>;
  getAssignmentById(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;
  getSubmissionById(submissionId: number): Promise<any>;
  
  // Enrollment methods
  getEnrollmentsByStudent(studentId: number): Promise<any[]>;
  getEnrollmentsByModule(moduleId: number): Promise<any[]>;
  getStudentAssignments(studentId: number): Promise<any[]>;
  createEnrollment(studentId: number, moduleId: number): Promise<any>;
  deleteEnrollment(studentId: number, moduleId: number): Promise<void>;
  
  // Submission methods
  getSubmissionsByAssignment(assignmentId: number): Promise<any[]>;
  getSubmissionsByStudent(studentId: number): Promise<any[]>;
  getSubmissionsByTeacher(teacherId: number): Promise<any[]>;
  getSubmission(assignmentId: number, studentId: number): Promise<Submission | undefined>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: number, submission: Partial<InsertSubmission>): Promise<Submission>;
  
  // Grade methods
  getGradesBySubmission(submissionId: number): Promise<Grade | undefined>;
  createGrade(grade: InsertGrade): Promise<Grade>;
  
  // Missing submissions
  getMissingSubmissions(assignmentId: number): Promise<any[]>;
  
  // Notification methods
  getNotificationsByUser(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationsAsRead(userId: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getModulesByTeacher(teacherId: number): Promise<any[]> {
    // Get modules with enrollment counts
    const result = await pool.query(`
      SELECT 
        m.*,
        COUNT(e.id) as enrollment_count
      FROM modules m
      LEFT JOIN enrollments e ON m.id = e.module_id
      WHERE m.teacher_id = $1
      GROUP BY m.id, m.title, m.description, m.teacher_id, m.duration, m.difficulty, m.objectives, m.is_active, m.created_at
      ORDER BY m.created_at DESC
    `, [teacherId]);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      teacherId: row.teacher_id,
      duration: row.duration,
      difficulty: row.difficulty,
      objectives: row.objectives,
      isActive: row.is_active,
      createdAt: row.created_at,
      enrollmentCount: parseInt(row.enrollment_count) || 0,
    }));
  }

  async getModuleById(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module || undefined;
  }

  async createModule(module: InsertModule): Promise<Module> {
    const [newModule] = await db.insert(modules).values(module).returning();
    return newModule;
  }

  async updateModule(id: number, module: Partial<InsertModule>): Promise<Module | undefined> {
    const [updatedModule] = await db.update(modules).set(module).where(eq(modules.id, id)).returning();
    return updatedModule || undefined;
  }

  async deleteModule(id: number): Promise<boolean> {
    try {
      // First delete all grades for submissions in this module's assignments
      await pool.query(`
        DELETE FROM grades 
        WHERE submission_id IN (
          SELECT s.id FROM submissions s
          JOIN assignments a ON s.assignment_id = a.id
          WHERE a.module_id = $1
        )
      `, [id]);

      // Then delete all submissions for assignments in this module
      await pool.query(`
        DELETE FROM submissions 
        WHERE assignment_id IN (
          SELECT id FROM assignments WHERE module_id = $1
        )
      `, [id]);

      // Delete all assignments in this module
      await db.delete(assignments).where(eq(assignments.moduleId, id));

      // Delete all enrollments for this module
      await db.delete(enrollments).where(eq(enrollments.moduleId, id));

      // Finally delete the module
      const result = await db.delete(modules).where(eq(modules.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting module:', error);
      return false;
    }
  }

  async getAssignmentsByModule(moduleId: number, isStudent: boolean = false): Promise<Assignment[]> {
    const conditions = [eq(assignments.moduleId, moduleId)];
    
    // Students should only see published assignments
    if (isStudent) {
      conditions.push(eq(assignments.isPublished, true));
    }
    
    return await db.select().from(assignments).where(and(...conditions));
  }



  async getAssignmentById(id: number): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment || undefined;
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const [newAssignment] = await db.insert(assignments).values(assignment).returning();
    return newAssignment;
  }

  async updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [updatedAssignment] = await db.update(assignments)
      .set(assignment)
      .where(eq(assignments.id, id))
      .returning();
    return updatedAssignment || undefined;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    const result = await db.delete(assignments).where(eq(assignments.id, id));
    return result.rowCount > 0;
  }

  async getEnrollmentsByStudent(studentId: number): Promise<any[]> {
    return await db.select({
      id: enrollments.id,
      moduleId: enrollments.moduleId,
      enrolledAt: enrollments.enrolledAt,
      module: modules,
    }).from(enrollments)
      .innerJoin(modules, eq(enrollments.moduleId, modules.id))
      .where(and(eq(enrollments.studentId, studentId), eq(modules.isActive, true)));
  }

  async getEnrollmentsByModule(moduleId: number): Promise<any[]> {
    return await db.select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      enrolledAt: enrollments.enrolledAt,
      student: users,
    }).from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.moduleId, moduleId));
  }

  async createEnrollment(studentId: number, moduleId: number): Promise<any> {
    const [enrollment] = await db.insert(enrollments).values({
      studentId,
      moduleId,
    }).returning();
    return enrollment;
  }

  async deleteEnrollment(studentId: number, moduleId: number): Promise<void> {
    await db.delete(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.moduleId, moduleId)));
  }

  async getStudentAssignments(studentId: number): Promise<any[]> {
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
      submission: submissions,
    }).from(assignments)
      .innerJoin(modules, eq(assignments.moduleId, modules.id))
      .innerJoin(enrollments, eq(modules.id, enrollments.moduleId))
      .leftJoin(submissions, and(
        eq(assignments.id, submissions.assignmentId),
        eq(submissions.studentId, studentId)
      ))
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(assignments.isActive, true),
        eq(assignments.isPublished, true),
        eq(modules.isActive, true)
      ))
      .orderBy(desc(assignments.createdAt));
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<any[]> {
    // Use direct pool query to avoid Drizzle ORM issues
    // Only show submitted or graded submissions to teachers (exclude drafts)
    const result = await pool.query(`
      SELECT 
        s.*,
        u.username, u.first_name, u.last_name, u.email,
        a.title as assignment_title, a.type as assignment_type, 
        a.points as assignment_points, a.due_date as assignment_due_date
      FROM submissions s
      LEFT JOIN users u ON s.student_id = u.id
      LEFT JOIN assignments a ON s.assignment_id = a.id
      WHERE s.assignment_id = $1 AND s.status IN ('submitted', 'graded')
      ORDER BY s.submitted_at DESC
    `, [assignmentId]);
    
    return result.rows.map((row: any) => ({
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
        email: row.email,
      } : null,
      assignment: row.assignment_title ? {
        id: row.assignment_id,
        title: row.assignment_title,
        type: row.assignment_type,
        points: row.assignment_points,
        dueDate: row.assignment_due_date,
      } : null,
      grade: null,
    }));
  }

  async getSubmissionsByStudent(studentId: number): Promise<any[]> {
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
        dueDate: assignments.dueDate,
      },
      module: {
        id: modules.id,
        title: modules.title,
        description: modules.description,
      },
      grade: grades,
    }).from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(modules, eq(assignments.moduleId, modules.id))
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmissionsByTeacher(teacherId: number): Promise<any[]> {
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
        email: users.email,
      },
      assignment: {
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        points: assignments.points,
        dueDate: assignments.dueDate,
      },
      grade: grades,
    }).from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(modules, eq(assignments.moduleId, modules.id))
      .innerJoin(users, eq(submissions.studentId, users.id))
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(and(
        eq(modules.teacherId, teacherId),
        inArray(submissions.status, ['submitted', 'graded'])
      ))
      .orderBy(desc(submissions.submittedAt));
  }

  async getSubmission(assignmentId: number, studentId: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions)
      .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId)));
    return submission || undefined;
  }

  async getSubmissionById(submissionId: number): Promise<any> {
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
        email: users.email,
      },
      assignment: {
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        points: assignments.points,
        dueDate: assignments.dueDate,
      },
      grade: grades,
    }).from(submissions)
      .innerJoin(users, eq(submissions.studentId, users.id))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(eq(submissions.id, submissionId));
    return submission || undefined;
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const [newSubmission] = await db.insert(submissions).values(submission).returning();
    return newSubmission;
  }

  async updateSubmission(id: number, submission: Partial<InsertSubmission>): Promise<Submission> {
    const [updatedSubmission] = await db.update(submissions).set(submission).where(eq(submissions.id, id)).returning();
    return updatedSubmission;
  }

  async getGradesBySubmission(submissionId: number): Promise<Grade | undefined> {
    const [grade] = await db.select().from(grades).where(eq(grades.submissionId, submissionId));
    return grade || undefined;
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const [newGrade] = await db.insert(grades).values(grade).returning();
    return newGrade;
  }

  async getMissingSubmissions(assignmentId: number): Promise<any[]> {
    // Get all students enrolled in the module for this assignment
    // who don't have a submitted or graded submission
    const result = await pool.query(`
      SELECT 
        u.id as student_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        e.enrolled_at,
        a.due_date,
        a.title as assignment_title
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN assignments a ON e.module_id = a.module_id
      WHERE a.id = $1
        AND NOT EXISTS (
          SELECT 1 FROM submissions s 
          WHERE s.assignment_id = a.id 
            AND s.student_id = u.id 
            AND s.status IN ('submitted', 'graded')
        )
      ORDER BY u.last_name, u.first_name
    `, [assignmentId]);
    
    return result.rows.map((row: any) => ({
      studentId: row.student_id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      enrolledAt: row.enrolled_at,
      dueDate: row.due_date,
      assignmentTitle: row.assignment_title,
      daysOverdue: row.due_date ? Math.max(0, Math.floor((Date.now() - new Date(row.due_date).getTime()) / (1000 * 60 * 60 * 24))) : null,
    }));
  }

  // Notification methods
  async getNotificationsByUser(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async markNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result.length;
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }
}

export const storage = new DatabaseStorage();
