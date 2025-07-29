import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import bcrypt from "bcrypt";
import { insertUserSchema, insertModuleSchema, insertAssignmentSchema, updateAssignmentSchema, insertSubmissionSchema, insertGradeSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: string;
        email: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

// Simple session middleware
const sessions = new Map<string, any>();

// Removed mock grade storage - now using database

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function requireAuth(req: any, res: any, next: any) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.user = sessions.get(sessionId);
  next();
}

function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      res.json({ success: true, user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid input' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const sessionId = generateSessionId();
      const sessionData = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
      // Session data set successfully
      sessions.set(sessionId, sessionData);
      
      res.json({ 
        success: true, 
        token: sessionId,
        user: { ...user, password: undefined }
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Login failed' });
    }
  });

  app.post('/api/auth/logout', requireAuth, (req, res) => {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  // Module routes
  app.get('/api/modules', requireAuth, async (req, res) => {
    try {
      if (req.user?.role === 'teacher') {
        const modules = await storage.getModulesByTeacher(req.user.id);
        res.json(modules);
      } else {
        const enrollments = await storage.getEnrollmentsByStudent(req.user!.id);
        res.json(enrollments.map(e => e.module));
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch modules' });
    }
  });

  app.get('/api/modules/:id', requireAuth, async (req, res) => {
    try {
      const module = await storage.getModuleById(parseInt(req.params.id));
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch module' });
    }
  });

  app.post('/api/modules', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const moduleData = insertModuleSchema.parse({
        ...req.body,
        teacherId: req.user!.id,
      });
      const module = await storage.createModule(moduleData);
      res.json(module);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid module data' });
    }
  });

  app.put('/api/modules/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const moduleData = insertModuleSchema.parse(req.body);
      
      const updatedModule = await storage.updateModule(moduleId, moduleData);
      if (!updatedModule) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      res.json(updatedModule);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid module data' });
    }
  });

  app.delete('/api/modules/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      
      // Check if module exists and is inactive
      const module = await storage.getModuleById(moduleId);
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      if (module.isActive) {
        return res.status(400).json({ message: 'Cannot delete active module. Please deactivate the module first.' });
      }
      
      const success = await storage.deleteModule(moduleId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete module' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete module' });
    }
  });

  app.patch('/api/modules/:id/activate', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const updatedModule = await storage.updateModule(moduleId, { isActive });
      if (!updatedModule) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      res.json({ success: true, module: updatedModule });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update module' });
    }
  });

  // Assignment routes
  app.get('/api/modules/:moduleId/assignments', requireAuth, async (req, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const isStudent = req.user?.role === 'student';
      const assignments = await storage.getAssignmentsByModule(moduleId, isStudent);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch assignments' });
    }
  });

  app.post('/api/modules/:moduleId/assignments', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        moduleId: parseInt(req.params.moduleId),
      });
      const assignment = await storage.createAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid assignment data' });
    }
  });

  app.get('/api/assignments/:id', requireAuth, async (req, res) => {
    try {
      const assignment = await storage.getAssignmentById(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch assignment' });
    }
  });

  app.get('/api/assignments/:id/missing', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const missingSubmissions = await storage.getMissingSubmissions(assignmentId);
      res.json(missingSubmissions);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch missing submissions' });
    }
  });

  app.put('/api/assignments/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignmentData = updateAssignmentSchema.parse(req.body);
      
      const updatedAssignment = await storage.updateAssignment(assignmentId, assignmentData);
      if (!updatedAssignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid assignment data' });
    }
  });

  app.delete('/api/assignments/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const success = await storage.deleteAssignment(assignmentId);
      
      if (!success) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete assignment' });
    }
  });

  app.patch('/api/assignments/:id/publish', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const { isPublished } = req.body;
      
      // Get assignment and check if its module is active
      const assignment = await storage.getAssignmentById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      const module = await storage.getModuleById(assignment.moduleId);
      if (!module?.isActive && isPublished) {
        return res.status(400).json({ message: 'Cannot publish assignments in inactive modules. Activate the module first.' });
      }
      
      const updatedAssignment = await storage.updateAssignment(assignmentId, { isPublished });
      if (!updatedAssignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      
      // Create notifications for students when assignment is published
      if (isPublished) {
        try {
          const enrollments = await storage.getEnrollmentsByModule(assignment.moduleId);
          for (const enrollment of enrollments) {
            await storage.createNotification({
              userId: enrollment.studentId,
              type: 'new_assignment',
              title: 'New Assignment Available',
              message: `A new assignment "${assignment.title}" has been published in your module.`,
              assignmentId: assignmentId,
              isRead: false,
            });
          }
        } catch (notificationError) {
          console.error('Failed to create notifications:', notificationError);
          // Don't fail the assignment publishing if notifications fail
        }
      }
      
      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update assignment' });
    }
  });

  // Submission routes
  app.get('/api/assignments/:assignmentId/submissions', requireAuth, async (req, res) => {
    try {
      if (req.user?.role === 'teacher') {
        const submissions = await storage.getSubmissionsByAssignment(parseInt(req.params.assignmentId));
        res.json(submissions);
      } else {
        const submission = await storage.getSubmission(parseInt(req.params.assignmentId), req.user!.id);
        res.json(submission ? [submission] : []);
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch submissions' });
    }
  });

  app.post('/api/assignments/:assignmentId/submissions', requireAuth, requireRole('student'), async (req, res) => {
    try {
      // Check if submission already exists
      const existingSubmission = await storage.getSubmission(parseInt(req.params.assignmentId), req.user!.id);
      
      const submissionData = {
        ...req.body,
        assignmentId: parseInt(req.params.assignmentId),
        studentId: req.user!.id,
      };

      // Add submittedAt timestamp if status is submitted
      if (submissionData.status === 'submitted') {
        submissionData.submittedAt = new Date();
      }
      
      if (existingSubmission) {
        const updatedSubmission = await storage.updateSubmission(existingSubmission.id, submissionData);
        
        // Create notification for teacher when student submits
        if (submissionData.status === 'submitted' && existingSubmission.status !== 'submitted') {
          try {
            const assignment = await storage.getAssignmentById(parseInt(req.params.assignmentId));
            if (assignment) {
              const module = await storage.getModuleById(assignment.moduleId);
              if (module && req.user) {
                await storage.createNotification({
                  userId: module.teacherId,
                  type: 'submission_received',
                  title: 'New Submission Received',
                  message: `${req.user.firstName} ${req.user.lastName} has submitted "${assignment.title}".`,
                  assignmentId: assignment.id,
                  submissionId: updatedSubmission.id,
                  isRead: false,
                });
              }
            }
          } catch (notificationError) {
            console.error('Failed to create submission notification:', notificationError);
          }
        }
        
        res.json(updatedSubmission);
      } else {
        const validatedData = insertSubmissionSchema.parse(submissionData);
        const submission = await storage.createSubmission(validatedData);
        
        // Create notification for teacher when student submits
        if (submissionData.status === 'submitted') {
          try {
            const assignment = await storage.getAssignmentById(parseInt(req.params.assignmentId));
            if (assignment) {
              const module = await storage.getModuleById(assignment.moduleId);
              if (module) {
                await storage.createNotification({
                  userId: module.teacherId,
                  type: 'submission_received',
                  title: 'New Submission Received',
                  message: `${req.user!.firstName} ${req.user!.lastName} has submitted "${assignment.title}".`,
                  assignmentId: assignment.id,
                  submissionId: submission.id,
                  isRead: false,
                });
              }
            }
          } catch (notificationError) {
            console.error('Failed to create submission notification:', notificationError);
          }
        }
        
        res.json(submission);
      }
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid submission data' });
    }
  });

  app.get('/api/students/:studentId/submissions', requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (req.user?.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const submissions = await storage.getSubmissionsByStudent(studentId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch submissions' });
    }
  });

  // Get recent submissions - working version (MOVED BEFORE PARAMETERIZED ROUTE)
  app.get('/api/submissions/recent', requireAuth, async (req, res) => {
    // Recent submissions requested
    
    try {
      if (req.user?.role === 'teacher') {
        // For teachers, get all recent submissions across their modules
        const submissions = await storage.getSubmissionsByTeacher(req.user.id);
        res.json(submissions);
      } else {
        // For students, get their own submissions  
        const submissions = await storage.getSubmissionsByStudent(req.user.id);
        res.json(submissions);
      }
    } catch (error) {
      console.error('Error in submissions/recent:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch submissions' });
    }
  });

  // Get submission by ID
  app.get('/api/submissions/:submissionId', requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const submission = await storage.getSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch submission' });
    }
  });

  // Get grades for a submission
  app.get('/api/submissions/:submissionId/grades', requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const submission = await storage.getSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      res.json(submission.grade || null);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch grade' });
    }
  });

  // Grade routes
  app.post('/api/submissions/:submissionId/grades', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      
      // Verify submission exists
      const submission = await storage.getSubmissionById(submissionId);
      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }
      
      // Create grade
      const gradeData = {
        submissionId,
        score: req.body.score,
        maxScore: req.body.maxScore,
        feedback: req.body.feedback,
        rubric: req.body.rubric,
        gradedBy: req.user!.id,
      };
      
      const grade = await storage.createGrade(gradeData);
      
      // Update submission status to graded
      await storage.updateSubmission(submissionId, { status: 'graded' });
      
      // Create notification for student when assignment is graded
      try {
        await storage.createNotification({
          userId: submission.student.id,
          type: 'assignment_graded',
          title: 'Assignment Graded',
          message: `Your assignment "${submission.assignment.title}" has been graded. Score: ${req.body.score}/${req.body.maxScore}`,
          assignmentId: submission.assignment.id,
          submissionId: submissionId,
          isRead: false,
        });
      } catch (notificationError) {
        console.error('Failed to create grading notification:', notificationError);
      }
      
      res.json(grade);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid grade data' });
    }
  });

  // Student management routes
  app.get('/api/students', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const students = await storage.getUsersByRole('student');
      res.json(students.map(s => ({ ...s, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch students' });
    }
  });

  app.get('/api/students/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const student = await storage.getUser(parseInt(req.params.id));
      if (!student || student.role !== 'student') {
        return res.status(404).json({ message: 'Student not found' });
      }
      res.json({ ...student, password: undefined });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch student' });
    }
  });

  app.get('/api/students/:id/enrollments', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const enrollments = await storage.getEnrollmentsByStudent(parseInt(req.params.id));
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch enrollments' });
    }
  });

  app.get('/api/students/:id/submissions', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const submissions = await storage.getSubmissionsByStudent(parseInt(req.params.id));
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch submissions' });
    }
  });

  app.post('/api/students', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const studentData = insertUserSchema.parse({
        ...req.body,
        role: 'student',
      });
      const hashedPassword = await bcrypt.hash(studentData.password, 10);
      
      const student = await storage.createUser({
        ...studentData,
        password: hashedPassword,
      });
      
      res.json({ ...student, password: undefined });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid student data' });
    }
  });

  // Get all assignments for the teacher to view
  app.get('/api/assignments', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const modules = await storage.getModulesByTeacher(req.user!.id);
      const assignments = [];
      for (const module of modules) {
        const moduleAssignments = await storage.getAssignmentsByModule(module.id);
        assignments.push(...moduleAssignments);
      }
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch assignments' });
    }
  });

  // Get individual assignment
  app.get('/api/assignments/:id', requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const assignment = await storage.getAssignmentById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: 'Assignment not found' });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch assignment' });
    }
  });

  // Simple test endpoint to debug the NaN issue
  app.get('/api/test-db', requireAuth, async (req, res) => {
    try {
      // Test endpoint accessed
      res.json({ success: true, user: req.user, message: 'Test successful' });
    } catch (error) {
      console.error('Error in test endpoint:', error);
      res.status(500).json({ message: 'Test failed' });
    }
  });





  app.post('/api/modules/:moduleId/enroll', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const { studentId } = req.body;
      const enrollment = await storage.createEnrollment(studentId, parseInt(req.params.moduleId));
      res.json(enrollment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Enrollment failed' });
    }
  });

  app.get('/api/modules/:moduleId/students', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const students = await storage.getEnrollmentsByModule(parseInt(req.params.moduleId));
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch students' });
    }
  });

  app.delete('/api/modules/:moduleId/students/:studentId', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      await storage.deleteEnrollment(parseInt(req.params.studentId), parseInt(req.params.moduleId));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to remove enrollment' });
    }
  });

  // Student-specific routes
  app.get('/api/students/:studentId/assignments', requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (req.user?.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const assignments = await storage.getStudentAssignments(studentId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch assignments' });
    }
  });

  app.get('/api/students/:studentId/modules', requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      if (req.user?.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const enrollments = await storage.getEnrollmentsByStudent(studentId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch modules' });
    }
  });

  // Notification routes
  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.user!.id);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/count', requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch notification count' });
    }
  });

  app.post('/api/notifications/mark-read', requireAuth, async (req, res) => {
    try {
      await storage.markNotificationsAsRead(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to mark notifications as read' });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to mark notification as read' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
