import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Save, Send, Upload, File, Trash2, Eye, Download, FileText, Image } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Assignment, Submission } from '@/lib/types';

const submissionSchema = z.object({
  writtenResponse: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  status: z.enum(['draft', 'submitted']),
}).refine((data) => {
  // For submitted assignments, require at least one form of content
  if (data.status === 'submitted') {
    const hasWrittenResponse = data.writtenResponse && data.writtenResponse.trim().length > 0;
    const hasAttachments = data.attachments && data.attachments.length > 0;
    return hasWrittenResponse || hasAttachments;
  }
  return true;
}, {
  message: "Please provide a written response or file attachment before submitting.",
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

export default function AssignmentSubmission() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const assignmentId = parseInt(params.id as string);
  const user = auth.getUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [attachments, setAttachments] = useState<Array<{id: string, name: string, size: number, type: string, data: string}>>([]);
  const [previewFile, setPreviewFile] = useState<{name: string, type: string, data: string} | null>(null);

  const { data: assignment, isLoading: assignmentLoading } = useQuery<Assignment>({
    queryKey: ['/api/assignments', assignmentId],
    enabled: !!assignmentId,
  });

  const { data: existingSubmission } = useQuery<Submission>({
    queryKey: ['/api/assignments', assignmentId, 'submissions'],
    enabled: !!assignmentId && !!user,
    select: (data: any) => Array.isArray(data) ? data[0] : data,
  });

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      writtenResponse: '',
      attachments: [],
      status: 'draft',
    },
  });

  useEffect(() => {
    if (existingSubmission) {
      form.reset({
        writtenResponse: existingSubmission.writtenResponse || '',
        attachments: [],
        status: existingSubmission.status as 'draft' | 'submitted',
      });
      if (existingSubmission.attachments && Array.isArray(existingSubmission.attachments)) {
        setAttachments(existingSubmission.attachments);
      }
    }
  }, [existingSubmission, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: SubmissionFormData) => {
      const response = await apiRequest('POST', `/api/assignments/${assignmentId}/submissions`, {
        ...data,
        attachments,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignmentId, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'modules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/modules'] });
      
      toast({
        title: data.status === 'submitted' ? 'Assignment submitted' : 'Draft saved',
        description: data.status === 'submitted' 
          ? 'Your assignment has been submitted successfully.' 
          : 'Your progress has been saved.',
      });

      if (data.status === 'submitted') {
        setLocation('/dashboard');
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save submission',
        variant: 'destructive',
      });
    },
  });

  const handleSaveDraft = () => {
    const formData = form.getValues();
    submitMutation.mutate({
      ...formData,
      status: 'draft',
      attachments,
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 10MB limit.`,
          variant: 'destructive',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          data: e.target?.result as string,
        };
        setAttachments(prev => [...prev, fileData]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const canPreviewFile = (type: string) => {
    return type.startsWith('image/') || type.includes('pdf') || type.startsWith('text/');
  };

  const downloadFile = (attachment: {name: string, data: string}) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    link.click();
  };

  const handleSubmit = (data: SubmissionFormData) => {
    // Check that there's at least some content to submit
    const hasWrittenResponse = data.writtenResponse && data.writtenResponse.trim().length > 0;
    const hasAttachments = attachments && attachments.length > 0;

    if (!hasWrittenResponse && !hasAttachments) {
      toast({
        title: 'Content Required',
        description: 'Please add a written response or file attachment before submitting.',
        variant: 'destructive',
      });
      return;
    }

    submitMutation.mutate({
      ...data,
      status: 'submitted',
      attachments,
    });
  };

  if (assignmentLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-slate-200 rounded"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Assignment not found</h2>
          <p className="text-slate-600 mb-4">The assignment you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => setLocation('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate);
  const isSubmitted = existingSubmission?.status === 'submitted';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-slate-900">{assignment.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={assignment.type === 'gis' ? 'default' : assignment.type === 'text' ? 'secondary' : 'outline'}>
              {assignment.type.toUpperCase()}
            </Badge>
            {isOverdue && !isSubmitted && (
              <Badge variant="destructive">Overdue</Badge>
            )}
            {isSubmitted && (
              <Badge variant="default" className="bg-green-100 text-green-800">Submitted</Badge>
            )}
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Assignment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-4">{assignment.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-900">Points:</span>
                <span className="ml-2 text-slate-600">{assignment.points}</span>
              </div>
              <div>
                <span className="font-medium text-slate-900">Due Date:</span>
                <span className="ml-2 text-slate-600">
                  {assignment.dueDate 
                    ? new Date(assignment.dueDate).toLocaleDateString() 
                    : 'No due date'
                  }
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-900">Type:</span>
                <span className="ml-2 text-slate-600 capitalize">{assignment.type}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Written Response Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Written Response</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="writtenResponse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Response</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your written response here..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">File Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.csv,.xlsx"
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-slate-500 mt-2">
                    Upload files such as documents, images, or data files. Maximum 10MB per file.
                  </p>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900">Uploaded Files:</h4>
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFileIcon(attachment.type)}
                          <div>
                            <p className="font-medium text-slate-900">{attachment.name}</p>
                            <p className="text-sm text-slate-500">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canPreviewFile(attachment.type) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewFile(attachment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(attachment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation('/dashboard')}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={submitMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              <Button
                type="submit"
                disabled={submitMutation.isPending || isSubmitted}
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitted ? 'Already Submitted' : 'Submit Assignment'}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>File Preview</DialogTitle>
            <DialogDescription>
              Viewing: {previewFile?.name}
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="mt-4">
              {previewFile.type.startsWith('image/') && (
                <img 
                  src={previewFile.data} 
                  alt={previewFile.name}
                  className="max-w-full h-auto"
                />
              )}
              {previewFile.type.includes('pdf') && (
                <iframe 
                  src={previewFile.data} 
                  className="w-full h-96"
                  title={previewFile.name}
                />
              )}
              {previewFile.type.startsWith('text/') && (
                <pre className="bg-slate-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
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