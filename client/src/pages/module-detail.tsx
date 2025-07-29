import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { insertAssignmentSchema, updateAssignmentSchema, insertModuleSchema, type Assignment, type Module } from '@shared/schema';
import { Book, Plus, Edit2, Trash2, Clock, FileText, Map, Users, Calendar, ArrowLeft, UserPlus, Eye, EyeOff, Power, PowerOff, Settings } from 'lucide-react';
import { Link } from 'wouter';

export default function ModuleDetail() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editModuleDialogOpen, setEditModuleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['/api/modules', moduleId],
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/modules', moduleId, 'assignments'],
  });

  const { data: studentAssignments = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'assignments'],
    enabled: !isTeacher && !!user?.id,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    enabled: isTeacher,
  });

  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ['/api/modules', moduleId, 'students'],
    enabled: isTeacher && !!moduleId,
  });

  const createAssignmentForm = useForm({
    resolver: zodResolver(insertAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'text' as const,
      points: 100,
      moduleId: parseInt(moduleId || '0'),
      dueDate: undefined,
    },
  });

  const editAssignmentForm = useForm({
    resolver: zodResolver(updateAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'text' as const,
      points: 100,
      dueDate: undefined,
    },
  });

  const editModuleForm = useForm({
    resolver: zodResolver(insertModuleSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: 0,
      difficulty: 'Beginner' as const,
      objectives: [],
      teacherId: user?.id || 0,
      isActive: true,
    },
  });

  const queryClient = useQueryClient();

  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/modules/${moduleId}/assignments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      setCreateDialogOpen(false);
      createAssignmentForm.reset();
      toast({ title: 'Assignment created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating assignment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const editAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      setEditDialogOpen(false);
      setEditingAssignment(null);
      editAssignmentForm.reset();
      toast({ title: 'Assignment updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating assignment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => apiRequest('DELETE', `/api/assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({ title: 'Assignment deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting assignment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ assignmentId, isPublished }: { assignmentId: number; isPublished: boolean }) => {
      const response = await apiRequest('PATCH', `/api/assignments/${assignmentId}/publish`, { isPublished });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: 'Assignment updated',
        description: 'Assignment visibility has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });

  const editModuleMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/modules/${moduleId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      setEditModuleDialogOpen(false);
      editModuleForm.reset();
      toast({ title: 'Module updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating module',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/modules/${moduleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      setLocation('/modules');
      toast({ title: 'Module deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting module',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const toggleModuleActiveMutation = useMutation({
    mutationFn: (isActive: boolean) => apiRequest('PATCH', `/api/modules/${moduleId}/activate`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      toast({ title: `Module ${module?.isActive ? 'deactivated' : 'activated'} successfully` });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating module status',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const onEditModule = (data: any) => {
    editModuleMutation.mutate(data);
  };

  const handleEditModule = () => {
    if (!module) return;
    editModuleForm.reset({
      title: module.title,
      description: module.description,
      duration: module.duration,
      difficulty: module.difficulty,
      objectives: module.objectives || [],
      teacherId: module.teacherId,
      isActive: module.isActive,
    });
    setEditModuleDialogOpen(true);
  };

  const handleDeleteModule = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteModule = () => {
    deleteModuleMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleToggleModuleActive = () => {
    if (!module) return;
    setActivateDialogOpen(true);
  };

  const confirmToggleModuleActive = () => {
    if (!module) return;
    toggleModuleActiveMutation.mutate(!module.isActive);
    setActivateDialogOpen(false);
  };

  const onCreateAssignment = (data: any) => {
    const formattedData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    };
    createAssignmentMutation.mutate(formattedData);
  };

  const onEditAssignment = (data: any) => {
    if (!editingAssignment) return;
    
    const formattedData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
    };
    editAssignmentMutation.mutate({ id: editingAssignment.id, data: formattedData });
  };

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment);
    editAssignmentForm.reset({
      title: assignment.title,
      description: assignment.description,
      type: assignment.type,
      points: assignment.points,
      moduleId: assignment.moduleId,
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : undefined,
    });
    setEditDialogOpen(true);
  };

  const handleDeleteAssignment = (assignmentId: number) => {
    if (window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      deleteAssignmentMutation.mutate(assignmentId);
    }
  };

  const handleTogglePublish = (assignmentId: number, currentPublished: boolean) => {
    publishMutation.mutate({ assignmentId, isPublished: !currentPublished });
  };

  const enrollStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/enroll`, { studentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId, 'students'] });
      toast({
        title: 'Student enrolled',
        description: 'Student has been successfully enrolled in the module.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll student',
        variant: 'destructive',
      });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await apiRequest('DELETE', `/api/modules/${moduleId}/students/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', moduleId, 'students'] });
      toast({
        title: 'Student removed',
        description: 'Student has been removed from the module.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove student',
        variant: 'destructive',
      });
    },
  });

  const handleEnrollStudent = (studentId: number) => {
    enrollStudentMutation.mutate(studentId);
  };

  const handleRemoveStudent = (studentId: number) => {
    removeStudentMutation.mutate(studentId);
  };

  const getAvailableStudents = () => {
    const enrolledStudentIds = enrolledStudents.map((es: any) => es.studentId);
    return students.filter((student: any) => !enrolledStudentIds.includes(student.id));
  };

  const getAssignmentStatus = (assignment: any) => {
    if (!isTeacher) {
      const studentAssignment = studentAssignments.find((sa: any) => sa.id === assignment.id);
      if (studentAssignment?.submission?.status === 'graded') {
        return { status: 'graded', variant: 'default' as const };
      }
      if (studentAssignment?.submission) {
        return { status: 'submitted', variant: 'secondary' as const };
      }
      return { status: 'assigned', variant: 'outline' as const };
    }
    return null;
  };

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'gis':
        return <Map className="h-4 w-4" />;
      case 'text':
        return <FileText className="h-4 w-4" />;
      case 'mixed':
        return <div className="flex gap-1"><FileText className="h-3 w-3" /><Map className="h-3 w-3" /></div>;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (moduleLoading || assignmentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Module Not Found</h2>
          <p className="text-slate-600 mb-4">The module you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/modules">
            <Button>Back to Modules</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/modules">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Modules
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Book className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{module.title}</h1>
                <Badge variant={module.isActive ? "default" : "secondary"}>
                  {module.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-slate-600">{module.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Module Info */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Duration</p>
                <p className="text-lg font-semibold text-slate-900">{module.duration || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Difficulty</p>
                <p className="text-lg font-semibold text-slate-900">{module.difficulty || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Assignments</p>
                <p className="text-lg font-semibold text-slate-900">{assignments.length}</p>
              </div>
            </div>
          </div>
          {module.objectives && module.objectives.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Learning Objectives</h3>
              <ul className="text-slate-700 space-y-1">
                {module.objectives.map((objective: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assignments</CardTitle>
            {isTeacher && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Assignment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">No assignments in this module yet</p>
              {isTeacher && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Assignment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment: any) => {
                const status = getAssignmentStatus(assignment);
                const studentAssignment = !isTeacher ? studentAssignments.find((sa: any) => sa.id === assignment.id) : null;
                
                return (
                  <Card key={assignment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/assignments/${assignment.id}`)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            {getAssignmentTypeIcon(assignment.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-slate-900">{assignment.title}</h3>
                              {status && (
                                <Badge variant={status.variant}>{status.status}</Badge>
                              )}
                            </div>
                            <p className="text-slate-600 mb-3">{assignment.description}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                {assignment.points} points
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Due {assignment.dueDate 
                                  ? new Date(assignment.dueDate).toLocaleDateString() 
                                  : 'No due date'
                                }
                              </span>
                              {isTeacher && (
                                <div className="flex items-center gap-1">
                                  {assignment.isPublished ? (
                                    <Eye className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <EyeOff className="h-4 w-4 text-slate-400" />
                                  )}
                                  <span className={assignment.isPublished ? "text-green-600" : "text-slate-400"}>
                                    {assignment.isPublished ? "Published" : "Unpublished"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!isTeacher && studentAssignment && !studentAssignment.submission && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Link href={`/assignments/${assignment.id}/submit`}>
                                <Button size="sm">Start Assignment</Button>
                              </Link>
                            </div>
                          )}
                          {!isTeacher && studentAssignment?.submission && studentAssignment.submission.status === 'submitted' && (
                            <Badge variant="secondary">Submitted</Badge>
                          )}
                          {!isTeacher && studentAssignment?.submission?.status === 'graded' && (
                            <div className="text-right">
                              <div className="text-lg font-semibold text-green-600">
                                {studentAssignment.submission.grade?.score}/{studentAssignment.submission.grade?.maxScore}
                              </div>
                              <div className="text-sm text-slate-500">
                                {Math.round((studentAssignment.submission.grade?.score / studentAssignment.submission.grade?.maxScore) * 100)}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Management Section */}
      {isTeacher && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Module Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleToggleModuleActive}
                variant={module.isActive ? "outline" : "default"}
                disabled={toggleModuleActiveMutation.isPending}
              >
                {module.isActive ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                {module.isActive ? "Deactivate Module" : "Activate Module"}
              </Button>
              <Button
                onClick={() => setEnrollDialogOpen(true)}
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
              <Button
                onClick={handleEditModule}
                variant="outline"
                disabled={editModuleMutation.isPending}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Module
              </Button>
              <Button
                onClick={handleDeleteModule}
                variant="outline"
                disabled={deleteModuleMutation.isPending || module.isActive}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400"
                title={module.isActive ? "Deactivate module first to delete" : "Delete module"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Module
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              {module.isActive 
                ? "This module is currently active and visible to students. Deactivating will hide it from students and prevent assignment publishing."
                : "This module is inactive and hidden from students. Activate it to make it visible and allow assignment publishing."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Manage Students Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Students - {module?.title}</DialogTitle>
            <DialogDescription>
              Enroll students in this module or remove existing enrollments. Students will have access to all assignments in this module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Enrolled Students */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Enrolled Students ({enrolledStudents.length})</h3>
              {enrolledStudents.length === 0 ? (
                <p className="text-slate-500 text-sm">No students enrolled yet.</p>
              ) : (
                <div className="space-y-2">
                  {enrolledStudents.map((enrollment: any) => (
                    <div key={enrollment.studentId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{enrollment.student.firstName} {enrollment.student.lastName}</p>
                        <p className="text-sm text-slate-500">{enrollment.student.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveStudent(enrollment.studentId)}
                        disabled={removeStudentMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Students */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Available Students</h3>
              {getAvailableStudents().length === 0 ? (
                <p className="text-slate-500 text-sm">All students are already enrolled.</p>
              ) : (
                <div className="space-y-2">
                  {getAvailableStudents().map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-slate-500">{student.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleEnrollStudent(student.id)}
                        disabled={enrollStudentMutation.isPending}
                      >
                        Enroll
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Activation Confirmation Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{module?.isActive ? "Deactivate" : "Activate"} Module</DialogTitle>
            <DialogDescription>
              {module?.isActive 
                ? "Are you sure you want to deactivate this module? It will be hidden from students and assignments cannot be published until reactivated."
                : "Are you sure you want to activate this module? It will become visible to enrolled students and assignments can be published."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setActivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={module?.isActive ? "outline" : "default"}
              onClick={confirmToggleModuleActive}
              disabled={toggleModuleActiveMutation.isPending}
            >
              {toggleModuleActiveMutation.isPending 
                ? (module?.isActive ? 'Deactivating...' : 'Activating...') 
                : (module?.isActive ? 'Deactivate' : 'Activate')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Modify the assignment details. Changes will be visible to students immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...editAssignmentForm}>
            <form onSubmit={editAssignmentForm.handleSubmit(onEditAssignment)} className="space-y-4">
              <FormField
                control={editAssignmentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Assignment title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAssignmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Assignment description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAssignmentForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text Assignment</SelectItem>
                        <SelectItem value="gis">GIS Assignment</SelectItem>
                        <SelectItem value="mixed">Mixed Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAssignmentForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editAssignmentForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingAssignment(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editAssignmentMutation.isPending}>
                  {editAssignmentMutation.isPending ? 'Updating...' : 'Update Assignment'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={editModuleDialogOpen} onOpenChange={setEditModuleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module details. Changes will be visible to students immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...editModuleForm}>
            <form onSubmit={editModuleForm.handleSubmit(onEditModule)} className="space-y-4">
              <FormField
                control={editModuleForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Module title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editModuleForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Module description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editModuleForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editModuleForm.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModuleDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editModuleMutation.isPending}>
                  {editModuleMutation.isPending ? 'Updating...' : 'Update Module'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Add a new assignment to this module. Students will be able to see it once you publish it.
            </DialogDescription>
          </DialogHeader>
          <Form {...createAssignmentForm}>
            <form onSubmit={createAssignmentForm.handleSubmit(onCreateAssignment)} className="space-y-4">
              <FormField
                control={createAssignmentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Assignment title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createAssignmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Assignment description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createAssignmentForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text Assignment</SelectItem>
                        <SelectItem value="gis">GIS Assignment</SelectItem>
                        <SelectItem value="mixed">Mixed Assignment</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createAssignmentForm.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createAssignmentForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    createAssignmentForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createAssignmentMutation.isPending}>
                  {createAssignmentMutation.isPending ? 'Creating...' : 'Create Assignment'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Module Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inactive module? This will also delete all assignments and submissions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteModule}
              disabled={deleteModuleMutation.isPending}
            >
              {deleteModuleMutation.isPending ? 'Deleting...' : 'Delete Module'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}