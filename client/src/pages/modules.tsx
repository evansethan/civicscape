import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Book, Clock, Users, Edit, Eye, UserPlus } from 'lucide-react';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Module } from '@/lib/types';

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  duration: z.number().min(1, 'Duration must be at least 1 week'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  objectives: z.array(z.string()).min(1, 'At least one objective is required'),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function Modules() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [objectives, setObjectives] = useState<string[]>(['']);
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: modules = [], isLoading } = useQuery<Module[]>({
    queryKey: ['/api/modules'],
    enabled: !!user,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    enabled: !!user && isTeacher,
  });

  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ['/api/modules', selectedModule?.id, 'students'],
    enabled: !!selectedModule,
  });

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      duration: 1,
      difficulty: 'Beginner',
      objectives: [''],
    },
  });

  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const response = await apiRequest('POST', '/api/modules', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      setIsCreateDialogOpen(false);
      form.reset();
      setObjectives(['']);
      toast({
        title: 'Module created',
        description: 'Your module has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create module',
        variant: 'destructive',
      });
    },
  });

  const enrollStudentMutation = useMutation({
    mutationFn: async ({ studentId, moduleId }: { studentId: number; moduleId: number }) => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/enroll`, { studentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', selectedModule?.id, 'students'] });
      toast({
        title: 'Student enrolled',
        description: 'Student has been successfully enrolled in the module.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll student',
        variant: 'destructive',
      });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async ({ studentId, moduleId }: { studentId: number; moduleId: number }) => {
      const response = await apiRequest('DELETE', `/api/modules/${moduleId}/students/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/modules', selectedModule?.id, 'students'] });
      toast({
        title: 'Student removed',
        description: 'Student has been removed from the module.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove student',
        variant: 'destructive',
      });
    },
  });

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const updateObjective = (index: number, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = value;
    setObjectives(newObjectives);
    form.setValue('objectives', newObjectives.filter(obj => obj.trim() !== ''));
  };

  const removeObjective = (index: number) => {
    if (objectives.length > 1) {
      const newObjectives = objectives.filter((_, i) => i !== index);
      setObjectives(newObjectives);
      form.setValue('objectives', newObjectives.filter(obj => obj.trim() !== ''));
    }
  };

  const onSubmit = (data: ModuleFormData) => {
    createModuleMutation.mutate({
      ...data,
      objectives: objectives.filter(obj => obj.trim() !== ''),
    });
  };

  const handleEnrollStudent = (studentId: number) => {
    if (selectedModule) {
      enrollStudentMutation.mutate({ studentId, moduleId: selectedModule.id });
    }
  };

  const handleRemoveStudent = (studentId: number) => {
    if (selectedModule) {
      removeStudentMutation.mutate({ studentId, moduleId: selectedModule.id });
    }
  };

  const getAvailableStudents = () => {
    const enrolledStudentIds = enrolledStudents.map((es: any) => es.studentId);
    return students.filter((student: any) => !enrolledStudentIds.includes(student.id));
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Modules</h2>
        {isTeacher && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="edugis-btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Module
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Module</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Module Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter module title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter module description"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (weeks)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              placeholder="4"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
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
                  </div>

                  <div>
                    <FormLabel>Learning Objectives</FormLabel>
                    <div className="space-y-2 mt-2">
                      {objectives.map((objective, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Input
                            placeholder={`Learning objective ${index + 1}`}
                            value={objective}
                            onChange={(e) => updateObjective(index, e.target.value)}
                          />
                          {objectives.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeObjective(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addObjective}
                        className="text-primary"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Another Objective
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="edugis-btn-primary"
                      disabled={createModuleMutation.isPending}
                    >
                      {createModuleMutation.isPending ? 'Creating...' : 'Create Module'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Book className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No modules yet</h3>
            <p className="text-slate-500 mb-4">
              {isTeacher ? 'Create your first module to get started.' : 'No modules available yet.'}
            </p>
            {isTeacher && (
              <Button className="edugis-btn-primary" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Module
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Link key={module.id} href={`/modules/${module.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-sm text-slate-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {module.duration} weeks
                        </div>
                        <Badge variant="secondary">{module.difficulty}</Badge>
                      </div>
                    </div>
                    <Badge className={`edugis-status-${module.isActive ? 'active' : 'draft'}`}>
                      {module.isActive ? 'Active' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">{module.description}</p>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Learning Objectives:</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {module.objectives && module.objectives.length > 0 ? (
                        <>
                          {module.objectives.slice(0, 3).map((objective, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-slate-400 mr-2">•</span>
                              {objective}
                            </li>
                          ))}
                          {module.objectives.length > 3 && (
                            <li className="text-slate-500 text-xs">
                              +{module.objectives.length - 3} more objectives
                            </li>
                          )}
                        </>
                      ) : (
                        <li className="text-slate-500 text-xs">No objectives defined</li>
                      )}
                    </ul>
                  </div>

                  <div className="flex items-center text-sm text-slate-500">
                    <Users className="h-4 w-4 mr-1" />
                    {(module as any).enrollmentCount || 0} {((module as any).enrollmentCount || 0) === 1 ? 'student' : 'students'}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Student Enrollment Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Students to {selectedModule?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Currently enrolled students */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Currently Enrolled Students</h3>
              {enrolledStudents.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center border border-dashed rounded">
                  No students enrolled yet
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {enrolledStudents.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {enrollment.student.firstName} {enrollment.student.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{enrollment.student.email}</p>
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

            {/* Available students to enroll */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Available Students</h3>
              {getAvailableStudents().length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center border border-dashed rounded">
                  All students are already enrolled
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {getAvailableStudents().map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {student.firstName} {student.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEnrollStudent(student.id)}
                        disabled={enrollStudentMutation.isPending}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Enroll
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
