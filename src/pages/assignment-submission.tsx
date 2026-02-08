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
import { X, Save, Send, Upload, File, Trash2, Eye, Download, FileText, Image, Map as MapIcon, ExternalLink } from 'lucide-react';import { useForm } from 'react-hook-form';
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
    const hasAttachments = data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0;
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
        // Convert attachment URLs to file objects for display
        const attachmentObjects = existingSubmission.attachments.map((url: string, index: number) => ({
          id: `existing-${index}`,
          name: url.split('/').pop() || `file-${index}`,
          size: 0,
          type: 'application/octet-stream',
          data: url,
        }));
        setAttachments(attachmentObjects);
      }
    }
  }, [existingSubmission, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: SubmissionFormData) => {
      const submissionData = {
        writtenResponse: data.writtenResponse || '',
        status: data.status,
        attachments: attachments.map(att => att.data), // Keep attachment data as URLs/base64
      };

      const response = await apiRequest('POST', `/api/assignments/${assignmentId}/submissions`, submissionData);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignmentId, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'submissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students', user?.id, 'classes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      
      toast({
        title: data.status === 'submitted' ? 'Activity submitted' : 'Draft saved',
        description: data.status === 'submitted' 
          ? 'Your activity has been submitted successfully.' 
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
      attachments: attachments,
      status: 'draft',
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
    // Add attachments to the form data for validation
    const submissionData = {
      ...data,
      attachments: attachments,
      status: 'submitted' as const,
    };

    submitMutation.mutate(submissionData);
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Activity not found</h2>
          <p className="text-slate-600 mb-4">The activity you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => setLocation('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate).getFullYear() > 1990 && new Date() > new Date(assignment.dueDate);
  const isSubmitted = existingSubmission?.status === 'submitted';

  return (
    <div className="max-w-4xl mx-auto p-6 purplebox mt-5 mb-10">
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
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 mb-4">{assignment.description}</p>
            
            {/* Reflection Questions */}
            {assignment.reflectionQuestions && assignment.reflectionQuestions.length > 0 && (
              <div className="mb-6 pb-6 border-b border-slate-200">
                <h4 className="text-sm font-medium mb-3 text-slate-900">
                  Reflection Questions
                </h4>
                <div className="space-y-3">
                  {assignment.reflectionQuestions.map((question: string, index: number) => (
                    <div key={index} className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium text-slate-900">{index + 1}.</span> {question}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Selected Maps Display */}
            {assignment.selectedMaps && assignment.selectedMaps.length > 0 && (
              <div className="mb-6 pb-6 border-b border-slate-200">
                <h4 className="text-sm font-medium mb-3 text-slate-900 flex items-center gap-2">
                  <MapIcon className="h-4 w-4" />
                  ArcGIS Maps ({assignment.selectedMaps.length})
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {assignment.selectedMaps.map((map: any) => (
                    <a
                      key={map.id}
                      href={`https://www.arcgis.com/apps/mapviewer/index.html?webmap=${map.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          {map.thumbnailUrl ? (
                            <img
                              src={map.thumbnailUrl}
                              alt={map.title}
                              className="w-24 h-24 rounded-lg object-cover border border-slate-200 group-hover:border-blue-300 transition-colors"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = `
                                    <div class="w-24 h-24 rounded-lg bg-slate-200 flex items-center justify-center">
                                      <svg class="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                      </svg>
                                    </div>
                                  `;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-lg bg-slate-200 flex items-center justify-center">
                              <MapIcon className="w-10 h-10 text-slate-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h5 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {map.title}
                            </h5>
                            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0 mt-0.5" />
                          </div>
                          
                          {/* Description */}
                          {map.description && (
                            <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                              {map.description}
                            </p>
                          )}
                          
                          {/* Map Type Badge */}
                          <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              <MapIcon className="h-3 w-3" />
                              Web Map
                            </div>
                            <span className="text-xs text-slate-500">
                              Click to open in ArcGIS Online
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-slate-900">Due Date:</span>
                <span className="ml-2 text-slate-600">
                  {assignment.dueDate && new Date(assignment.dueDate).getFullYear() > 1990
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
            
            {/* Assignment Files */}
            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Activity Files ({assignment.attachments.length})
                </h4>
                <div className="space-y-4">
                  {assignment.attachments.map((urlData: string, index: number) => {
                    // Parse filename and URL from the encoded string
                    let filename = `attachment-${index + 1}`;
                    let url = urlData;
                    
                    if (urlData.includes(':::')) {
                      const [parsedFilename, parsedUrl] = urlData.split(':::');
                      filename = parsedFilename || `attachment-${index + 1}`;
                      url = parsedUrl || urlData;
                      
                      // Handle attached_assets files by adding leading slash if missing
                      if (url.startsWith('attached_assets/')) {
                        url = '/' + url;
                      }
                    } else {
                      // Legacy format - try to extract filename from URL
                      if (url.startsWith('data:')) {
                        filename = `attachment-${index + 1}`;
                      } else {
                        filename = url.split('/').pop() || `file-${index + 1}`;
                      }
                    }
                    
                    const cleanFilename = filename.replace(/-\d{13}-\d{9}/, ''); // Remove timestamp from display name
                    
                    const handleDownload = async () => {
                      try {
                        const response = await fetch(url);
                        if (response.ok) {
                          const blob = await response.blob();
                          const fileUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = fileUrl;
                          a.download = cleanFilename;
                          a.click();
                          URL.revokeObjectURL(fileUrl);
                          toast({
                            title: 'File downloaded',
                            description: `${cleanFilename} has been downloaded.`
                          });
                        } else {
                          toast({
                            title: 'Error',
                            description: 'Unable to download file',
                            variant: 'destructive'
                          });
                        }
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Unable to download file',
                          variant: 'destructive'
                        });
                      }
                    };

                    // Determine file type based on extension
                    const getFileType = (filename: string) => {
                      const ext = filename.toLowerCase().split('.').pop();
                      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
                      if (ext === 'pdf') return 'pdf';
                      if (['txt', 'md', 'csv'].includes(ext || '')) return 'text';
                      return 'other';
                    };

                    const fileType = getFileType(cleanFilename);

                    return (
                      <div key={index} className="border rounded-lg overflow-hidden bg-white">
                        {/* File Header */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
                          <div className="flex items-center gap-2">
                            <File className="h-4 w-4 text-slate-600" />
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Click to open in new tab"
                            >
                              {cleanFilename}
                            </a>
                            {fileType === 'image' && <Image className="h-3 w-3 text-blue-500" />}
                            {fileType === 'pdf' && <FileText className="h-3 w-3 text-red-500" />}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(url, '_blank')}
                              className="h-8 px-2"
                              title="Open in new tab"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Open
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleDownload}
                              className="h-8 px-2"
                              title="Download file"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>

                        {/* File Content */}
                        <div className="p-4">
                          {fileType === 'image' && (
                            <div className="flex justify-center">
                              <img 
                                src={url}
                                alt={cleanFilename}
                                className="max-w-full max-h-64 object-contain rounded border"
                                onError={(e) => {
                                  // Fallback if image fails to load
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          {fileType === 'pdf' && (
                            <div className="bg-slate-50 rounded-lg">
                              <iframe 
                                src={url}
                                className="w-full h-96 border rounded"
                                title={cleanFilename}
                              />
                            </div>
                          )}
                          
                          {fileType === 'text' && (
                            <div className="bg-slate-50 rounded-lg p-4">
                              <iframe 
                                src={url}
                                className="w-full h-48 border rounded bg-white"
                                title={cleanFilename}
                              />
                            </div>
                          )}
                          
                          {fileType === 'other' && (
                            <div className="bg-slate-50 rounded-lg p-4 text-center">
                              <File className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-600 mb-2">
                                This file type cannot be previewed directly.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download to view
                              </Button>
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
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file-upload"
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
              className="edugis-btn-gray"
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
                className="edugis-btn-secondary"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              <Button
                type="submit"
                disabled={submitMutation.isPending || isSubmitted}
                className="edugis-btn-primary"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSubmitted ? 'Already Submitted' : 'Submit Activity'}
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