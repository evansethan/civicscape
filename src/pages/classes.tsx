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
import { Label } from '@/components/ui/label';
import { Plus, BookOpen, Clock, Users, Edit, Eye, UserPlus, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Class } from '@/lib/types';

// Set expected values and error messages if violated
const requiredPositiveInt = (msg: string) =>
  z.preprocess(
    (v) => (v == null || v === '' ? undefined : v),
    z.coerce.number({ required_error: msg, invalid_type_error: msg }).int().min(1, msg)
  );

const moduleSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  weeks: requiredPositiveInt('Please enter at least 1 week'),
  lessons: requiredPositiveInt('Please enter at least 1 lesson'),
  grade_level: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.enum(['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], { required_error: 'Please select a grade level from the dropdown list' })
  ),
  objectives: z.array(z.string()).min(1, 'At least one objective is required'),
});

type ClassFormData = z.infer<typeof moduleSchema>;

export default function Classes() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [objectives, setObjectives] = useState<string[]>(['']);
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classes = [], isLoading } = useQuery<Class[]>({
    queryKey: ['/api/classes'],
    enabled: !!user && isTeacher,
    select: (data) => data.filter(cls => cls !== null && cls !== undefined)
  });

  // For students, fetch their enrolled classes
  const { data: studentClasses = [], isLoading: isStudentClassesLoading } = useQuery<any[]>({
    queryKey: ['/api/students', user?.id, 'classes'],
    enabled: !!user && !isTeacher,
  });

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ['/api/students'],
    enabled: !!user && isTeacher,
  });

  const { data: enrolledStudents = [] } = useQuery<any[]>({
    queryKey: ['/api/classes', selectedClass?.id, 'students'],
    enabled: !!selectedClass,
  });

  const form = useForm<ClassFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      weeks: 1,
      lessons: 1,
      grade_level: '',
      objectives: [''],
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const response = await apiRequest('POST', '/api/classes', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setIsCreateDialogOpen(false);
      form.reset();
      setObjectives(['']);
      toast({
        title: 'Class created',
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
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) => {
      const response = await apiRequest('POST', `/api/classes/${classId}/enroll`, { studentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClass?.id, 'students'] });
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
    mutationFn: async ({ studentId, classId }: { studentId: number; classId: number }) => {
      const response = await apiRequest('DELETE', `/api/classes/${classId}/students/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', selectedClass?.id, 'students'] });
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

  const enrollByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/enroll-by-code', { code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setIsJoinDialogOpen(false);
      setEnrollmentCode('');
      toast({
        title: 'Enrolled successfully!',
        description: 'You have been added to the class as a co-teacher.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Enrollment failed',
        description: error.message || 'Please check the code and try again.',
        variant: 'destructive',
      });
    },
  });

  const handleEnrollByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollmentCode.trim()) {
      enrollByCodeMutation.mutate(enrollmentCode.trim().toUpperCase());
    }
  };

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

  const onSubmit = (data: ClassFormData) => {
    createClassMutation.mutate({
      ...data,
      objectives: objectives.filter(obj => obj.trim() !== ''),
    });
  };

  const handleEnrollStudent = (studentId: number) => {
    if (selectedClass) {
      enrollStudentMutation.mutate({ studentId, classId: selectedClass.id });
    }
  };

  const handleRemoveStudent = (studentId: number) => {
    if (selectedClass) {
      removeStudentMutation.mutate({ studentId, classId: selectedClass.id });
    }
  };

  const getAvailableStudents = () => {
    if (!Array.isArray(enrolledStudents) || !Array.isArray(students)) {
      return [];
    }
    const enrolledStudentIds = enrolledStudents.map((es: any) => es.studentId);
    return students.filter((student: any) => !enrolledStudentIds.includes(student.id));
  };

  if (isLoading || isStudentClassesLoading) {
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
    <div className="p-6 bluebox m-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Classes</h2>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button className="edugis-btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Join a Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Class as a Co-Teacher</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEnrollByCode} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="enrollmentCode">Class Code</Label>
                    <Input
                      id="enrollmentCode"
                      value={enrollmentCode}
                      onChange={(e) => setEnrollmentCode(e.target.value)}
                      placeholder="Enter 6-character class code"
                      maxLength={6}
                      className="uppercase"
                      style={{ textTransform: 'uppercase' }}
                    />
                    <p className="text-md text-slate-500">
                      Enter the invite code from the primary teacher to join their class.
                    </p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button className="edugis-btn-secondary" type="button" variant="outline" onClick={() => setIsJoinDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button className="edugis-btn-primary" type="submit" disabled={enrollByCodeMutation.isPending || !enrollmentCode.trim()}>
                      {enrollByCodeMutation.isPending ? 'Joining...' : 'Join Class'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="edugis-btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class Title</FormLabel>
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weeks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weeks</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Enter number of weeks"
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
                          name="lessons"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lessons per Week</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Enter number of lessons"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="grade_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select grade level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="K">Kindergarten</SelectItem>
                                <SelectItem value="1">1st Grade</SelectItem>
                                <SelectItem value="2">2nd Grade</SelectItem>
                                <SelectItem value="3">3rd Grade</SelectItem>
                                <SelectItem value="4">4th Grade</SelectItem>
                                <SelectItem value="5">5th Grade</SelectItem>
                                <SelectItem value="6">6th Grade</SelectItem>
                                <SelectItem value="7">7th Grade</SelectItem>
                                <SelectItem value="8">8th Grade</SelectItem>
                                <SelectItem value="9">9th Grade</SelectItem>
                                <SelectItem value="10">10th Grade</SelectItem>
                                <SelectItem value="11">11th Grade</SelectItem>
                                <SelectItem value="12">12th Grade</SelectItem>
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
                        disabled={createClassMutation.isPending}
                      >
                        {createClassMutation.isPending ? 'Creating...' : 'Create Class'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Display different content for teachers vs students */}
      {isTeacher ? (
        // Teacher view - show all classes they created
        classes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No classes yet</h3>
              <p className="text-slate-500 mb-4">Create your first class to get started.</p>
              <Button className="edugis-btn-primary" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((module) => (
              <Link key={module.id} href={`/classes/${module.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-sm text-slate-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {module.weeks} weeks
                          </div>
                            <Badge variant="secondary" className="classtags">
                              Grade Level: {((module.grade_level ?? '').trim() || 'Not specified')}
                            </Badge>
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
        )
      ) : (
        // Student view - show enrolled classes
        studentClasses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No enrolled classes</h3>
              <p className="text-slate-500">You are not currently enrolled in any classes.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studentClasses.map((enrollment) => {
              const classData = enrollment.class;
              return (
                <Link key={enrollment.id} href={`/classes/${classData.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg font-purple">{classData.title}</CardTitle>
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center text-sm text-slate-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {classData.weeks} weeks
                            </div>
                            <Badge variant="secondary" className="classtags">{classData.grade_level}</Badge>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Enrolled
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-md text-slate-600 mb-4">{classData.description}</p>
                      
                      <div className="mb-4">
                        <h4 className="text-md font-bold text-slate-700 mb-2">Learning Objectives:</h4>
                        <ul className="text-md text-slate-600 space-y-1">
                          {classData.objectives && classData.objectives.length > 0 ? (
                            <>
                              {classData.objectives.slice(0, 3).map((objective: string, index: number) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-slate-400 mr-2">•</span>
                                  {objective}
                                </li>
                              ))}
                              {classData.objectives.length > 3 && (
                                <li className="text-slate-500 text-md">
                                  +{classData.objectives.length - 3} more objectives
                                </li>
                              )}
                            </>
                          ) : (
                            <li className="text-slate-500 text-md">No objectives defined</li>
                          )}
                        </ul>
                      </div>
{/* 
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                      </div> */}

                      <center><button className="yellow_button mt-5">View Lesson</button></center>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )
      )}

      {/* Student Enrollment Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Students to {selectedClass?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Currently enrolled students */}
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-3">Currently Enrolled Students</h3>
              {!Array.isArray(enrolledStudents) || enrolledStudents.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center border border-dashed rounded">
                  No students enrolled yet
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Array.isArray(enrolledStudents) && enrolledStudents.map((enrollment: any) => (
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
