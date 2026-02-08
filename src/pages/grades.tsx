import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Search, Filter, FileText, Map, Clock, Star } from 'lucide-react';
import { auth } from '@/lib/auth';

export default function Grades() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [, setLocation] = useLocation();
  const user = auth.getUser();

  // For teachers, get all recent submissions. For students, get their own submissions
  const { data: submissions, isLoading } = useQuery({
    queryKey: user?.role === 'teacher' ? ['/api/submissions/recent'] : ['/api/students', user?.id, 'submissions'],
  });

  const filteredSubmissions = useMemo(() => {
    if (!submissions) return [];
    
    return submissions.filter((submission: any) => {
      const matchesSearch = !searchTerm || 
        submission.student?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.student?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        submission.assignment?.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Handle "assigned" status filter (assignments with no submissions)
      let matchesStatus = statusFilter === 'all';
      if (statusFilter === 'assigned') {
        // This filter should be handled differently - it needs to show assignments without submissions
        matchesStatus = false; // For now, exclude from submissions list
      } else {
        matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [submissions, searchTerm, statusFilter]);

  const getStatusColor = useMemo(() => (status: string) => {
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
  }, []);

  const getAssignmentTypeIcon = useMemo(() => (type: string) => {
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
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-6 w-6" />
          <h1 className="text-2xl font-bold">
            {user?.role === 'teacher' ? 'Grade Management' : 'My Grades'}
          </h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Grade Management</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="search">Search submissions</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by student name or activity..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Filter by status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="grid gap-4">
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((submission: any, index: number) => (
            <Card key={`${submission.id}-${submission.assignmentId}-${index}`} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                      {getAssignmentTypeIcon(submission.assignment?.type || 'text')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {submission.assignment?.title || 'Untitled Activity'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {user?.role === 'teacher' && (
                          <span>
                            Student: {submission.student?.firstName} {submission.student?.lastName}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Submitted {submission.submittedAt ? 
                            new Date(submission.submittedAt).toLocaleDateString() : 
                            'Not submitted'
                          }
                        </div>
                        {submission.assignment?.points && (
                          <span>Worth {submission.assignment.points} points</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                    {submission.grade && (
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Star className="h-4 w-4 text-yellow-500" />
                        Graded
                      </div>
                    )}
                    {user?.role === 'teacher' && submission.status === 'submitted' && (
                      <Button size="sm" onClick={() => setLocation(`/grading/${submission.id}`)}>
                        Grade Submission
                      </Button>
                    )}
                    {user?.role === 'teacher' && submission.status === 'graded' && (
                      <Button size="sm" variant="outline" onClick={() => setLocation(`/grading/${submission.id}`)}>
                        Edit Grade
                      </Button>
                    )}
                    {user?.role === 'student' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/submissions/${submission.id}`)}
                      >
                        View Details
                      </Button>
                    )}

                  </div>
                </div>
                
                {submission.writtenResponse && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium">Written Response:</Label>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {submission.writtenResponse}
                    </p>
                  </div>
                )}
                
                {submission.mapData && (
                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium">Map Submission:</Label>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Map className="h-4 w-4" />
                      Interactive map data included
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6 text-center">
              <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters.'
                  : 'Student submissions will appear here once they start submitting activities.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}