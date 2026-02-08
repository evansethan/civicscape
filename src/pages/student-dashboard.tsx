import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Plus } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function StudentDashboard() {
  const user = auth.getUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['/api/classes'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'submissions'],
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'assignments'],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: enrolledClasses = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'classes'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const stats = useMemo(() => {
    const gradedSubmissions = submissions.filter((s: any) => s.grade);
    return {
      averageGrade: gradedSubmissions.length > 0 ? 
        gradedSubmissions.reduce((sum: number, s: any) => sum + s.grade.score, 0) / 
        gradedSubmissions.length : 0,
    };
  }, [submissions]);

  const enrollByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/enroll-by-code', { code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'assignments'] });
      setEnrollDialogOpen(false);
      setEnrollmentCode('');
      toast({
        title: 'Enrolled successfully!',
        description: 'You have been enrolled in the class.',
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user?.firstName} {user?.lastName}</h2>
        <div className="flex items-center space-x-3">
          <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
            <DialogTrigger asChild>
              {/* <Button className="edugis-btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button> */}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Class</DialogTitle>
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
                    Ask your teacher for the class enrollment code
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <Button className="edugis-btn-secondary" type="button" variant="outline" onClick={() => setEnrollDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="edugis-btn-primary" type="submit" disabled={enrollByCodeMutation.isPending || !enrollmentCode.trim()}>
                    {enrollByCodeMutation.isPending ? 'Joining...' : 'Join Class'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        {/* My Classes Section */}
        <Card className="purplebox mb-10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>My Classes</CardTitle>
            <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="edugis-btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Class
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardHeader>
          <CardContent>
            {enrolledClasses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4 z-index-1">No enrolled classes</p>
                <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="edugis-btn-primary z-index-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Join Your First Class
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-2 internalcontent_container">
                {enrolledClasses.map((enrollment: any) => (
                  <Link key={enrollment.id} href={`/classes/${enrollment.classId}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200 hover:border-slate-300">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="class_name">{enrollment.class?.title}</div>
                            <div className="class_description">{enrollment.class?.description}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 classtags_container">
                              <span className="classtags">Grade Level: {enrollment.class?.grade_level || 'Not specified'}</span>
                              <span className="classtags">{enrollment.class?.weeks} Week(s)</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs yellow_button">
                            View Lesson
                          </Badge>
                        </div>
                        
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <div className="purplebox_bottomright"><img src="/images/purple_bottomrightbg.png" alt="Books" /></div>
        </Card>

      {/* Current Assignments and Recent Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="yellowbox">
          <CardHeader>
            <CardTitle>Current Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-slate-500 text-center py-8 z-index-1">No activities available</p>
            ) : (
              <div className="space-y-4">
                {assignments
                  .filter((assignment: any) => 
                    !assignment.submission || 
                    (assignment.submission && assignment.submission.status !== 'graded')
                  )
                  .slice(0, 5)
                  .map((assignment: any) => (
                    <div key={assignment.id} className="border border-slate-200 rounded-lg p-4 white_innerbox shadow-sm internalcontent_container">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900">{assignment.title}</h4>
                          <p className="text-md text-slate-500 mt-1">
                            Class: {assignment.class?.title}
                          </p>
                          <p className="text-md text-slate-600 mt-2">
                            {assignment.description}
                          </p>
                        </div>
                        <Badge variant={
                          assignment.submission?.status === 'graded' ? "default" : 
                          assignment.submission?.status === 'submitted' ? "secondary" : 
                          assignment.submission?.status === 'draft' ? "outline" : "outline"
                        }>
                          {assignment.submission?.status === 'graded' ? 'Graded' : 
                           assignment.submission?.status === 'submitted' ? 'Submitted' : 
                           assignment.submission?.status === 'draft' ? 'Draft Saved' : 'Assigned'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-500">
                          Due: {assignment.dueDate 
                            ? new Date(assignment.dueDate).toLocaleDateString() 
                            : 'No due date'
                          }
                        </span>
                        {(!assignment.submission || assignment.submission?.status === 'draft') && (
                          <Link href={`/assignments/${assignment.id}/submit`}>
                            <Button size="sm" className="edugis-btn-primary">
                              {assignment.submission?.status === 'draft' ? 'Continue Draft' : 'Start Activity'}
                            </Button>
                          </Link>
                        )}
                        {assignment.submission?.status === 'submitted' && (
                          <Badge variant="secondary" className="text-xs classtags">
                            Awaiting Grade
                          </Badge>
                        )}
                        {assignment.submission?.status === 'graded' && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            Graded
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
          <div className="yellowbox_bottomright"><img src="/images/yellow_bottomrightbg.png" alt="Books" /></div>
        </Card>

        <Card className="bluebox recentgrades_container">
          <CardHeader>
            <CardTitle>Recent Grades</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.filter((s: any) => s.grade).length === 0 ? (
              <p className="text-slate-500 text-center py-8 z-index-1">No grades yet</p>
            ) : (
              <div className="space-y-4">
                {submissions
                  .filter((s: any) => s.grade)
                  .slice(0, 5)
                  .map((submission: any) => (
                    <div 
                      key={submission.id} 
                      className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-slate-50 white_innerbox shadow-sm internalcontent_container"
                      onClick={() => setLocation(`/submissions/${submission.id}`)}
                    >
                      <div>
                        <p className="text-lg font-bold text-slate-900">{submission.assignment?.title}</p>
                        <p className="text-md text-slate-500">
                          Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          Graded
                        </Badge>
                        {submission.grade.feedback && (
                          <p className="text-xs text-slate-500 mt-1">{submission.grade.feedback}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
          <div className="yellowbox_bottomright"><img src="/images/blue_bottomrightbg.png" alt="Books" /></div>

        </Card>


      </div>
    </div>
  );
}
