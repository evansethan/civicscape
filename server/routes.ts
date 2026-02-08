import type { Express } from "express";
import { createServer, type Server } from "http";
import path from 'path';
import fs from 'fs';
import { storage } from "./storage";
import { log } from "./vite";
import { pool } from "./db";
import bcrypt from "bcrypt";
import { insertUserSchema, insertClassSchema, insertUnitSchema, insertAssignmentSchema, updateAssignmentSchema, insertSubmissionSchema, insertGradeSchema, insertNotificationSchema, insertCommentSchema, insertMessageSchema, insertClassCommentSchema, insertLibraryFileSchema, insertSampleAssignmentSchema } from "@shared/schema";
import { db } from "./db";
import { 
  users, 
  classes, 
  units, 
  assignments, 
  enrollments, 
  submissions, 
  grades, 
  notifications, 
  comments, 
  messages,
  classComments,
  libraryFiles,
  sampleAssignments
} from "@shared/schema";
import { eq, desc, or } from "drizzle-orm";
import { z } from "zod";
import { upload, serveFile, uploadAssignmentFiles } from './upload';
import { ObjectStorageService } from './objectStorage';

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

// Simple response cache for frequently requested data
const responseCache = new Map<string, { data: any, timestamp: number, ttl: number }>();

function getCachedResponse(key: string) {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, data: any, ttlMs: number = 60000) {
  responseCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of responseCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      responseCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes

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

// Helper function to get file type from mimetype
function getFileType(mimetype: string): 'document' | 'image' | 'video' | 'pdf' | 'other' {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('document') || mimetype.includes('text')) return 'document';
  return 'other';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const role = req.body.role as 'teacher' | 'student';
      let userData;
      
      if (role === 'student') {
        // Import the schema here
        const { insertStudentSchema } = await import('@shared/schema');
        userData = insertStudentSchema.parse(req.body);
      } else if (role === 'teacher') {
        // Import the schema here
        const { insertTeacherSchema } = await import('@shared/schema');
        userData = insertTeacherSchema.parse(req.body);
      } else {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
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

  // Constant for password reset response (must be identical to prevent account enumeration attacks)
  const PASSWORD_RESET_RESPONSE_MESSAGE = 'If an account with that username exists, a password reset email has been sent.';

  // Forgot Password - Request password reset
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({ 
          success: true, 
          message: PASSWORD_RESET_RESPONSE_MESSAGE 
        });
      }
      
      // Determine which email to send to
      let resetEmail: string | null = null;
      let resetForStudent = false;
      
      if (user.role === 'teacher' || user.role === 'admin') {
        // Send to teacher's own email
        resetEmail = user.email;
      } else if (user.role === 'student') {
        // Find student's teacher via enrollments
        const teachers = await storage.getTeachersByStudent(user.id);
        
        if (teachers.length > 0) {
          // Use the first teacher's email
          const teacher = teachers[0];
          resetEmail = teacher.email;
          resetForStudent = true;
        }
      }
      
      if (!resetEmail) {
        // No email available - still return success for security
        log('[PASSWORD RESET] No email configured for user');
        return res.json({ 
          success: true, 
          message: PASSWORD_RESET_RESPONSE_MESSAGE 
        });
      }
      
      // Generate secure token
      const token = generateSessionId() + generateSessionId(); // 52 char token
      
      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      // Create reset token in database
      await storage.createPasswordResetToken(user.id, token, expiresAt);
      
      // Build reset link
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
      
      // Log password reset request (without sensitive data)
      log(`[PASSWORD RESET] Reset token created, expires at ${expiresAt.toISOString()}`);
      
      // Return success (and include debug info in development)
      const response: any = { 
        success: true, 
        message: PASSWORD_RESET_RESPONSE_MESSAGE 
      };
      
      // In development, include the reset link for testing
      if (app.get('env') === 'development') {
        response.debug = {
          resetLink,
          email: resetEmail,
          expiresAt: expiresAt.toISOString(),
          isStudentReset: resetForStudent,
        };
      }
      
      res.json(response);
    } catch (error) {
      log('[PASSWORD RESET] Error processing request');
      res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
  });

  // Reset Password - Set new password using token
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      
      if (newPassword.length < 4) {
        return res.status(400).json({ message: 'Password must be at least 4 characters' });
      }
      
      // Find the reset token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired reset link' });
      }
      
      // Check if token is already used
      if (resetToken.used) {
        return res.status(400).json({ message: 'This reset link has already been used' });
      }
      
      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ message: 'This reset link has expired' });
      }
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user's password
      await storage.updateUserPassword(resetToken.userId, hashedPassword);
      
      // Mark token as used
      await storage.markPasswordResetTokenUsed(token);
      
      // Get user info for response
      const user = await storage.getUser(resetToken.userId);
      
      log('[PASSWORD RESET] Password successfully reset');
      
      res.json({ 
        success: true, 
        message: 'Password has been reset successfully. You can now login with your new password.',
        username: user?.username // Return username so they know which account was reset
      });
    } catch (error) {
      log('[PASSWORD RESET] Error resetting password');
      res.status(500).json({ message: 'An error occurred. Please try again.' });
    }
  });

  // Validate reset token (for frontend to check if token is valid before showing form)
  app.get('/api/auth/validate-reset-token', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ valid: false, message: 'Token is required' });
      }
      
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.json({ valid: false, message: 'Invalid reset link' });
      }
      
      if (resetToken.used) {
        return res.json({ valid: false, message: 'This reset link has already been used' });
      }
      
      if (new Date() > resetToken.expiresAt) {
        return res.json({ valid: false, message: 'This reset link has expired' });
      }
      
      // Get user info to display on reset page
      const user = await storage.getUser(resetToken.userId);
      
      res.json({ 
        valid: true, 
        user: user ? {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        } : null
      });
    } catch (error) {
      log('[PASSWORD RESET] Error validating token');
      res.status(500).json({ valid: false, message: 'An error occurred' });
    }
  });

  app.get('/api/ai/conversations', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const conversations = await storage.getConversationsByUser(req.user.id);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch conversations' });
    }
  });

  app.post('/api/ai/conversations', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const { title } = req.body;
      const conversation = await storage.createConversation(req.user.id, title);
      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create conversation' });
    }
  });

  app.patch('/api/ai/conversations/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ message: 'Title is required' });
      }
      const updated = await storage.updateConversationTitle(conversationId, title);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update conversation' });
    }
  });

  app.delete('/api/ai/conversations/:id', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      await storage.deleteConversation(conversationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete conversation' });
    }
  });

  app.get('/api/ai/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const history = await storage.getConversationMessages(conversationId);
      if (history) {
        res.json(history.messages);
      } else {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch messages' });
    }
  });

  app.post('/api/ai/conversations/:id/messages', requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const { messages } = req.body;
      if (!messages) {
        return res.status(400).json({ message: 'Missing messages in body' });
      }
      const history = await storage.saveConversationMessages(conversationId, messages);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to save messages' });
    }
  });

  // Module routes
  app.get('/api/classes', requireAuth, async (req, res) => {
    try {
      if (req.user?.role === 'teacher') {
        const modules = await storage.getClassesByTeacher(req.user.id);
        res.json(modules);
      } else {
        const enrollments = await storage.getEnrollmentsByStudent(req.user!.id);
        res.json(enrollments.map(e => e.module));
      }
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch modules' });
    }
  });

  app.get('/api/classes/:id', requireAuth, async (req, res) => {
    try {
      const module = await storage.getClassById(parseInt(req.params.id));
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch module' });
    }
  });

  app.post('/api/classes', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const moduleData = insertClassSchema.parse({
        ...req.body,
        teacherId: req.user!.id,
      });
      const module = await storage.createClass(moduleData);
      res.json(module);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid module data' });
    }
  });

  app.put('/api/classes/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const moduleData = insertClassSchema.parse(req.body);
      
      const updatedModule = await storage.updateClass(classId, moduleData);
      if (!updatedModule) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      res.json(updatedModule);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid module data' });
    }
  });

  app.delete('/api/classes/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      
      // Check if module exists and is inactive
      const module = await storage.getClassById(classId);
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      if (module.isActive) {
        return res.status(400).json({ message: 'Cannot delete active module. Please deactivate the module first.' });
      }
      
      const success = await storage.deleteClass(classId);
      
      if (!success) {
        return res.status(500).json({ message: 'Failed to delete module' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete module' });
    }
  });

  app.patch('/api/classes/:id/activate', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const classId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const updatedModule = await storage.updateClass(classId, { isActive });
      if (!updatedModule) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      res.json({ success: true, module: updatedModule });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to update module' });
    }
  });

  // Unit routes
  app.get('/api/classes/:classId/units', requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const units = await storage.getUnitsByClass(classId);
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch units' });
    }
  });

  app.post('/api/classes/:classId/units', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const unitData = insertUnitSchema.parse({
        ...req.body,
        classId: parseInt(req.params.classId),
      });
      const unit = await storage.createUnit(unitData);
      res.json(unit);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid unit data' });
    }
  });

  app.get('/api/units/:id', requireAuth, async (req, res) => {
    try {
      const unit = await storage.getUnitById(parseInt(req.params.id));
      if (!unit) {
        return res.status(404).json({ message: 'Unit not found' });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch unit' });
    }
  });

  app.put('/api/units/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const unitId = parseInt(req.params.id);
      const unitData = insertUnitSchema.partial().parse(req.body);
      
      const updatedUnit = await storage.updateUnit(unitId, unitData);
      if (!updatedUnit) {
        return res.status(404).json({ message: 'Unit not found' });
      }
      
      res.json(updatedUnit);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid unit data' });
    }
  });

  app.delete('/api/units/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const unitId = parseInt(req.params.id);
      const success = await storage.deleteUnit(unitId);
      
      if (!success) {
        return res.status(404).json({ message: 'Unit not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to delete unit' });
    }
  });

  // Assignment routes
  app.get('/api/classes/:classId/assignments', requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const isStudent = req.user?.role === 'student';
      const assignments = await storage.getAssignmentsByClass(classId, isStudent);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch assignments' });
    }
  });

  app.post('/api/classes/:classId/assignments', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const assignmentData = insertAssignmentSchema.parse({
        ...req.body,
        classId: parseInt(req.params.classId),
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
      
      const module = await storage.getClassById(assignment.classId);
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
          const enrollments = await storage.getEnrollmentsByClass(assignment.classId);
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
              const module = await storage.getClassById(assignment.classId);
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
              const module = await storage.getClassById(assignment.classId);
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

  // Get individual submission details
  app.get('/api/submissions/:submissionId', requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const user = req.user!;
      
      if (isNaN(submissionId)) {
        return res.status(400).json({ error: 'Invalid submission ID' });
      }

      const submission = await storage.getSubmissionById(submissionId);
      
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      // Authorization: Students can only view their own submissions, teachers can view any
      if (user.role === 'student' && submission.studentId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(submission);
    } catch (error) {
      console.error('Error fetching submission:', error);
      res.status(500).json({ error: 'Failed to fetch submission' });
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
        score: 0, // Default score for system compatibility
        maxScore: 100, // Default max score for system compatibility
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
          message: `Your assignment "${submission.assignment.title}" has been graded and feedback is available.`,
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

  // User routes
  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const { role } = req.query;
      
      if (!role || typeof role !== 'string') {
        return res.status(400).json({ message: 'Role parameter is required' });
      }
      
      const users = await storage.getUsersByRole(role);
      // Remove password from response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch users' });
    }
  });

  // Student management routes
  app.get('/api/students', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const teacherId = req.user?.id;
      if (!teacherId) {
        return res.status(401).json({ message: 'Teacher ID not found' });
      }

      const cacheKey = `teacher-${teacherId}-students`;
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const students = await storage.getStudentsByTeacher(teacherId);
      const cleanStudents = students.map(s => ({ ...s, password: undefined }));
      setCachedResponse(cacheKey, cleanStudents, 2 * 60 * 1000); // 2 minutes
      res.json(cleanStudents);
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

  app.get('/api/students/:id/teachers', requireAuth, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      // Ensure students can only access their own teachers, or teacher can access any
      if (req.user?.role === 'student' && req.user.id !== studentId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const teachers = await storage.getTeachersByStudent(studentId);
      res.json(teachers.map(t => ({ ...t, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch teachers' });
    }
  });

  app.post('/api/students', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const { insertStudentSchema } = await import('@shared/schema');
      const studentData = insertStudentSchema.parse(req.body);
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
      const modules = await storage.getClassesByTeacher(req.user!.id);
      const assignments = [];
      for (const module of modules) {
        const moduleAssignments = await storage.getAssignmentsByClass(module.id);
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





  app.post('/api/classes/:classId/enroll', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const { studentId } = req.body;
      const enrollment = await storage.createEnrollment(studentId, parseInt(req.params.classId));
      res.json(enrollment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Enrollment failed' });
    }
  });

  app.get('/api/classes/:classId/students', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const students = await storage.getEnrollmentsByClass(parseInt(req.params.classId));
      res.json(students);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch students' });
    }
  });

  app.delete('/api/classes/:classId/students/:studentId', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      await storage.deleteEnrollment(parseInt(req.params.studentId), parseInt(req.params.classId));
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to remove enrollment' });
    }
  });

  // Student enrollment by code
  app.post('/api/enroll-by-code', requireAuth, async (req, res) => {
    try {
      const { code } = req.body;
      const user = req.user!;
      
      if (user.role === 'student') {
        const enrollment = await storage.enrollStudentByCode(user.id, code);
        res.json({ success: true, enrollment });
      } else if (user.role === 'teacher') {
        const classTeacher = await storage.addTeacherToClassByCode(user.id, code);
        res.json({ success: true, classTeacher });
      } else {
        return res.status(403).json({ message: 'Only students or teachers can enroll by code' });
      }
      
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Enrollment failed' });
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

  app.get('/api/students/:studentId/classes', requireAuth, async (req, res) => {
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

  // Comment routes
  app.get('/api/submissions/:submissionId/comments', requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const comments = await storage.getCommentsBySubmission(submissionId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch comments' });
    }
  });

  app.post('/api/submissions/:submissionId/comments', requireAuth, async (req, res) => {
    try {
      const submissionId = parseInt(req.params.submissionId);
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Comment content is required' });
      }

      const comment = await storage.createComment({
        submissionId,
        userId: req.user!.id,
        content: content.trim(),
      });
      
      // Create notification for student when teacher comments (only if commenter is teacher)
      if (req.user!.role === 'teacher') {
        try {
          const submission = await storage.getSubmissionById(submissionId);
          if (submission) {
            await storage.createNotification({
              userId: submission.student.id,
              type: 'comment_received',
              title: 'New Comment on Assignment',
              message: `${req.user!.firstName} ${req.user!.lastName} left a comment on your "${submission.assignment.title}" assignment.`,
              assignmentId: submission.assignment.id,
              submissionId: submissionId,
              isRead: false,
            });
          }
        } catch (notificationError) {
          console.error('Failed to create comment notification:', notificationError);
          // Don't fail the comment creation if notification fails
        }
      }
      
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create comment' });
    }
  });

  // Message routes
  app.get('/api/messages/conversations', requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch conversations' });
    }
  });

  app.get('/api/messages/:userId', requireAuth, async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const messages = await storage.getMessagesBetweenUsers(req.user!.id, otherUserId);
      
      // Mark messages from the other user as read
      await storage.markMessagesAsRead(otherUserId, req.user!.id);
      
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', requireAuth, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        senderId: req.user!.id,
        receiverId: req.body.receiverId,
        content: req.body.content,
      });

      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to send message' });
    }
  });

  app.get('/api/messages/unread/count', requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch unread message count' });
    }
  });

  // Class comment routes
  app.get('/api/classes/:classId/comments', requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      
      // Check if user is enrolled in this class or is the teacher
      const classInfo = await storage.getClassById(classId);
      if (!classInfo) {
        return res.status(404).json({ message: 'Class not found' });
      }
      
      // Check if teacher owns the class
      if (req.user!.role === 'teacher' && classInfo.teacherId !== req.user!.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Check if student is enrolled in the class
      if (req.user!.role === 'student') {
        const enrollments = await storage.getEnrollmentsByStudent(req.user!.id);
        const isEnrolled = enrollments.some(e => e.classId === classId);
        if (!isEnrolled) {
          return res.status(403).json({ message: 'Not enrolled in this class' });
        }
      }
      
      const comments = await storage.getClassComments(classId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to fetch class comments' });
    }
  });

  app.post('/api/classes/:classId/comments', requireAuth, async (req, res) => {
    try {
      const classId = parseInt(req.params.classId);
      const { content, tag } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Comment content is required' });
      }
      
      if (!tag || !['question', 'discussion'].includes(tag)) {
        return res.status(400).json({ message: 'Valid tag (question or discussion) is required' });
      }
      
      // Check if user is enrolled in this class or is the teacher
      const classInfo = await storage.getClassById(classId);
      if (!classInfo) {
        return res.status(404).json({ message: 'Class not found' });
      }
      
      // Check if teacher owns the class
      if (req.user!.role === 'teacher' && classInfo.teacherId !== req.user!.id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      // Check if student is enrolled in the class
      if (req.user!.role === 'student') {
        const enrollments = await storage.getEnrollmentsByStudent(req.user!.id);
        const isEnrolled = enrollments.some(e => e.classId === classId);
        if (!isEnrolled) {
          return res.status(403).json({ message: 'Not enrolled in this class' });
        }
      }

      const commentData = insertClassCommentSchema.parse({
        classId,
        userId: req.user!.id,
        content: content.trim(),
        tag,
      });

      const comment = await storage.createClassComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Failed to create class comment' });
    }
  });

  // File upload routes
  app.post('/api/uploads', requireAuth, upload.array('files', 5), uploadAssignmentFiles);
  app.get('/api/uploads/:filename', serveFile);

  // Library file routes
  app.get('/api/library/files', requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Get files based on user role
      let files;
      if (userRole === 'admin') {
        // Admins see all files
        files = await db.select({
          id: libraryFiles.id,
          originalName: libraryFiles.originalName,
          filename: libraryFiles.filename,
          mimetype: libraryFiles.mimetype,
          size: libraryFiles.size,
          category: libraryFiles.category,
          description: libraryFiles.description,
          uploadedBy: libraryFiles.uploadedBy,
          uploadedAt: libraryFiles.uploadedAt,
          isGlobal: libraryFiles.isGlobal,
          originalFileId: libraryFiles.originalFileId,
        }).from(libraryFiles)
        .orderBy(desc(libraryFiles.uploadedAt));
      } else if (userRole === 'teacher') {
        // Teachers see their own files and global files
        files = await db.select({
          id: libraryFiles.id,
          originalName: libraryFiles.originalName,
          filename: libraryFiles.filename,
          mimetype: libraryFiles.mimetype,
          size: libraryFiles.size,
          category: libraryFiles.category,
          description: libraryFiles.description,
          uploadedBy: libraryFiles.uploadedBy,
          uploadedAt: libraryFiles.uploadedAt,
          isGlobal: libraryFiles.isGlobal,
          originalFileId: libraryFiles.originalFileId,
        }).from(libraryFiles)
        .where(or(eq(libraryFiles.uploadedBy, userId), eq(libraryFiles.isGlobal, true)))
        .orderBy(desc(libraryFiles.uploadedAt));
      } else {
        // Students see only their own files
        files = await db.select({
          id: libraryFiles.id,
          originalName: libraryFiles.originalName,
          filename: libraryFiles.filename,
          mimetype: libraryFiles.mimetype,
          size: libraryFiles.size,
          category: libraryFiles.category,
          description: libraryFiles.description,
          uploadedBy: libraryFiles.uploadedBy,
          uploadedAt: libraryFiles.uploadedAt,
          isGlobal: libraryFiles.isGlobal,
          originalFileId: libraryFiles.originalFileId,
        }).from(libraryFiles)
        .where(eq(libraryFiles.uploadedBy, userId))
        .orderBy(desc(libraryFiles.uploadedAt));
      }

      // Add URL and type information
      const filesWithMetadata = files.map(file => ({
        ...file,
        url: `/api/uploads/${file.filename}`,
        type: getFileType(file.mimetype),
        canEdit: file.uploadedBy === userId || userRole === 'admin',
        canCopy: file.isGlobal && file.uploadedBy !== userId && userRole === 'teacher',
      }));

      // Cache user-specific results
      const cacheKey = `library-files-${userRole}-${userId}`;
      setCachedResponse(cacheKey, filesWithMetadata, 2 * 60 * 1000); // 2 minutes
      
      res.json(filesWithMetadata);
    } catch (error) {
      console.error('Error fetching library files:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });

  app.post('/api/library/upload', requireAuth, upload.array('files', 5), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      const category = req.body.category || 'general';
      const description = req.body.description || '';
      const isGlobal = req.body.isGlobal === 'true' && req.user!.role === 'admin';
      const userId = req.user!.id;

      const uploadedFiles = [];

      for (const file of req.files) {
        // Insert file record into database
        const [libraryFile] = await db.insert(libraryFiles).values({
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          category,
          description,
          uploadedBy: userId,
          isGlobal,
        }).returning();

        uploadedFiles.push({
          ...libraryFile,
          url: `/api/uploads/${file.filename}`,
          type: getFileType(file.mimetype),
        });
      }

      res.json({ files: uploadedFiles });
    } catch (error) {
      console.error('Error uploading library files:', error);
      res.status(500).json({ message: 'Failed to upload files' });
    }
  });

  app.delete('/api/library/files/:id', requireAuth, async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Get file info first
      const [file] = await db.select()
        .from(libraryFiles)
        .where(eq(libraryFiles.id, fileId));

      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Only allow file owner, teachers (for their own files), or admins to delete files
      const user = await storage.getUser(userId);
      if (file.uploadedBy !== userId && !(user?.role === 'admin')) {
        return res.status(403).json({ message: 'Not authorized to delete this file' });
      }

      // Delete file record from database
      await db.delete(libraryFiles).where(eq(libraryFiles.id, fileId));

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting library file:', error);
      res.status(500).json({ message: 'Failed to delete file' });
    }
  });

  // Copy global file to user's library
  app.post('/api/library/files/:id/copy', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Get original file
      const [originalFile] = await db.select()
        .from(libraryFiles)
        .where(eq(libraryFiles.id, fileId));

      if (!originalFile) {
        return res.status(404).json({ message: 'File not found' });
      }

      if (!originalFile.isGlobal) {
        return res.status(403).json({ message: 'Only global files can be copied' });
      }

      // Create a copy for the teacher
      const [copiedFile] = await db.insert(libraryFiles).values({
        originalName: `Copy of ${originalFile.originalName}`,
        filename: originalFile.filename, // Same physical file
        mimetype: originalFile.mimetype,
        size: originalFile.size,
        category: originalFile.category,
        description: originalFile.description,
        uploadedBy: userId,
        isGlobal: false,
        originalFileId: fileId,
      }).returning();

      const fileWithMetadata = {
        ...copiedFile,
        url: `/api/uploads/${copiedFile.filename}`,
        type: getFileType(copiedFile.mimetype),
        canEdit: true,
        canCopy: false,
      };

      res.json(fileWithMetadata);
    } catch (error) {
      console.error('Error copying library file:', error);
      res.status(500).json({ message: 'Failed to copy file' });
    }
  });

  // Global files management (admin only)
  app.get('/api/library/global', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const files = await db.select({
        id: libraryFiles.id,
        originalName: libraryFiles.originalName,
        filename: libraryFiles.filename,
        mimetype: libraryFiles.mimetype,
        size: libraryFiles.size,
        category: libraryFiles.category,
        description: libraryFiles.description,
        uploadedBy: libraryFiles.uploadedBy,
        uploadedAt: libraryFiles.uploadedAt,
        isGlobal: libraryFiles.isGlobal,
      }).from(libraryFiles)
      .where(eq(libraryFiles.isGlobal, true))
      .orderBy(desc(libraryFiles.uploadedAt));

      const filesWithMetadata = files.map(file => ({
        ...file,
        url: `/api/uploads/${file.filename}`,
        type: getFileType(file.mimetype),
      }));

      res.json(filesWithMetadata);
    } catch (error) {
      console.error('Error fetching global files:', error);
      res.status(500).json({ message: 'Failed to fetch global files' });
    }
  });

  // Toggle global status (admin only)
  app.patch('/api/library/files/:id/global', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { isGlobal } = req.body;

      const [updatedFile] = await db.update(libraryFiles)
        .set({ isGlobal })
        .where(eq(libraryFiles.id, fileId))
        .returning();

      if (!updatedFile) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.json({
        ...updatedFile,
        url: `/api/uploads/${updatedFile.filename}`,
        type: getFileType(updatedFile.mimetype),
      });
    } catch (error) {
      console.error('Error updating file global status:', error);
      res.status(500).json({ message: 'Failed to update file' });
    }
  });

  // Sample assignments routes (with caching)
  app.get('/api/sample-assignments', async (req, res) => {
    try {
      const cacheKey = 'sample-assignments';
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const assignments = await storage.getSampleAssignments();
      setCachedResponse(cacheKey, assignments, 5 * 60 * 1000); // 5 minutes
      res.json(assignments);
    } catch (error) {
      console.error('Error fetching sample assignments:', error);
      res.status(500).json({ error: 'Failed to fetch sample assignments' });
    }
  });

  app.get('/api/sample-assignments/:id', async (req, res) => {
    try {
      const assignment = await storage.getSampleAssignmentById(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ error: 'Sample assignment not found' });
      }
      res.json(assignment);
    } catch (error) {
      console.error('Error fetching sample assignment:', error);
      res.status(500).json({ error: 'Failed to fetch sample assignment' });
    }
  });

  // Serve attached assets (like PDFs from sample assignments)
  app.get('/attached_assets/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'attached_assets', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Set appropriate content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    
    res.sendFile(filePath);
  });

  // Object storage public file serving
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
