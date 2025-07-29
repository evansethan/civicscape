import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { auth } from '@/lib/auth';

export default function StudentDashboard() {
  const user = auth.getUser();
  
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['/api/modules'],
    enabled: !!user,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'submissions'],
    enabled: !!user,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'assignments'],
    enabled: !!user,
  });

  const { data: enrolledModules = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'modules'],
    enabled: !!user,
  });

  const stats = useMemo(() => {
    const gradedSubmissions = submissions.filter((s: any) => s.grade);
    return {
      completedModules: enrolledModules.length,
      assignmentsDue: assignments.filter((a: any) => 
        !a.submission || 
        (a.submission && a.submission.status !== 'graded')
      ).length,
      averageGrade: gradedSubmissions.length > 0 ? 
        gradedSubmissions.reduce((sum: number, s: any) => sum + s.grade.score, 0) / 
        gradedSubmissions.length : 0,
    };
  }, [enrolledModules.length, assignments, submissions]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
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
        <h2 className="text-2xl font-bold text-slate-900">Student Dashboard - {user?.firstName} {user?.lastName}</h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-600">Welcome back,</span>
          <span className="text-sm font-medium text-slate-900">
            {user?.firstName} {user?.lastName}
          </span>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Modules Completed</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.completedModules}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Assignments Due</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.assignmentsDue}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Average Grade</p>
                <p className="text-2xl font-semibold text-slate-900">{stats.averageGrade.toFixed(0)}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Assignments and Recent Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No assignments available</p>
            ) : (
              <div className="space-y-4">
                {assignments
                  .filter((assignment: any) => 
                    !assignment.submission || 
                    (assignment.submission && assignment.submission.status !== 'graded')
                  )
                  .slice(0, 5)
                  .map((assignment: any) => (
                    <div key={assignment.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-slate-900">{assignment.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Module: {assignment.module?.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-2">
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
                              {assignment.submission?.status === 'draft' ? 'Continue Draft' : 'Start Assignment'}
                            </Button>
                          </Link>
                        )}
                        {assignment.submission?.status === 'submitted' && (
                          <Badge variant="secondary" className="text-xs">
                            Awaiting Grade
                          </Badge>
                        )}
                        {assignment.submission?.status === 'graded' && assignment.submission?.grade && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {assignment.submission.grade.score}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Grades</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.filter((s: any) => s.grade).length === 0 ? (
              <p className="text-slate-500 text-center py-8">No grades yet</p>
            ) : (
              <div className="space-y-4">
                {submissions
                  .filter((s: any) => s.grade)
                  .slice(0, 5)
                  .map((submission: any) => (
                    <div key={submission.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{submission.assignment?.title}</p>
                        <p className="text-xs text-slate-500">
                          Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${submission.grade.score >= 90 ? 'text-emerald-600' : submission.grade.score >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>
                          {submission.grade.score}%
                        </span>
                        <p className="text-xs text-slate-500">{submission.grade.feedback}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
