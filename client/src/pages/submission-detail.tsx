import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Map as MapIcon, Download, Star, Edit3, MessageSquare, Clock, ExternalLink } from 'lucide-react';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function SubmissionDetail() {
  const { submissionId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const user = auth.getUser();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');

  const { data: submission, isLoading } = useQuery({
    queryKey: ['/api/submissions', submissionId],
    enabled: !!submissionId,
  }) as { data: any, isLoading: boolean };

  const { data: comments = [] } = useQuery({
    queryKey: [`/api/submissions/${submissionId}/comments`],
    enabled: !!submissionId,
  }) as { data: any[] };

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('POST', `/api/submissions/${submissionId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${submissionId}/comments`] });
      setNewComment('');
      toast({ title: "Comment added", description: "Your comment has been posted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" });
    }
  });

  const resubmitMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.assignmentId) return;
      
      // Create form data to handle file attachments
      const formData = new FormData();
      formData.append('writtenResponse', submission.writtenResponse || '');
      formData.append('status', 'draft');
      
      // Copy attachments from previous submission
      if (submission.attachments && Array.isArray(submission.attachments)) {
        submission.attachments.forEach((attachment) => {
          if (typeof attachment === 'string') {
            formData.append('existingAttachments', attachment);
          } else if (attachment && typeof attachment === 'object' && attachment.name) {
            formData.append('existingAttachments', attachment.name);
          }
        });
      }

      const response = await fetch(`/api/assignments/${submission.assignmentId}/submissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create draft');
      }

      return response.json();
    },
    onSuccess: (newSubmission) => {
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments', submission.assignmentId, 'submissions'] });
      toast({ 
        title: "Draft created", 
        description: "You can now edit and resubmit your activity." 
      });
      setLocation(`/assignments/${submission.assignmentId}/submit`);
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create resubmission draft.", 
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Submission not found</h2>
          <p className="text-slate-600 mb-4">The submission you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/grades')}>
            Back to Grades
          </Button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/grades')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Grades
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {submission.assignment?.title}
          </h1>
          <p className="text-slate-600">Submission Details</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getStatusColor(submission.status)}>
            {submission.status}
          </Badge>
          {user?.role === 'student' && (submission.status === 'submitted' || submission.status === 'graded') && (
            <Button 
              onClick={() => resubmitMutation.mutate()}
              disabled={resubmitMutation.isPending}
              variant={submission.status === 'graded' ? 'default' : 'outline'}
              size="sm"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {resubmitMutation.isPending ? 'Creating...' : 'Resubmit'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Activity Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-600">Description</label>
                  <p className="text-slate-900">{submission.assignment?.description || 'No description provided'}</p>
                </div>

                {/* Selected Maps Display */}
                {submission.assignment?.selectedMaps && submission.assignment.selectedMaps.length > 0 && (
                  <div className="border-t pt-3">
                    <label className="text-sm font-medium text-slate-600 flex items-center gap-2 mb-3">
                      <MapIcon className="h-4 w-4" />
                      ArcGIS Maps ({submission.assignment.selectedMaps.length})
                    </label>
                    <div className="space-y-3">
                      {submission.assignment.selectedMaps.map((map: any) => (
                        <a
                          key={map.id}
                          href={`https://www.arcgis.com/apps/mapviewer/index.html?webmap=${map.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            {map.thumbnailUrl && (
                              <img
                                src={map.thumbnailUrl}
                                alt={map.title}
                                className="w-12 h-12 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 truncate">
                                {map.title}
                              </p>
                              <p className="text-xs text-slate-500">Click to open</p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-slate-600">Type</label>
                  <p className="text-slate-900 capitalize">{submission.assignment?.type || 'text'}</p>
                </div>
                {submission.assignment?.dueDate && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Due Date</label>
                    <p className="text-slate-900">
                      {new Date(submission.assignment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity Files */}
          {submission.assignment?.attachments && Array.isArray(submission.assignment.attachments) && submission.assignment.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {submission.assignment.attachments.map((attachment: any, index: number) => {
                    // Handle both string paths and file objects
                    let filename: string;
                    let fileUrl: string;
                    
                    if (typeof attachment === 'string') {
                      filename = attachment.includes('/') ? attachment.split('/').pop() || `File ${index + 1}` : attachment;
                      fileUrl = attachment.includes('/') ? `/api/files/${attachment.split('/').pop()}` : `/api/files/${attachment}`;
                    } else if (attachment && typeof attachment === 'object') {
                      // Handle file objects with name, id, etc.
                      filename = attachment.name || attachment.filename || `File ${index + 1}`;
                      fileUrl = `/api/files/${attachment.id || attachment.name || attachment.filename}`;
                    } else {
                      filename = `File ${index + 1}`;
                      fileUrl = '#';
                    }
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {filename}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Written Response */}
          {submission.writtenResponse && (
            <Card>
              <CardHeader>
                <CardTitle>Written Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-slate-900 whitespace-pre-wrap">{submission.writtenResponse}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Data */}
          {submission.mapData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Map Submission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-slate-600">
                  <Map className="h-4 w-4" />
                  <span>Interactive map data included in submission</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submission Files */}
          {submission.attachments && Array.isArray(submission.attachments) && submission.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Submitted Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {submission.attachments.map((attachment: any, index: number) => {
                    // Handle both string paths and file objects
                    let filename: string;
                    let fileUrl: string;
                    
                    if (typeof attachment === 'string') {
                      filename = attachment.includes('/') ? attachment.split('/').pop() || `File ${index + 1}` : attachment;
                      fileUrl = attachment.includes('/') ? `/api/files/${attachment.split('/').pop()}` : `/api/files/${attachment}`;
                    } else if (attachment && typeof attachment === 'object') {
                      // Handle file objects with name, id, etc.
                      filename = attachment.name || attachment.filename || `File ${index + 1}`;
                      fileUrl = `/api/files/${attachment.id || attachment.name || attachment.filename}`;
                    } else {
                      filename = `File ${index + 1}`;
                      fileUrl = '#';
                    }
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-900 truncate">
                            {filename}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" asChild>
                            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submission Info */}
          <Card>
            <CardHeader>
              <CardTitle>Submission Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-600">Submitted</label>
                <p className="text-slate-900">
                  {submission.submittedAt ? 
                    new Date(submission.submittedAt).toLocaleDateString() : 
                    'Not yet submitted'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Status</label>
                <Badge className={getStatusColor(submission.status)}>
                  {submission.status}
                </Badge>
              </div>
              {user?.role === 'student' && (submission.status === 'submitted' || submission.status === 'graded') && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => resubmitMutation.mutate()}
                    disabled={resubmitMutation.isPending}
                    className="w-full"
                    variant={submission.status === 'graded' ? 'default' : 'outline'}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {resubmitMutation.isPending ? 'Creating Draft...' : 'Resubmit Activity'}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">
                    {submission.status === 'graded' 
                      ? 'Create a new submission to improve your grade'
                      : 'This will create a new draft with your previous content'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grade Info */}
          {submission.grade && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Grade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    Graded
                  </div>
                  <div className="text-sm text-slate-600">
                    Activity has been reviewed and feedback provided
                  </div>
                </div>
                {submission.grade.feedback && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Feedback</label>
                    <p className="text-slate-900 text-sm mt-1">{submission.grade.feedback}</p>
                  </div>
                )}
                
                {/* Rubric Scores Display */}
                {submission.grade.rubric && Object.keys(submission.grade.rubric).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-slate-600 mb-3 block">Rubric Scores</label>
                    <div className="space-y-2">
                      {Object.entries(submission.grade.rubric).map(([criterion, score]) => (
                        <div key={criterion} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">{criterion}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{score}/5</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= Number(score) 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-slate-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {submission.grade.gradedAt && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Graded</label>
                    <p className="text-slate-900 text-sm">
                      {new Date(submission.grade.gradedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Discussion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Comment List */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No comments yet</p>
                  ) : (
                    comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-900">
                              {comment.user?.firstName} {comment.user?.lastName}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment */}
                <div className="border-t pt-4">
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                    <Button
                      onClick={() => addCommentMutation.mutate(newComment)}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      size="sm"
                      className="w-full"
                    >
                      <MessageSquare className="h-3 w-3 mr-2" />
                      {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}