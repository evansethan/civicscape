import {
  users,
  classes,
  units,
  assignments,
  enrollments,
  classTeachers,
  submissions,
  grades,
  notifications,
  comments,
  messages,
  classComments,
  sampleAssignments,
  aiConversations,
  aiChatMessages,
  passwordResetTokens,
  type User,
  type InsertUser,
  type Class,
  type InsertClass,
  type Unit,
  type InsertUnit,
  type Assignment,
  type InsertAssignment,
  type Submission,
  type InsertSubmission,
  type Grade,
  type InsertGrade,
  type Notification,
  type InsertNotification,
  type Comment,
  type InsertComment,
  type Message,
  type InsertMessage,
  type ClassComment,
  type InsertClassComment,
  type SampleAssignment,
  type InsertSampleAssignment,
  type AiConversation,
  type AiChatMessage,
  type InsertAiChatMessage,
  type PasswordResetToken,
  type InsertPasswordResetToken,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

// Generate a unique 6-character enrollment code
function generateEnrollmentCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getStudentsByTeacher(teacherId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  
  // Class methods
  getClassesByTeacher(teacherId: number): Promise<Class[]>;
  getClassById(id: number): Promise<Class | undefined>;
  createClass(classData: InsertClass): Promise<Class>;
  updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined>;
  deleteClass(id: number): Promise<boolean>;
  
  // Unit methods
  getUnitsByClass(classId: number): Promise<Unit[]>;
  getUnitById(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined>;
  deleteUnit(id: number): Promise<boolean>;
  
  // Assignment methods
  getAssignmentsByClass(classId: number, isStudent?: boolean): Promise<Assignment[]>;
  getAssignmentById(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  deleteAssignment(id: number): Promise<boolean>;
  
  // Enrollment methods
  getEnrollmentsByStudent(studentId: number): Promise<any[]>;
  getEnrollmentsByClass(classId: number): Promise<any[]>;
  getStudentAssignments(studentId: number): Promise<any[]>;
  getTeachersByStudent(studentId: number): Promise<User[]>;
  createEnrollment(studentId: number, classId: number): Promise<any>;
  enrollStudentByCode(studentId: number, enrollmentCode: string): Promise<any>;
  addTeacherToClassByCode(teacherId: number, enrollmentCode: string): Promise<any>;
  deleteEnrollment(studentId: number, classId: number): Promise<void>;
  getClassByEnrollmentCode(code: string): Promise<Class | undefined>;
  
  // Submission methods
  getSubmissionsByAssignment(assignmentId: number): Promise<any[]>;
  getSubmissionsByStudent(studentId: number): Promise<any[]>;
  getSubmissionsByTeacher(teacherId: number): Promise<any[]>;
  getSubmission(assignmentId: number, studentId: number): Promise<Submission | undefined>;
  getSubmissionById(submissionId: number): Promise<any>;
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
  markNotificationAsRead(notificationId: number, userId: number): Promise<void>;
  
  // Comment methods
  getCommentsBySubmission(submissionId: number): Promise<any[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  
  // Message methods
  getConversations(userId: number): Promise<any[]>;
  getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<void>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
  // Class comment methods
  getClassComments(classId: number): Promise<any[]>;
  createClassComment(comment: InsertClassComment): Promise<ClassComment>;
  
  // Sample assignment methods
  getSampleAssignments(): Promise<SampleAssignment[]>;
  getSampleAssignmentById(id: number): Promise<SampleAssignment | undefined>;

  // AI Conversation methods
  getConversationsByUser(userId: number): Promise<AiConversation[]>;
  getConversationById(conversationId: number): Promise<AiConversation | undefined>;
  createConversation(userId: number, title?: string): Promise<AiConversation>;
  updateConversationTitle(conversationId: number, title: string): Promise<AiConversation | undefined>;
  deleteConversation(conversationId: number): Promise<boolean>;
  getConversationMessages(conversationId: number): Promise<AiChatMessage | undefined>;
  saveConversationMessages(conversationId: number, messages: any): Promise<AiChatMessage>;

  // Password reset methods
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  invalidateUserPasswordResetTokens(userId: number): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
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
    return await db.select().from(users).where(eq(users.role, role as "teacher" | "student"));
  }

  async getStudentsByTeacher(teacherId: number): Promise<User[]> {
    // Get students enrolled in any class taught by this teacher
    const result = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(enrollments, eq(users.id, enrollments.studentId))
    .innerJoin(classes, eq(enrollments.classId, classes.id))
    .where(and(
      eq(users.role, 'student'),
      eq(classes.teacherId, teacherId)
    ))
    .groupBy(users.id, users.username, users.email, users.role, users.firstName, users.lastName, users.createdAt);
    
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getClassesByTeacher(teacherId: number): Promise<any[]> {
    // Get classes with enrollment counts
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT e.id) as enrollment_count
      FROM classes c
      LEFT JOIN enrollments e ON c.id = e.class_id
      LEFT JOIN class_teachers ct ON c.id = ct.class_id
      WHERE c.teacher_id = $1 OR ct.teacher_id = $1
      GROUP BY c.id, c.title, c.description, c.teacher_id, c.weeks, c.lessons, c.grade_level, c.objectives, c.enrollment_code, c.is_active, c.created_at
      ORDER BY c.created_at DESC
    `, [teacherId]);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      teacherId: row.teacher_id,
      enrollmentCode: row.enrollment_code,
      weeks: row.weeks,
      lessons: row.lessons,
      grade_level: row.grade_level,
      objectives: row.objectives,
      isActive: row.is_active,
      createdAt: row.created_at,
      enrollmentCount: parseInt(row.enrollment_count) || 0,
    }));
  }

  async getClassById(id: number): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.id, id));
    return classData || undefined;
  }

  async createClass(classData: InsertClass): Promise<Class> {
    // Generate a unique enrollment code
    let enrollmentCode: string;
    let isUnique = false;
    
    do {
      enrollmentCode = generateEnrollmentCode();
      const existing = await db.select().from(classes).where(eq(classes.enrollmentCode, enrollmentCode)).limit(1);
      isUnique = existing.length === 0;
    } while (!isUnique);
    
    const [newClass] = await db.insert(classes).values({
      ...classData,
      enrollmentCode,
    }).returning();
    return newClass;
  }

  async updateClass(id: number, classData: Partial<InsertClass>): Promise<Class | undefined> {
    const [updatedClass] = await db.update(classes).set(classData).where(eq(classes.id, id)).returning();
    return updatedClass || undefined;
  }

  async deleteClass(id: number): Promise<boolean> {
    try {
      // First delete all grades for submissions in this module's assignments
      await pool.query(`
        DELETE FROM grades 
        WHERE submission_id IN (
          SELECT s.id FROM submissions s
          JOIN assignments a ON s.assignment_id = a.id
          WHERE a.class_id = $1
        )
      `, [id]);

      // Then delete all submissions for assignments in this module
      await pool.query(`
        DELETE FROM submissions 
        WHERE assignment_id IN (
          SELECT id FROM assignments WHERE class_id = $1
        )
      `, [id]);

      // Delete all assignments in this module
      await db.delete(assignments).where(eq(assignments.classId, id));

      // Delete all units in this module
      await db.delete(units).where(eq(units.classId, id));

      // Delete all enrollments for this module
      await db.delete(enrollments).where(eq(enrollments.classId, id));

      // Finally delete the class
      const result = await db.delete(classes).where(eq(classes.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting module:', error);
      return false;
    }
  }

  async getAssignmentsByClass(classId: number, isStudent: boolean = false): Promise<Assignment[]> {
    const conditions = [eq(assignments.classId, classId)];
    
    // Students should only see published assignments
    if (isStudent) {
      conditions.push(eq(assignments.isPublished, true));
    }
    
    return await db.select().from(assignments).where(and(...conditions));
  }

  // Unit methods
  async getUnitsByClass(classId: number): Promise<Unit[]> {
    return await db.select().from(units)
      .where(eq(units.classId, classId))
      .orderBy(units.order, units.id);
  }

  async getUnitById(id: number): Promise<Unit | undefined> {
    const [unit] = await db.select().from(units).where(eq(units.id, id));
    return unit || undefined;
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [newUnit] = await db.insert(units).values(unit).returning();
    return newUnit;
  }

  async updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit | undefined> {
    const [updatedUnit] = await db.update(units)
      .set(unit)
      .where(eq(units.id, id))
      .returning();
    return updatedUnit || undefined;
  }

  async deleteUnit(id: number): Promise<boolean> {
    try {
      // Set assignments in this unit to have no unit (unit_id = null)
      await db.update(assignments)
        .set({ unitId: null })
        .where(eq(assignments.unitId, id));
      
      // Delete the unit
      const result = await db.delete(units).where(eq(units.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting unit:', error);
      return false;
    }
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
      classId: enrollments.classId,
      enrolledAt: enrollments.enrolledAt,
      class: classes,
    }).from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .where(and(eq(enrollments.studentId, studentId), eq(classes.isActive, true)));
  }

  async getEnrollmentsByClass(classId: number): Promise<any[]> {
    return await db.select({
      id: enrollments.id,
      studentId: enrollments.studentId,
      enrolledAt: enrollments.enrolledAt,
      student: users,
    }).from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.classId, classId));
  }

  async createEnrollment(studentId: number, classId: number): Promise<any> {
    const [enrollment] = await db.insert(enrollments).values({
      studentId,
      classId,
    }).returning();
    return enrollment;
  }

  async deleteEnrollment(studentId: number, classId: number): Promise<void> {
    await db.delete(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.classId, classId)));
  }

  async getClassByEnrollmentCode(code: string): Promise<Class | undefined> {
    const [classData] = await db.select().from(classes).where(eq(classes.enrollmentCode, code));
    return classData || undefined;
  }

  async enrollStudentByCode(studentId: number, enrollmentCode: string): Promise<any> {
    // First check if the class exists with this code
    const classData = await this.getClassByEnrollmentCode(enrollmentCode);
    if (!classData) {
      throw new Error('Invalid enrollment code');
    }

    // Check if student is already enrolled
    const existingEnrollment = await db.select().from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.classId, classData.id)))
      .limit(1);
    
    if (existingEnrollment.length > 0) {
      throw new Error('Already enrolled in this class');
    }

    // Create the enrollment
    return await this.createEnrollment(studentId, classData.id);
  }

  async addTeacherToClassByCode(teacherId: number, enrollmentCode: string): Promise<any> {
    // First check if the class exists with this code
    const classData = await this.getClassByEnrollmentCode(enrollmentCode);
    if (!classData) {
      throw new Error('Invalid enrollment code');
    }

    // Check if teacher is already the main teacher for this class
    if (classData.teacherId === teacherId) {
        throw new Error('You are already the primary teacher of this class');
    }

    // Check if teacher is already a co-teacher for this class
    const existingCoTeacher = await db.select().from(classTeachers)
      .where(and(eq(classTeachers.teacherId, teacherId), eq(classTeachers.classId, classData.id)))
      .limit(1);
    
    if (existingCoTeacher.length > 0) {
      throw new Error('Already a co-teacher in this class');
    }

    // Create the co-teacher entry
    const [classTeacher] = await db.insert(classTeachers).values({
      teacherId,
      classId: classData.id,
    }).returning();
    return classTeacher;
  }

  async getTeachersByStudent(studentId: number): Promise<User[]> {
    // Get teachers from modules that the student is enrolled in
    const result = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    }).from(enrollments)
      .innerJoin(classes, eq(enrollments.classId, classes.id))
      .innerJoin(users, eq(classes.teacherId, users.id))
      .where(and(eq(enrollments.studentId, studentId), eq(classes.isActive, true)))
      .groupBy(users.id, users.username, users.firstName, users.lastName, users.email, users.role);
    
    return result;
  }

  async getStudentAssignments(studentId: number): Promise<any[]> {
    return await db.select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      type: assignments.type,
      classId: assignments.classId,
      dueDate: assignments.dueDate,
      isActive: assignments.isActive,
      createdAt: assignments.createdAt,
      attachments: assignments.attachments,
      class: classes,
      submission: submissions,
    }).from(assignments)
      .innerJoin(classes, eq(assignments.classId, classes.id))
      .innerJoin(enrollments, eq(classes.id, enrollments.classId))
      .leftJoin(submissions, and(
        eq(assignments.id, submissions.assignmentId),
        eq(submissions.studentId, studentId)
      ))
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(assignments.isActive, true),
        eq(assignments.isPublished, true),
        eq(classes.isActive, true)
      ))
      .orderBy(desc(assignments.createdAt));
  }

  async getSubmissionsByAssignment(assignmentId: number): Promise<any[]> {
    // Use DISTINCT ON to get only the latest submission per student
    // Only show submitted or graded submissions to teachers (exclude drafts)
    const result = await pool.query(`
      WITH latest_submissions AS (
        SELECT DISTINCT ON (s.student_id) s.*
        FROM submissions s
        WHERE s.assignment_id = $1 AND s.status IN ('submitted', 'graded')
        ORDER BY s.student_id, s.submitted_at DESC
      )
      SELECT 
        ls.*,
        u.username, u.first_name, u.last_name, u.email,
        a.title as assignment_title, a.type as assignment_type, 
        a.due_date as assignment_due_date
      FROM latest_submissions ls
      LEFT JOIN users u ON ls.student_id = u.id
      LEFT JOIN assignments a ON ls.assignment_id = a.id
      ORDER BY ls.submitted_at DESC
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
        dueDate: row.assignment_due_date,
      } : null,
      grade: null,
    }));
  }

  async getSubmissionsByStudent(studentId: number): Promise<any[]> {
    // Use a subquery to get the latest submission per assignment for this student
    const result = await pool.query(`
      WITH latest_submissions AS (
        SELECT DISTINCT ON (s.assignment_id) s.*
        FROM submissions s
        WHERE s.student_id = $1
        ORDER BY s.assignment_id, s.submitted_at DESC
      )
      SELECT 
        ls.*,
        a.title as assignment_title, a.description as assignment_description,
        a.type as assignment_type, 
        a.due_date as assignment_due_date,
        m.id as class_id, m.title as class_title, m.description as class_description,
        g.score as grade_score, g.max_score as grade_max_score, 
        g.feedback as grade_feedback, g.graded_at as grade_graded_at
      FROM latest_submissions ls
      LEFT JOIN assignments a ON ls.assignment_id = a.id
      LEFT JOIN classes m ON a.class_id = m.id
      LEFT JOIN grades g ON ls.id = g.submission_id
      ORDER BY ls.submitted_at DESC
    `, [studentId]);

    return result.rows.map(row => ({
      id: row.id,
      assignmentId: row.assignment_id,
      studentId: row.student_id,
      writtenResponse: row.written_response,
      mapData: row.map_data,
      attachments: row.attachments,
      status: row.status,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      assignment: {
        id: row.assignment_id,
        title: row.assignment_title,
        description: row.assignment_description,
        type: row.assignment_type,
        dueDate: row.assignment_due_date,
      },
      class: {
        id: row.class_id,
        title: row.class_title,
        description: row.class_description,
      },
      grade: row.grade_score !== null ? {
        submissionId: row.id,
        score: row.grade_score,
        maxScore: row.grade_max_score,
        feedback: row.grade_feedback,
        gradedAt: row.grade_graded_at,
      } : null,
    }));
  }

  async getSubmissionsByTeacher(teacherId: number): Promise<any[]> {
    // Use a subquery to get the latest submission per student-assignment combination
    const result = await pool.query(`
      WITH latest_submissions AS (
        SELECT DISTINCT ON (s.assignment_id, s.student_id) s.*
        FROM submissions s
        INNER JOIN assignments a ON s.assignment_id = a.id
        INNER JOIN classes m ON a.class_id = m.id
        WHERE m.teacher_id = $1
          AND s.status IN ('submitted', 'graded')
        ORDER BY s.assignment_id, s.student_id, s.submitted_at DESC
      )
      SELECT 
        ls.*,
        u.username, u.first_name, u.last_name, u.email,
        a.title as assignment_title, a.description as assignment_description,
        a.type as assignment_type, 
        a.due_date as assignment_due_date,
        g.score as grade_score, g.max_score as grade_max_score, 
        g.feedback as grade_feedback, g.graded_at as grade_graded_at
      FROM latest_submissions ls
      LEFT JOIN users u ON ls.student_id = u.id
      LEFT JOIN assignments a ON ls.assignment_id = a.id
      LEFT JOIN grades g ON ls.id = g.submission_id
      ORDER BY ls.submitted_at DESC
    `, [teacherId]);

    return result.rows.map(row => ({
      id: row.id,
      assignmentId: row.assignment_id,
      studentId: row.student_id,
      writtenResponse: row.written_response,
      mapData: row.map_data,
      attachments: row.attachments,
      status: row.status,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      student: {
        id: row.student_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
      },
      assignment: {
        id: row.assignment_id,
        title: row.assignment_title,
        description: row.assignment_description,
        type: row.assignment_type,
        dueDate: row.assignment_due_date,
      },
      grade: row.grade_score !== null ? {
        id: row.id, // This would need proper grade ID from the query
        submissionId: row.id,
        score: row.grade_score,
        maxScore: row.grade_max_score,
        feedback: row.grade_feedback,
        gradedAt: row.grade_graded_at,
      } : null,
    }));
  }

  async getSubmission(assignmentId: number, studentId: number): Promise<Submission | undefined> {
    const [submission] = await db.select().from(submissions)
      .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId)));
    return submission || undefined;
  }

  async getSubmissionById(submissionId: number): Promise<any> {
    // Use pool query to get full submission details with related data
    const result = await pool.query(`
      SELECT 
        s.*,
        u.username, u.first_name, u.last_name, u.email,
        a.title as assignment_title, a.description as assignment_description,
        a.type as assignment_type, 
        a.due_date as assignment_due_date, a.attachments as assignment_attachments,
        g.score as grade_score, g.max_score as grade_max_score, 
        g.feedback as grade_feedback, g.graded_at as grade_graded_at
      FROM submissions s
      LEFT JOIN users u ON s.student_id = u.id
      LEFT JOIN assignments a ON s.assignment_id = a.id
      LEFT JOIN grades g ON s.id = g.submission_id
      WHERE s.id = $1
    `, [submissionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
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
        description: row.assignment_description,
        type: row.assignment_type,
        dueDate: row.assignment_due_date,
        attachments: row.assignment_attachments,
      } : null,
      grade: row.grade_score !== null ? {
        score: row.grade_score,
        maxScore: row.grade_max_score,
        feedback: row.grade_feedback,
        gradedAt: row.grade_graded_at,
      } : null,
    };
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
      JOIN assignments a ON e.class_id = a.class_id
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

  // Comment methods
  async getCommentsBySubmission(submissionId: number): Promise<any[]> {
    return await db.select({
      id: comments.id,
      submissionId: comments.submissionId,
      userId: comments.userId,
      content: comments.content,
      createdAt: comments.createdAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      },
    }).from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.submissionId, submissionId))
      .orderBy(comments.createdAt);
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  // Message methods
  async getConversations(userId: number): Promise<any[]> {
    const result = await pool.query(`
      WITH conversation_partners AS (
        SELECT DISTINCT 
          CASE 
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END as partner_id
        FROM messages 
        WHERE sender_id = $1 OR receiver_id = $1
      ),
      latest_messages AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END
        )
          m.*,
          CASE 
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END as partner_id
        FROM messages m
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY 
          CASE 
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END,
          created_at DESC
      )
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        lm.content as last_message,
        lm.created_at as last_message_at,
        lm.sender_id = $1 as is_sent_by_me,
        COUNT(unread.id) as unread_count
      FROM conversation_partners cp
      JOIN users u ON cp.partner_id = u.id
      LEFT JOIN latest_messages lm ON cp.partner_id = lm.partner_id
      LEFT JOIN messages unread ON unread.sender_id = cp.partner_id 
        AND unread.receiver_id = $1 
        AND unread.is_read = false
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, 
               lm.content, lm.created_at, lm.sender_id
      ORDER BY lm.created_at DESC NULLS LAST
    `, [userId]);
    
    return result.rows;
  }

  async getMessagesBetweenUsers(user1Id: number, user2Id: number): Promise<Message[]> {
    const result = await pool.query(`
      SELECT * FROM messages 
      WHERE (sender_id = $1 AND receiver_id = $2) 
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `, [user1Id, user2Id]);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      isRead: row.is_read,
      createdAt: row.created_at,
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
    await db.update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.senderId, senderId),
          eq(messages.receiverId, receiverId),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const result = await db.select().from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
    return result.length;
  }

  async getClassComments(classId: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        cc.*,
        u.first_name, u.last_name, u.username, u.role
      FROM class_comments cc
      LEFT JOIN users u ON cc.user_id = u.id
      WHERE cc.class_id = $1
      ORDER BY cc.created_at DESC
    `, [classId]);

    return result.rows.map(row => ({
      id: row.id,
      classId: row.class_id,
      userId: row.user_id,
      content: row.content,
      tag: row.tag,
      createdAt: row.created_at,
      user: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        username: row.username,
        role: row.role,
      },
    }));
  }

  async createClassComment(comment: InsertClassComment): Promise<ClassComment> {
    const [newComment] = await db.insert(classComments).values(comment).returning();
    return newComment;
  }

  async getSampleAssignments(): Promise<SampleAssignment[]> {
    return await db.select().from(sampleAssignments).where(eq(sampleAssignments.isActive, true)).orderBy(sampleAssignments.createdAt);
  }

  async getSampleAssignmentById(id: number): Promise<SampleAssignment | undefined> {
    const [assignment] = await db.select().from(sampleAssignments).where(eq(sampleAssignments.id, id));
    return assignment || undefined;
  }

  async getConversationsByUser(userId: number): Promise<AiConversation[]> {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt));
  }

  async getConversationById(conversationId: number): Promise<AiConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, conversationId));
    return conversation || undefined;
  }

  async createConversation(userId: number, title?: string): Promise<AiConversation> {
    const [conversation] = await db
      .insert(aiConversations)
      .values({ 
        userId, 
        title: title || "New Chat",
        updatedAt: new Date()
      })
      .returning();
    return conversation;
  }

  async updateConversationTitle(conversationId: number, title: string): Promise<AiConversation | undefined> {
    const [updated] = await db
      .update(aiConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async deleteConversation(conversationId: number): Promise<boolean> {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.conversationId, conversationId));
    const result = await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
    return true;
  }

  async getConversationMessages(conversationId: number): Promise<AiChatMessage | undefined> {
    const [messages] = await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.conversationId, conversationId));
    return messages || undefined;
  }

  async saveConversationMessages(conversationId: number, messages: any): Promise<AiChatMessage> {
    const existing = await this.getConversationMessages(conversationId);
    
    await db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));
    
    if (existing) {
      const [updated] = await db
        .update(aiChatMessages)
        .set({ messages, updatedAt: new Date() })
        .where(eq(aiChatMessages.conversationId, conversationId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(aiChatMessages)
        .values({ conversationId, messages, updatedAt: new Date() })
        .returning();
      return created;
    }
  }

  // Password reset methods
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    // Invalidate existing tokens to prevent potential account hijacking
    // (ensures only the most recent reset request is valid)
    await this.invalidateUserPasswordResetTokens(userId);
    
    // Create new token
    const [resetToken] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
      used: false,
    }).returning();
    
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    
    return resetToken || undefined;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async invalidateUserPasswordResetTokens(userId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.used, false)
      ));
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
