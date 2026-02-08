import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserPlus, BookOpen, FileText, Calendar } from 'lucide-react';
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

  const { data: allClasses = [] } = useQuery({
    queryKey: ['/api/classes'],
  });

  const { data: enrollmentsRaw = [] } = useQuery({
    queryKey: ['/api/students', studentId, 'enrollments'],
    enabled: !!studentId,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/students', studentId, 'submissions'],
    enabled: !!studentId,
  });

  // Manually join enrollments with their class info, as the API doesn't nest it.
  const enrollments = enrollmentsRaw.map((e: any) => ({
    ...e,
    module: allClasses.find((m: any) => m.id === e.classId),
  })).filter((e:any) => e.module);

  const enrollMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await apiRequest('POST', `/api/classes/${classId}/enroll`, {
        studentId: parseInt(studentId!),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Student enrolled successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: () => {
      toast({ title: 'Failed to enroll student', variant: 'destructive' });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (classId: number) => {
      const response = await apiRequest('DELETE', `/api/classes/${classId}/students/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Student unenrolled successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/students', studentId, 'enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
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

  const enrolledClassIds = enrollments.map((e: any) => e.classId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'graded':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Separate classes by teacher ownership
  const teacherClasses = allClasses.filter((m: any) => m.teacherId === currentUser?.id);
  
  // Only show teacher's own classes for enrollment
  const availableClasses = teacherClasses.filter((m: any) => !enrolledClassIds.includes(m.id) && m.isActive);
  
  // Filter enrollments to separate teacher's classes from others
  const teacherEnrollments = enrollments.filter((e: any) => teacherClasses.some((m: any) => m.id === e.classId));
  const otherEnrollments = enrollments.filter((e: any) => !teacherClasses.some((m: any) => m.id === e.classId));
  
  // Filter out draft submissions
  const submittedSubmissions = submissions.filter((s: any) => s.status !== 'draft');
  




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
                    <span className="text-sm font-medium text-slate-600">Enrolled Classes</span>
                    <p>{enrollments.length}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Total Submissions</span>
                    <p>{submittedSubmissions.length}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-600">Graded Activities</span>
                    <p>{submissions.filter((s: any) => s.status === 'graded').length}</p>
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
                            {submission.assignment?.title || submission.assignmentTitle || 'Activity'}
                          </p>
                        </button>
                        <p className="text-xs text-slate-500">
                          {submission.module?.title || submission.moduleTitle || 'Class'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">

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
          {/* Teacher's Classs */}
          {teacherEnrollments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Your Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teacherEnrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div>
                        <p className="text-sm font-medium">{enrollment.module.title}</p>
                        <p className="text-xs text-slate-500">
                          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unenrollMutation.mutate(enrollment.classId)}
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

          {/* Other Teachers' Classs */}
          {otherEnrollments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Other Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {otherEnrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
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

          {/* Available Classs */}
          {availableClasses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Enroll in Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableClasses.map((module: any) => (
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