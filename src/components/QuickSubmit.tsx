import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send, Save, FileText, Upload, X, Download, Eye, File, Trash2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const quickSubmissionSchema = z.object({
  assignmentId: z.number(),
  writtenResponse: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  status: z.enum(['draft', 'submitted']),
}).refine((data) => {
  // For submitted assignments, require at least one form of content
  if (data.status === 'submitted') {
    const hasWrittenResponse = data.writtenResponse && data.writtenResponse.trim().length > 0;
    const hasAttachments = data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0;
    return hasWrittenResponse || hasAttachments;
  }
  return true;
}, {
  message: "Please provide a written response or file attachment before submitting.",
});

type QuickSubmissionData = z.infer<typeof quickSubmissionSchema>;

interface QuickSubmitProps {
  className?: string;
}

export function QuickSubmit({ className = '' }: QuickSubmitProps) {
  const user = auth.getUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<Array<{id: string, name: string, size: number, type: string, data: string}>>([]);

  // Fetch student's pending assignments
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['/api/students', user?.id, 'assignments'],
    enabled: !!user?.id && user?.role === 'student',
  });

  // Fetch existing submission for selected assignment
  const { data: existingSubmission } = useQuery<any>({
    queryKey: ['/api/assignments', selectedAssignment, 'submissions'],
    enabled: !!selectedAssignment && !!user,
    select: (data: any) => Array.isArray(data) ? data[0] : data,
  });

  const form = useForm<QuickSubmissionData>({
    resolver: zodResolver(quickSubmissionSchema),
    defaultValues: {
      assignmentId: 0,
      writtenResponse: '',
      attachments: [],
      status: 'draft',
    },
  });

  useEffect(() => {
    if (existingSubmission) {
      form.reset({
        assignmentId: selectedAssignment || 0,
        writtenResponse: existingSubmission.writtenResponse || '',
        attachments: [],
        status: existingSubmission.status as 'draft' | 'submitted',
      });
      if (existingSubmission.attachments && Array.isArray(existingSubmission.attachments)) {
        const attachmentObjects = existingSubmission.attachments.map((url: string, index: number) => ({
          id: `existing-${index}`,
          name: url.split('/').pop() || `file-${index}`,
          size: 0,
          type: 'application/octet-stream',
          data: url,
        }));
        setAttachments(attachmentObjects);
      }
    } else if (selectedAssignment) {
      form.reset({
        assignmentId: selectedAssignment,
        writtenResponse: '',
        attachments: [],
        status: 'draft',
      });
      setAttachments([]);
    }
  }, [existingSubmission, selectedAssignment, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: QuickSubmissionData) => {
      const submissionData = {
        writtenResponse: data.writtenResponse || '',
        status: data.status,
        attachments: attachments.map(att => att.data),
      };

      const response = await apiRequest('POST', `/api/assignments/${data.assignmentId}/submissions`, submissionData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments', selectedAssignment, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'assignments'] });
      
      toast({
        title: data.status === 'submitted' ? 'Assignment submitted' : 'Draft saved',
        description: data.status === 'submitted' 
          ? 'Your assignment has been submitted successfully.' 
          : 'Your progress has been saved.',
      });

      if (data.status === 'submitted') {
        setIsOpen(false);
        setSelectedAssignment(null);
        form.reset();
        setAttachments([]);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
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
    if (type.startsWith('image/')) return <File className="h-4 w-4 text-blue-500" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-slate-500" />;
  };

  const handleSubmit = (data: QuickSubmissionData) => {
    submitMutation.mutate(data);
  };

  const pendingAssignments = assignments.filter(assignment => 
    !assignment.submission || assignment.submission.status !== 'submitted'
  );

  if (user?.role !== 'student' || pendingAssignments.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className={`fixed bottom-4 right-4 w-64 cursor-pointer hover:shadow-lg transition-shadow ${className}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Send className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-900">Quick Submit</h3>
                <p className="text-sm text-slate-600">
                  {pendingAssignments.length} pending assignment{pendingAssignments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Submit Assignment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Assignment Selection */}
          <div>
            <label className="text-sm font-medium text-slate-900 mb-2 block">
              Select Assignment
            </label>
            <Select value={selectedAssignment?.toString() || ''} onValueChange={(value) => setSelectedAssignment(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an assignment to submit" />
              </SelectTrigger>
              <SelectContent>
                {pendingAssignments.map((assignment) => (
                  <SelectItem key={assignment.id} value={assignment.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{assignment.title}</span>
                      <Badge variant={assignment.type === 'gis' ? 'default' : assignment.type === 'text' ? 'secondary' : 'outline'} className="text-xs">
                        {assignment.type.toUpperCase()}
                      </Badge>
                      {assignment.submission?.status === 'draft' && (
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedAssignment && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <input type="hidden" {...form.register('assignmentId')} value={selectedAssignment} />
                
                {/* Assignment Details */}
                {(() => {
                  const assignment = assignments.find(a => a.id === selectedAssignment);
                  return assignment ? (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-slate-900 mb-2">{assignment.title}</h4>
                        <p className="text-sm text-slate-600 mb-3">{assignment.description}</p>
                        
                        {/* Assignment Files - Show both template files and teacher-uploaded files */}
                        {assignment.attachments && assignment.attachments.length > 0 && (
                          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">Assignment Files:</span>
                            </div>
                            <div className="space-y-1">
                              {assignment.attachments.map((attachment, index) => {
                                // Handle different attachment formats
                                if (attachment.includes(':::')) {
                                  // Format: filename:::url
                                  const [filename, url] = attachment.split(':::');
                                  const displayName = filename?.replace(/-\d{13}-\d{9}/, '') || 'View File';
                                  const href = url?.startsWith('attached_assets/') ? '/' + url : url;
                                  
                                  return (
                                    <div key={index}>
                                      <a 
                                        href={href} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {displayName}
                                      </a>
                                    </div>
                                  );
                                } else if (attachment.startsWith('data:')) {
                                  // Handle base64 data URLs (don't show these)
                                  return null;
                                } else {
                                  // Direct URL
                                  return (
                                    <div key={index}>
                                      <a 
                                        href={attachment} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        View File
                                      </a>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

                {/* Written Response */}
                <FormField
                  control={form.control}
                  name="writtenResponse"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Written Response</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter your response to this assignment..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload */}
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">
                    File Attachments (Optional)
                  </label>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.csv,.xlsx"
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum 10MB per file
                  </p>
                  
                  {attachments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 border rounded text-xs">
                          <div className="flex items-center gap-2">
                            {getFileIcon(attachment.type)}
                            <span className="font-medium">{attachment.name}</span>
                            <span className="text-slate-500">({formatFileSize(attachment.size)})</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.setValue('status', 'draft');
                        form.handleSubmit(handleSubmit)();
                      }}
                      disabled={submitMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      form.setValue('status', 'submitted');
                      form.handleSubmit(handleSubmit)();
                    }}
                    disabled={submitMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Assignment
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}