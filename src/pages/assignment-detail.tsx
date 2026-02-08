import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Calendar, Clock, Eye, EyeOff, Save, Trash2, AlertTriangle, Users, Edit, FileText, ExternalLink, Download, Plus, Minus, X, Map as MapIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/auth';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Searchable Map Select Component
function SearchableMapSelect({ 
  maps, 
  selectedMaps, 
  onSelect, 
  isLoading 
}: { 
  maps: any[]; 
  selectedMaps: any[]; 
  onSelect: (map: any) => void;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const availableMaps = maps.filter(map => !selectedMaps.find(sm => sm.id === map.id));
  
  // Filter maps based on search query
  const filteredMaps = availableMaps.filter(map => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      map.title.toLowerCase().includes(query) ||
      (map.description && map.description.toLowerCase().includes(query))
    );
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery('');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            placeholder={isLoading ? "Loading maps..." : "Search maps"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }}
            className="pr-8 w-full"
            disabled={isLoading}
          />
          <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        align="start" 
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          e.stopPropagation();
        }}
        onInteractOutside={(e) => {
          e.stopPropagation();
        }}
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        <Command shouldFilter={false}>
          <CommandEmpty className="py-6 text-center text-sm">
            {searchQuery.trim() ? 'No maps found' : 'Start typing to find maps'}
          </CommandEmpty>
          <CommandGroup 
            className="overflow-y-scroll overflow-x-hidden"
            style={{ maxHeight: '256px' }}
          >
            {filteredMaps.map((map) => (
              <CommandItem
                key={map.id}
                value={map.id}
                onSelect={() => {
                  onSelect(map);
                  setSearchQuery('');
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <div className="flex flex-col w-full min-w-0">
                  <span className="font-medium truncate">{map.title}</span>
                  {map.description && (
                    <span className="text-xs text-slate-500 truncate">
                      {map.description}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const editAssignmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Instructions are required'),
  type: z.enum(['text', 'gis', 'mixed']),
  estimatedDuration: z.string().optional(),
  resources: z.string().optional(),
  dueDate: z.string().optional(),
  rubricCriteria: z.array(z.string()).optional(),
  reflectionQuestions: z.array(z.string()).optional(),
  selectedMaps: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    thumbnailUrl: z.string().optional(),
  })).optional(),
});

type EditAssignmentData = z.infer<typeof editAssignmentSchema>;

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [rubricCriteria, setRubricCriteria] = useState<string[]>([]);
  const [rubricDialogOpen, setRubricDialogOpen] = useState(false);
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ originalName: string; fileName: string }>>([]);
  const [selectedMaps, setSelectedMaps] = useState<Array<{ id: string; title: string; thumbnailUrl?: string }>>([]);

  const { data: assignment, isLoading } = useQuery<any>({
    queryKey: ['/api/assignments', assignmentId],
  });
    
  const { data: module } = useQuery<any>({
    queryKey: ['/api/classes', assignment?.classId],
    enabled: !!assignment?.classId,
  });

  // Fetch missing submissions for teachers
  const { data: missingSubmissions = [] } = useQuery<any[]>({
    queryKey: ['/api/assignments', assignmentId, 'missing'],
    enabled: !!assignmentId && isTeacher,
  });

  // Fetch submitted assignments for teachers
  const { data: submissions = [] } = useQuery<any[]>({
    queryKey: ['/api/assignments', assignmentId, 'submissions'],
    enabled: !!assignmentId && isTeacher,
  });

  const ARCGIS_GROUP_ID = '18314398dbda4b39a10071f5e022d42d';

  // Fetch ArcGIS maps from group
  const { data: arcgisMaps = [], isLoading: mapsLoading } = useQuery<any[]>({
    queryKey: ['arcgis-maps', ARCGIS_GROUP_ID],
    queryFn: async () => {
      
      const url = `https://www.arcgis.com/sharing/rest/content/groups/${ARCGIS_GROUP_ID}?f=json`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log('Failed to fetch ArcGIS maps');
        throw new Error('Failed to fetch ArcGIS maps');
      }
      
      const data = await response.json();
      
      // Filter for web maps only
      const maps = (data.items || [])
        .filter((item: any) => item.type === 'Web Map')
        .map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.snippet || item.description || '',
          thumbnailUrl: item.thumbnail 
            ? `https://www.arcgis.com/sharing/rest/content/items/${item.id}/info/${item.thumbnail}`
            : undefined,
        }));
      
      return maps;
    },
    enabled: editDialogOpen,
  });

  const editAssignmentForm = useForm<EditAssignmentData>({
    resolver: zodResolver(editAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'text',
      dueDate: '',
      rubricCriteria: [],
      selectedMaps: [],
    },
  });

  // Reset form and rubric when assignment data loads or dialog opens
  useState(() => {
    if (assignment && (editDialogOpen || rubricDialogOpen)) {
      editAssignmentForm.reset({
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
        rubricCriteria: assignment.rubricCriteria || [],
        selectedMaps: assignment.selectedMaps || [],
      });
      setRubricCriteria(assignment.rubricCriteria || ['Content Quality', 'Organization', 'Critical Thinking']);
      setSelectedMaps(assignment.selectedMaps || []);
    }
  });

  const updateRubricMutation = useMutation({
    mutationFn: async (criteria: string[]) => {
      return apiRequest('PUT', `/api/assignments/${assignmentId}`, {
        rubricCriteria: criteria,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignmentId] });
      setRubricDialogOpen(false);
      toast({
        title: "Success",
        description: "Activity rubric updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rubric.",
        variant: "destructive",
      });
    },
  });

  // File handling functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      const newFiles = result.files.map((file: any) => ({
        originalName: file.originalName,
        fileName: file.fileName,
      }));

      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast({
        title: "Success",
        description: `${newFiles.length} file(s) uploaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files.",
        variant: "destructive",
      });
    }
  };

  // Map selection functions
  const addMapSelection = (map: { id: string; title: string; thumbnailUrl?: string }) => {
    if (!selectedMaps.find(m => m.id === map.id)) {
      setSelectedMaps([...selectedMaps, map]);
    }
  };

  const removeMapSelection = (mapId: string) => {
    setSelectedMaps(selectedMaps.filter(m => m.id !== mapId));
  }; 
  
  // Reflection questions functions
  const addReflectionQuestion = () => {
    setReflectionQuestions([...reflectionQuestions, '']);
  };

  const updateReflectionQuestion = (index: number, value: string) => {
    const updated = [...reflectionQuestions];
    updated[index] = value;
    setReflectionQuestions(updated);
  };

  const removeReflectionQuestion = (index: number) => {
    setReflectionQuestions(reflectionQuestions.filter((_, i) => i !== index));
  };

  const updateAssignmentMutation = useMutation({
    mutationFn: async (data: EditAssignmentData) => {
      const response = await apiRequest('PUT', `/api/assignments/${assignmentId}`, {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        reflectionQuestions,
        attachments: uploadedFiles,
        selectedMaps,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Activity updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update activity',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (isPublished: boolean) => {
      const response = await apiRequest('PATCH', `/api/assignments/${assignmentId}/publish`, { isPublished });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update activity',
        variant: 'destructive',
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/assignments/${assignmentId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Activity deleted successfully',
      });
      setLocation(`/classes/${assignment?.classId}`);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete activity',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditAssignmentData) => {
    updateAssignmentMutation.mutate(data);
    setEditDialogOpen(false);
  };

  const handleTogglePublish = () => {
    publishMutation.mutate(!assignment.isPublished);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      deleteAssignmentMutation.mutate();
    }
  };

  const addRubricCriterion = () => {
    setRubricCriteria([...rubricCriteria, '']);
  };

  const removeRubricCriterion = (index: number) => {
    setRubricCriteria(rubricCriteria.filter((_, i) => i !== index));
  };

  const updateRubricCriterion = (index: number, value: string) => {
    const updated = [...rubricCriteria];
    updated[index] = value;
    setRubricCriteria(updated);
  };

  const saveRubric = () => {
    const filteredCriteria = rubricCriteria.filter(c => c.trim());
    updateRubricMutation.mutate(filteredCriteria);
  };

  if (isLoading || !assignment) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/classes/${assignment.classId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Class
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            <p className="text-slate-600">
              {assignment.class?.title} • {assignment.type.toUpperCase()} Activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={assignment.isPublished ? "default" : "secondary"} className={assignment.isPublished ? "" : "bg-yellow-100 text-yellow-800 border-yellow-300"}>
            {assignment.isPublished ? "Published" : "Unpublished"}
          </Badge>
          {isTeacher && (
            <>
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (assignment) {
                        editAssignmentForm.reset({
                          title: assignment.title,
                          description: assignment.description,
                          type: assignment.type,
                          estimatedDuration: assignment.estimatedDuration || '',
                          resources: assignment.resources || '',
                          dueDate: assignment.dueDate && new Date(assignment.dueDate).getFullYear() > 1990 ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '',
                          reflectionQuestions: assignment.reflectionQuestions || [],
                          selectedMaps: assignment.selectedMaps || [], 
                        });
                        setReflectionQuestions(assignment.reflectionQuestions || []);
                        setSelectedMaps(assignment.selectedMaps || []);
                        // Handle both old attachmentPath and new attachments format
                        if (assignment.attachments) {
                          setUploadedFiles(assignment.attachments);
                        } else if (assignment.attachmentPath) {
                          setUploadedFiles([{ originalName: assignment.attachmentPath.split('/').pop() || 'File', fileName: assignment.attachmentPath }]);
                        } else {
                          setUploadedFiles([]);
                        }
                      }
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Activity</DialogTitle>
                    <DialogDescription>
                      Update the activity details below.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...editAssignmentForm}>
                    <form onSubmit={editAssignmentForm.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={editAssignmentForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Activity title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editAssignmentForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instructions</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Activity instructions" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editAssignmentForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select activity type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="text">Text Activity</SelectItem>
                                <SelectItem value="gis">GIS Activity</SelectItem>
                                <SelectItem value="mixed">Mixed Activity</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Select Maps */}
                      <div className="space-y-2">
                        <FormLabel>Select Maps (Optional)</FormLabel>
                        
                        {/* Selected Maps Display */}
                        {selectedMaps.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {selectedMaps.map((map) => (
                              <div key={map.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                                {map.thumbnailUrl && (
                                  <img src={map.thumbnailUrl} alt={map.title} className="w-10 h-10 rounded object-cover" />
                                )}
                                <span className="flex-1 text-sm text-slate-700">{map.title}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMapSelection(map.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Map Selection Dropdown */}
                        <SearchableMapSelect
                          maps={arcgisMaps}
                          selectedMaps={selectedMaps}
                          onSelect={addMapSelection}
                          isLoading={mapsLoading}
                        />
                        
                        {selectedMaps.length === 0 && (
                          <p className="text-xs text-slate-500">No maps selected</p>
                        )}
                      </div>

                      <FormField
                          control={editAssignmentForm.control}
                          name="dueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Due Date (Optional)</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Estimated Duration */}
                        <FormField
                          control={editAssignmentForm.control}
                          name="estimatedDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Duration (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 2 hours, 30 minutes" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Resources */}
                        <FormField
                          control={editAssignmentForm.control}
                          name="resources"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resources (Optional)</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Links, references, or additional resources..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Reflection Questions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <FormLabel>Reflection Questions (Optional)</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addReflectionQuestion}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Question
                            </Button>
                          </div>
                          {reflectionQuestions.length > 0 && (
                            <div className="space-y-2">
                              {reflectionQuestions.map((question, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    placeholder={`Question ${index + 1}`}
                                    value={question}
                                    onChange={(e) => updateReflectionQuestion(index, e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeReflectionQuestion(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* File Attachments */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <FormLabel>File Attachments (Optional)</FormLabel>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('assignment-file-upload')?.click()}
                              className="text-xs"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Add Files
                            </Button>
                          </div>
                          
                          <input
                            type="file"
                            multiple
                            onChange={handleFileUpload}
                            className="hidden"
                            id="assignment-file-upload"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
                          />
                          
                          {uploadedFiles.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">Attached Files:</p>
                              {uploadedFiles.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm text-slate-700">{file.originalName}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <p className="text-xs text-slate-500 mt-2">
                                You can remove any files (including original template files) and add your own
                              </p>
                            </div>
                          )}
                          
                          {uploadedFiles.length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                              <FileText className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                              <p className="text-sm text-slate-500">No files attached</p>
                              <p className="text-xs text-slate-400 mt-1">Click "Add Files" to attach documents</p>
                            </div>
                          )}
                        </div>
                        
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updateAssignmentMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          {updateAssignmentMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button
                variant={assignment.isPublished ? "default" : "outline"}
                onClick={handleTogglePublish}
                disabled={publishMutation.isPending || (!module?.isActive && !assignment.isPublished)}
                title={
                  !module?.isActive && !assignment.isPublished 
                    ? "Class must be active to publish activities" 
                    : assignment.isPublished 
                      ? "Unpublish activity" 
                      : "Publish activity"
                }
              >
                {assignment.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteAssignmentMutation.isPending}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Assignment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Assignment Description */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">{assignment.description}</p>

              {/* Selected Maps Display */}
              {assignment.selectedMaps && assignment.selectedMaps.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
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
                                  // Fallback if thumbnail fails to load
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
                              <p className="text-sm text-slate-600 line-clamp-2 mb-2">
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

              {/* Reflection Questions */}
              {assignment.reflectionQuestions && assignment.reflectionQuestions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
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

                      // Determine file type from data URL or extension
                      const getFileType = (dataUrl: string, filename: string) => {
                        // Check data URL type first (for base64 files)
                        if (dataUrl.startsWith('data:')) {
                          if (dataUrl.startsWith('data:image/')) return 'image';
                          if (dataUrl.startsWith('data:application/pdf')) return 'pdf';
                          if (dataUrl.startsWith('data:text/')) return 'text';
                        }
                        
                        // Fallback to file extension
                        const ext = filename.toLowerCase().split('.').pop();
                        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
                        if (ext === 'pdf') return 'pdf';
                        if (['txt', 'md', 'csv'].includes(ext || '')) return 'text';
                        return 'other';
                      };

                      const fileType = getFileType(url, cleanFilename);

                      return (
                        <div key={index} className="border rounded-lg overflow-hidden bg-white">
                          {/* File Header */}
                          <div className="flex items-center justify-between p-3 bg-slate-50 border-b">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-600" />
                              <span className="text-sm font-medium text-slate-700">{cleanFilename}</span>
                              {fileType === 'image' && <div className="h-3 w-3 bg-blue-500 rounded-full" />}
                              {fileType === 'pdf' && <div className="h-3 w-3 bg-red-500 rounded-full" />}
                            </div>
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

                          {/* File Content */}
                          <div className="p-4">
                            {fileType === 'image' && (
                              <div className="flex justify-center">
                                <img 
                                  src={url}
                                  alt={cleanFilename}
                                  className="max-w-full max-h-64 object-contain rounded border"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            
                            {fileType === 'pdf' && (
                              <div className="space-y-3">
                                <div className="bg-slate-50 rounded-lg p-3 text-center">
                                  <FileText className="h-8 w-8 text-red-500 mx-auto mb-2" />
                                  <div className="text-sm text-slate-600">PDF Document</div>
                                </div>
                                {/* PDF Preview */}
                                <div className="bg-slate-50 rounded-lg border">
                                  <iframe 
                                    src={url}
                                    className="w-full h-96 rounded"
                                    title={`PDF preview: ${cleanFilename}`}
                                    onError={(e) => {
                                      console.log('PDF iframe failed to load:', e);
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
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
                                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-2" />
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

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-600">Due Date</span>
                  <p className="text-sm">
                    {assignment.dueDate && new Date(assignment.dueDate).getFullYear() > 1990
                      ? new Date(assignment.dueDate).toLocaleDateString() 
                      : 'No due date set'
                    }
                  </p>
                </div>

                <div>
                  <span className="text-sm font-medium text-slate-600">Status</span>
                  <Badge variant={assignment.isPublished ? "default" : "secondary"} className={assignment.isPublished ? "" : "bg-yellow-100 text-yellow-800 border-yellow-300"}>
                    {assignment.isPublished ? "Published" : "Unpublished"}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Created</span>
                  <p className="text-sm">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Grading</span>
                  <p className="text-sm">{assignment.isGraded ? 'Gradable' : 'Not Graded'}</p>
                </div>
                
                {/* Rubric Display */}
                {assignment.rubricCriteria && assignment.rubricCriteria.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-slate-600">Rubric Criteria</span>
                    <div className="mt-1 space-y-1">
                      {assignment.rubricCriteria.map((criterion: string, index: number) => (
                        <div key={index} className="text-xs bg-slate-50 px-2 py-1 rounded">
                          {criterion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Rubric Editor for Gradable Assignments */}
              {isTeacher && assignment.isGraded && (
                <div className="pt-3 border-t border-slate-200">
                  <Dialog open={rubricDialogOpen} onOpenChange={setRubricDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setRubricCriteria(assignment.rubricCriteria || ['Content Quality', 'Organization', 'Critical Thinking']);
                          setRubricDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Rubric
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Activity Rubric</DialogTitle>
                        <DialogDescription>
                          Customize the criteria for grading this activity.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {rubricCriteria.map((criterion, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={criterion}
                              onChange={(e) => updateRubricCriterion(index, e.target.value)}
                              placeholder="Enter criterion name"
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRubricCriterion(index)}
                              disabled={rubricCriteria.length <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addRubricCriterion}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Criterion
                        </Button>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setRubricDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={saveRubric}
                          disabled={updateRubricMutation.isPending}
                        >
                          {updateRubricMutation.isPending ? 'Saving...' : 'Save Rubric'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submitted Assignments Section (Teacher Only) */}
          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  Submitted Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-4">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 mb-3">
                      {submissions.length} submission{submissions.length > 1 ? 's' : ''} to grade:
                    </p>
                    <div className="space-y-2">
                      {submissions.map((submission: any) => (
                        <div 
                          key={submission.id} 
                          className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200 hover:bg-green-100 cursor-pointer transition-colors"
                          onClick={() => setLocation(`/grading/${submission.id}`)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {submission.studentFirstName} {submission.studentLastName}
                            </p>
                            <p className="text-xs text-slate-500">
                              Submitted {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {submission.isGraded ? (
                              <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                                Graded
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Needs Grading
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Missing Submissions Section (Teacher Only) */}
          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Missing Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {missingSubmissions.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-600 font-medium">All submitted!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 mb-3">
                      {missingSubmissions.length} missing:
                    </p>
                    <div className="space-y-2">
                      {missingSubmissions.map((student: any) => (
                        <div 
                          key={student.studentId} 
                          className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                          onClick={() => setLocation(`/students/${student.studentId}`)}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                          <div className="text-right">
                            {student.daysOverdue !== null && student.daysOverdue > 0 && student.daysOverdue < 10000 && (
                              <Badge variant="destructive" className="text-xs">
                                {student.daysOverdue}d overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}