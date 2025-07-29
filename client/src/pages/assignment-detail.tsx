import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Clock, Eye, EyeOff, Save, Trash2, AlertTriangle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';

const editAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['text', 'gis', 'mixed']),
  points: z.number().min(0, 'Points must be 0 or greater'),
  dueDate: z.string().optional(),
});

type EditAssignmentData = z.infer<typeof editAssignmentSchema>;

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['/api/assignments', assignmentId],
  });

  const { data: module } = useQuery({
    queryKey: ['/api/modules', assignment?.moduleId],
    enabled: !!assignment?.moduleId,
  });

  // Fetch missing submissions for teachers
  const { data: missingSubmissions = [] } = useQuery({
    queryKey: ['/api/assignments', assignmentId, 'missing'],
    enabled: !!assignmentId && isTeacher,
  });

  const editAssignmentForm = useForm<EditAssignmentData>({
    resolver: zodResolver(editAssignmentSchema),
    defaultValues: {
      title: assignment?.title || '',
      description: assignment?.description || '',
      type: assignment?.type || 'text',
      points: assignment?.points || 0,
      dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
    },
  });

  // Reset form when assignment data loads
  useState(() => {
    if (assignment) {
      editAssignmentForm.reset({
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        points: assignment.points,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
      });
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: EditAssignmentData) => {
      const response = await apiRequest('PUT', `/api/assignments/${assignmentId}`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Assignment updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (isPublished: boolean) => {
      const response = await apiRequest('PATCH', `/api/assignments/${assignmentId}/publish`, { isPublished });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/assignments/${assignmentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
      });
      setLocation(`/modules/${assignment?.moduleId}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete assignment',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditAssignmentData) => {
    updateAssignmentMutation.mutate(data);
  };

  const handleTogglePublish = () => {
    publishMutation.mutate(!assignment.isPublished);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
      deleteAssignmentMutation.mutate();
    }
  };

  if (isLoading || !assignment) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/modules/${assignment.moduleId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Module
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <p className="text-slate-600">
              {module?.title} • {assignment.type.toUpperCase()} Assignment
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={assignment.isPublished ? "default" : "secondary"}>
            {assignment.isPublished ? "Published" : "Unpublished"}
          </Badge>
          {isTeacher && (
            <>
              <Button
                variant={assignment.isPublished ? "default" : "outline"}
                onClick={handleTogglePublish}
                disabled={publishMutation.isPending || (!module?.isActive && !assignment.isPublished)}
                title={
                  !module?.isActive && !assignment.isPublished 
                    ? "Module must be active to publish assignments" 
                    : assignment.isPublished 
                      ? "Unpublish assignment" 
                      : "Publish assignment"
                }
              >
                {assignment.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteAssignmentMutation.isPending}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Assignment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">


          {/* Edit Form (Teacher Only) */}
          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle>Edit Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editAssignmentForm}>
                  <form onSubmit={editAssignmentForm.handleSubmit(onSubmit)} className="space-y-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    </div>
                    <Button type="submit" disabled={updateAssignmentMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateAssignmentMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}


        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-600">Due Date</span>
                  <p className="text-sm">
                    {assignment.dueDate 
                      ? new Date(assignment.dueDate).toLocaleDateString() 
                      : 'No due date set'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Points</span>
                  <p>{assignment.points}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Status</span>
                  <Badge variant={assignment.isPublished ? "default" : "secondary"}>
                    {assignment.isPublished ? "Published" : "Unpublished"}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Created</span>
                  <p className="text-sm">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Missing Submissions Section (Teacher Only) */}
          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Missing Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missingSubmissions.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-600 font-medium">All submitted!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 mb-3">
                      {missingSubmissions.length} missing:
                    </p>
                    <div className="space-y-2">
                      {missingSubmissions.map((student: any) => (
                        <div key={student.studentId} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                          <div className="text-right">
                            {student.daysOverdue !== null && student.daysOverdue > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {student.daysOverdue}d overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}