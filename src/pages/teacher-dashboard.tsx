import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Users, FileText, Map, Clock, GraduationCap, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { auth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function TeacherDashboard() {
  const user = auth.getUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  
  const enrollByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest('POST', '/api/enroll-by-code', { code });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setEnrollDialogOpen(false);
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
  
  // const { data: classes = [], isLoading: classesLoading } = useQuery({
  //   queryKey: ['/api/classes'],
  //   enabled: !!user,
  //   staleTime: 3 * 60 * 1000, // 3 minutes
  // });

  // const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
  //   queryKey: ['/api/submissions/recent'],
  //   enabled: !!user,
  //   staleTime: 30 * 1000, // 30 seconds
  // });

  // const { data: students = [] } = useQuery({
  //   queryKey: ['/api/students'],
  //   enabled: !!user,
  //   staleTime: 10 * 60 * 1000, // 10 minutes
  // });

  // const pendingSubmissions = useMemo(() => 
  //   submissions.filter((s: any) => s.status === 'submitted'), 
  //   [submissions]
  // );

  // const stats = useMemo(() => {
  //   const gradedSubmissions = submissions.filter((s: any) => s.status === 'graded');
    
  //   return {
  //     totalClasses: classes.length,
  //     totalStudents: students.length,
  //     pendingGrades: pendingSubmissions.length,
  //     completedGrades: gradedSubmissions.length,
  //   };
  // }, [classes.length, students.length, pendingSubmissions.length, submissions]);

  // const getAssignmentTypeIcon = useMemo(() => (type: string) => {
  //   switch (type) {
  //     case 'gis':
  //       return <Map className="h-4 w-4" />;
  //     case 'text':
  //       return <FileText className="h-4 w-4" />;
  //     case 'mixed':
  //       return <div className="flex gap-1"><FileText className="h-3 w-3" /><Map className="h-3 w-3" /></div>;
  //     default:
  //       return <FileText className="h-4 w-4" />;
  //   }
  // }, []);

  // if (classesLoading || submissionsLoading) {
  //   return (
  //     <div className="p-6">
  //       <div className="animate-pulse">
  //         <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
  //         <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  //           {[1, 2, 3, 4].map((i) => (
  //             <div key={i} className="h-32 bg-slate-200 rounded"></div>
  //           ))}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        {/* <h2 className="text-2xl font-bold text-slate-900">Teacher Dashboard - {user?.firstName} {user?.lastName}</h2> */}
        <h2 className="text-2xl font-bold text-slate-900">Welcome to the CivicScape Research Study</h2>
        <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
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

      {/* Stats Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Book className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Classes</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totalClasses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Students</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Pending Grades</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.pendingGrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Completed Grades</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.completedGrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Recent Submissions Needing Grading */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          {/* <CardTitle>Submissions Needing Grading</CardTitle>
          <Link href="/grades">
            <Button variant="outline" size="sm">View All</Button>
          </Link> */}
        </CardHeader>
        {/* <CardContent>
          {pendingSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
              <p className="text-slate-500">No submissions waiting for grades.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.slice(0, 5).map((submission: any) => (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      {getAssignmentTypeIcon(submission.assignment?.type || 'text')}
                    </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {submission.student?.firstName} {submission.student?.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{submission.assignment?.title}</p>
                        <p className="text-xs text-slate-400">
                          Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{submission.status}</Badge>
                      <Link href={`/grading/${submission.id}`}>
                        <Button size="sm">Grade</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </CardContent> */}
        <CardContent>
          <p>Today you will use our AI Copilot to create a Civics or Geospatial curriculum and lesson materials for your class. Click the button below to get started :)<br/>
          <br/>
          <center>
            <Link href="/ai-copilot">
              <Button type="button" className="edugis-btn-primary">
                Get Started
              </Button>
            </Link>
          </center>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
