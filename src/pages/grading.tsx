import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, Save, Send, Eye, Download, File, FileText, Image, Maximize2, MessageSquare, Clock, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const gradeSchema = z.object({
  feedback: z.string().optional(),
  rubric: z.record(z.number()).optional(),
});

type GradeFormData = z.infer<typeof gradeSchema>;

export default function Grading() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const submissionId = parseInt(params.submissionId as string);
  const user = auth.getUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [previewFile, setPreviewFile] = useState<{name: string, type: string, data: string} | null>(null);
  const [newComment, setNewComment] = useState('');


  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadAttachment = (attachmentData: string, index: number) => {
    try {
      // Parse the data URL to get file info
      const [header, data] = attachmentData.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      
      // Convert base64 to blob
      const byteCharacters = atob(data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Generate filename based on type and index
      const extension = mimeType.includes('pdf') ? 'pdf' 
        : mimeType.includes('image') ? 'jpg'
        : mimeType.includes('text') ? 'txt'
        : 'file';
      const filename = `attachment_${index + 1}.${extension}`;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'File downloaded',
        description: `${filename} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Unable to download the file. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const { data: submission, isLoading } = useQuery({
    queryKey: ['/api/submissions', submissionId],
    enabled: !!submissionId,
  }) as { data: any, isLoading: boolean };

  // Get assignment details for rubric criteria
  const { data: assignment } = useQuery({
    queryKey: ['/api/assignments', submission?.assignmentId],
    enabled: !!submission?.assignmentId,
  }) as { data: any };

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

  const { data: existingGrade } = useQuery({
    queryKey: ['/api/submissions', submissionId, 'grades'],
    enabled: !!submissionId,
  }) as { data: any };

  // Get rubric criteria from assignment, with fallbacks
  const rubricCriteria = assignment?.rubricCriteria || ['Content Quality', 'Organization', 'Critical Thinking'];
  
  // Create default rubric object based on criteria
  const defaultRubric = rubricCriteria.reduce((acc, criterion) => {
    acc[criterion] = 4; // Default score of 4 out of 5
    return acc;
  }, {} as Record<string, number>);

  const form = useForm<GradeFormData>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      feedback: existingGrade?.feedback || '',
      rubric: existingGrade?.rubric || defaultRubric,
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async (data: GradeFormData) => {
      const response = await apiRequest('POST', `/api/submissions/${submissionId}/grades`, data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/submissions', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      // Invalidate any student-specific queries that might show grades
      if (submission?.studentId) {
        queryClient.invalidateQueries({ queryKey: ['/api/students', submission.studentId, 'submissions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/students', submission.studentId, 'assignments'] });
      }
      toast({
        title: 'Grade submitted',
        description: 'The grade has been recorded successfully.',
      });
      setLocation('/grades');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit grade',
        variant: 'destructive',
      });
    },
  });

  const handleSaveDraft = () => {
    const formData = form.getValues();
    // In a real app, you might want a separate endpoint for draft grades
    // Draft grade saved
    toast({
      title: 'Draft saved',
      description: 'Your grading progress has been saved.',
    });
  };

  const onSubmit = (data: GradeFormData) => {
    gradeMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 h-96 bg-slate-200 rounded"></div>
            <div className="col-span-4 h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 mb-2">Submission not found</h3>
            <p className="text-slate-500">The submission you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLateSubmission = submission.submittedAt && submission.assignment?.dueDate && 
    new Date(submission.submittedAt) > new Date(submission.assignment.dueDate);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/grades')}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-bold text-slate-900">Grade Activity</h2>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Student Submission */}
          <div className="col-span-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{submission.assignment?.title}</CardTitle>
                    <p className="text-sm text-slate-600">
                      Submitted by: {submission.student?.firstName} {submission.student?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      Submitted: {new Date(submission.submittedAt).toLocaleString()}
                    </p>
                    <Badge className={isLateSubmission ? 'edugis-status-due-soon' : 'edugis-status-submitted'}>
                      {isLateSubmission ? 'Late' : 'On Time'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {submission.writtenResponse && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Written Response</h4>
                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700">
                      <p className="whitespace-pre-wrap">{submission.writtenResponse}</p>
                    </div>
                  </div>
                )}



                {submission.attachments && submission.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-3">File Attachments ({submission.attachments.length})</h4>
                    <div className="space-y-4">
                      {submission.attachments.map((attachmentData: string, index: number) => {
                        // Parse the data URL to get file info
                        const [header] = attachmentData.split(',');
                        const mimeMatch = header.match(/data:([^;]+)/);
                        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                        
                        // Generate filename based on type
                        const extension = mimeType.includes('pdf') ? 'pdf' 
                          : mimeType.includes('image') ? 'jpg'
                          : mimeType.includes('text') ? 'txt'
                          : 'file';
                        const filename = `attachment_${index + 1}.${extension}`;
                        
                        return (
                        <div key={index} className="border rounded-lg overflow-hidden">
                          {/* File Header */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
                            <div className="flex items-center space-x-3">
                              {mimeType.startsWith('image/') ? (
                                <Image className="h-5 w-5 text-slate-400" />
                              ) : mimeType.includes('pdf') ? (
                                <FileText className="h-5 w-5 text-slate-400" />
                              ) : (
                                <File className="h-5 w-5 text-slate-400" />
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-900">{filename}</p>
                                <p className="text-xs text-slate-500">{mimeType}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {(mimeType.startsWith('image/') || mimeType.includes('pdf') || mimeType.startsWith('text/')) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewFile({
                                    name: filename,
                                    type: mimeType,
                                    data: attachmentData
                                  })}
                                >
                                  <Maximize2 className="h-4 w-4 mr-2" />
                                  Full View
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadAttachment(attachmentData, index)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          </div>
                          
                          {/* Inline File Preview */}
                          <div className="p-4">
                            {mimeType.startsWith('image/') && (
                              <div className="text-center">
                                <img 
                                  src={attachmentData} 
                                  alt={filename}
                                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-sm border"
                                  style={{ objectFit: 'contain' }}
                                />
                              </div>
                            )}
                            
                            {mimeType.includes('pdf') && (
                              <div className="bg-slate-50 rounded-lg p-4">
                                <iframe 
                                  src={attachmentData} 
                                  className="w-full h-96 border rounded"
                                  title={filename}
                                />
                              </div>
                            )}
                            
                            {mimeType.startsWith('text/') && (
                              <div className="bg-slate-50 rounded-lg p-4">
                                <pre className="text-sm text-slate-700 whitespace-pre-wrap overflow-auto max-h-64">
                                  {atob(attachmentData.split(',')[1])}
                                </pre>
                              </div>
                            )}
                            
                            {!mimeType.startsWith('image/') && 
                             !mimeType.includes('pdf') && 
                             !mimeType.startsWith('text/') && (
                              <div className="text-center text-slate-500 py-8">
                                <File className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm">Preview not available for this file type</p>
                                <p className="text-xs">Use the download button to view the file</p>
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grading Panel */}
          <div className="col-span-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Grading</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {assignment?.isGraded && (
                      <div>
                        <FormLabel className="text-sm font-medium text-slate-700 mb-2">Rubric</FormLabel>
                        <div className="space-y-3">
                          {rubricCriteria.map((criterion) => (
                            <FormField
                              key={criterion}
                              control={form.control}
                              name={`rubric.${criterion}` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600">{criterion}</span>
                                    <Select value={field.value?.toString() || "4"} onValueChange={(value) => field.onChange(parseInt(value))}>
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="5">Excellent (5)</SelectItem>
                                        <SelectItem value="4">Good (4)</SelectItem>
                                        <SelectItem value="3">Satisfactory (3)</SelectItem>
                                        <SelectItem value="2">Needs Improvement (2)</SelectItem>
                                        <SelectItem value="1">Poor (1)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="feedback"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feedback</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={6}
                              placeholder="Provide detailed feedback..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveDraft}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Draft
                      </Button>
                      <Button
                        type="submit"
                        disabled={gradeMutation.isPending}
                        className="flex-1 edugis-btn-secondary"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {gradeMutation.isPending ? 'Submitting...' : 'Submit Grade'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Student Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar>
                    <AvatarFallback>
                      {submission.student?.firstName?.[0]}{submission.student?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {submission.student?.firstName} {submission.student?.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{submission.student?.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Activity:</span>
                    <span className="text-xs text-slate-900">{submission.assignment?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Class:</span>
                    <span className="text-xs text-slate-900">{submission.assignment?.module?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Status:</span>
                    <span className="text-xs text-slate-900">{submission.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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

      {/* Full Screen File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription>
              Viewing: {previewFile?.name}
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="mt-4">
              {previewFile.type.startsWith('image/') && (
                <div className="text-center">
                  <img 
                    src={previewFile.data} 
                    alt={previewFile.name}
                    className="max-w-full h-auto mx-auto"
                  />
                </div>
              )}
              {previewFile.type.includes('pdf') && (
                <iframe 
                  src={previewFile.data} 
                  className="w-full h-[70vh] border rounded"
                  title={previewFile.name}
                />
              )}
              {previewFile.type.startsWith('text/') && (
                <pre className="bg-slate-50 p-4 rounded-lg overflow-auto max-h-[60vh] text-sm">
                  {atob(previewFile.data.split(',')[1])}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
