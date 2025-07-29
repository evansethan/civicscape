import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, UserPlus, BookOpen, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';

export default function StudentDetail() {
  const { studentId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const currentUser = auth.getUser();

  const { data: student, isLoading } = useQuery({
    queryKey: ['/api/students', studentId],
  });

  const { data: allModules = [] } = useQuery({
    queryKey: ['/api/modules'],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['/api/students', studentId, 'enrollments'],
    enabled: !!studentId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/students', studentId, 'submissions'],
    enabled: !!studentId,
  });

  const enrollMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const response = await apiRequest('POST', `/api/modules/${moduleId}/enroll`, {
        studentId: parseInt(studentId!),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Student enrolled successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
    },
    onError: () => {
      toast({ title: 'Failed to enroll student', variant: 'destructive' });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      const response = await apiRequest('DELETE', `/api/modules/${moduleId}/students/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Student unenrolled successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
    },
    onError: () => {
      toast({ title: 'Failed to unenroll student', variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!student) {
    return <div className="p-6">Student not found</div>;
  }

  const enrolledModuleIds = enrollments.map((e: any) => e.moduleId);
  
  // Separate modules by teacher ownership
  const teacherModules = allModules.filter((m: any) => m.teacherId === currentUser?.id);
  const otherModules = enrollments.filter((e: any) => !teacherModules.some((m: any) => m.id === e.moduleId));
  
  // Only show teacher's own modules for enrollment
  const availableModules = teacherModules.filter((m: any) => !enrolledModuleIds.includes(m.id) && m.isActive);
  
  // Filter enrollments to separate teacher's modules from others
  const teacherEnrollments = enrollments.filter((e: any) => teacherModules.some((m: any) => m.id === e.moduleId));
  const otherEnrollments = enrollments.filter((e: any) => !teacherModules.some((m: any) => m.id === e.moduleId));
  
  // Filter out draft submissions
  const submittedSubmissions = submissions.filter((s: any) => s.status !== 'draft');
  
  // Calculate average grade
  const gradedSubmissions = submittedSubmissions.filter((s: any) => s.grade?.score !== null && s.grade?.score !== undefined);
  const averageGrade = gradedSubmissions.length > 0 
    ? gradedSubmissions.reduce((sum: number, s: any) => {
        const percentage = (s.grade.score / (s.assignment?.points || s.points || 1)) * 100;
        return sum + percentage;
      }, 0) / gradedSubmissions.length
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/students')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-slate-600">{student.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info & Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-slate-600">Username</span>
                    <p>{student.username}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Email</span>
                    <p>{student.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Full Name</span>
                    <p>{student.firstName} {student.lastName}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-slate-600">Enrolled Modules</span>
                    <p>{enrollments.length}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Total Submissions</span>
                    <p>{submittedSubmissions.length}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Average Grade</span>
                    <p>
                      {averageGrade !== null 
                        ? `${averageGrade.toFixed(1)}%` 
                        : 'No grades yet'
                      }
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={() => window.location.href = `mailto:${student.email}`}
                      className="w-full"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Submissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {submittedSubmissions.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No submissions yet</p>
              ) : (
                <div className="space-y-3">
                  {submittedSubmissions.slice(0, 10).map((submission: any) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex-1">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setLocation(`/grading/${submission.id}`);
                          }}
                          className="text-left hover:text-blue-600 transition-colors w-full"
                        >
                          <p className="font-medium text-sm hover:underline text-left">
                            {submission.assignment?.title || submission.assignmentTitle || 'Assignment'}
                          </p>
                        </button>
                        <p className="text-xs text-slate-500">
                          {submission.module?.title || submission.moduleTitle || 'Module'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {submission.grade?.score !== null && submission.grade?.score !== undefined && (
                          <span className="text-sm font-medium">
                            {submission.grade.score}/{submission.assignment?.points || submission.points || 0}
                          </span>
                        )}
                        <Badge className={`text-xs ${getStatusColor(submission.status)}`}>
                          {submission.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Teacher's Modules */}
          {teacherEnrollments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Your Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teacherEnrollments.map((enrollment: any) => (
                    <div key={enrollment.moduleId} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div>
                        <p className="text-sm font-medium">{enrollment.module.title}</p>
                        <p className="text-xs text-slate-500">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unenrollMutation.mutate(enrollment.moduleId)}
                        disabled={unenrollMutation.isPending}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Other Teachers' Modules */}
          {otherEnrollments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Other Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {otherEnrollments.map((enrollment: any) => (
                    <div key={enrollment.moduleId} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div>
                        <p className="text-sm font-medium">{enrollment.module.title}</p>
                        <p className="text-xs text-slate-500">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">Managed by other teacher</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Read-only
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Modules */}
          {availableModules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Enroll in Modules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableModules.map((module: any) => (
                    <div key={module.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div>
                        <p className="text-sm font-medium">{module.title}</p>
                        <p className="text-xs text-slate-500">{module.description}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => enrollMutation.mutate(module.id)}
                        disabled={enrollMutation.isPending}
                        className="text-xs"
                      >
                        Enroll
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}