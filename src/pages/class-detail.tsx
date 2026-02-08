import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { insertAssignmentSchema, updateAssignmentSchema, insertClassSchema, insertUnitSchema, type Assignment, type Class, type Unit, type SampleAssignment } from '@shared/schema';
import { FileViewer } from '@/components/file-viewer';
import { Link } from 'wouter';
import { Book, Plus, Edit2, Trash2, Clock, FileText, Map as MapIcon, Users, Calendar, ArrowLeft, UserPlus, Eye, EyeOff, Power, PowerOff, Settings, FolderPlus, Folder, FolderOpen, Upload, X, Download, ExternalLink, MessageSquare, HelpCircle, MessageCircle, Send, Minus } from 'lucide-react';
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

export default function ClassDetail() {
  const { classId } = useParams<{ classId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = auth.getUser();
  const isTeacher = user?.role === 'teacher';
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editClassDialogOpen, setEditClassDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [createUnitDialogOpen, setCreateUnitDialogOpen] = useState(false);
  const [editUnitDialogOpen, setEditUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<any[]>([]);
  const [selectedLibraryFiles, setSelectedLibraryFiles] = useState<any[]>([]);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentTag, setCommentTag] = useState<'question' | 'discussion'>('discussion');
  const [assignmentCreationType, setAssignmentCreationType] = useState<'custom' | 'library'>('custom');
  const [selectedSampleAssignment, setSelectedSampleAssignment] = useState<SampleAssignment | null>(null);
  const [reflectionQuestions, setReflectionQuestions] = useState<string[]>([]);
  const [editReflectionQuestions, setEditReflectionQuestions] = useState<string[]>([]);
  const [selectedMaps, setSelectedMaps] = useState<Array<{ id: string; title: string; thumbnailUrl?: string }>>([]);
  const [editSelectedMaps, setEditSelectedMaps] = useState<Array<{ id: string; title: string; thumbnailUrl?: string }>>([]);

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['/api/classes', classId],
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/classes', classId, 'assignments'],
  });

  const { data: units = [] } = useQuery({
    queryKey: ['/api/classes', classId, 'units'],
    enabled: isTeacher && !!classId,
  });

  const { data: studentAssignments = [] } = useQuery({
    queryKey: ['/api/students', user?.id, 'assignments'],
    enabled: !isTeacher && !!user?.id,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['/api/students'],
    enabled: isTeacher,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: enrolledStudents = [] } = useQuery({
    queryKey: ['/api/classes', classId, 'students'],
    enabled: isTeacher && !!classId,
  });

  const { data: sampleAssignments = [] } = useQuery({
    queryKey: ['/api/sample-assignments'],
    enabled: isTeacher && (createDialogOpen || assignmentCreationType === 'library'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: classComments = [] } = useQuery({
    queryKey: ['/api/classes', classId, 'comments'],
    enabled: !!classId,
    staleTime: 30 * 1000, // 30 seconds
  });

  const { data: libraryFiles = [] } = useQuery({
    queryKey: ['/api/library/files'],
    enabled: isTeacher && libraryDialogOpen,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const ARCGIS_GROUP_ID = '18314398dbda4b39a10071f5e022d42d';

  // Fetch ArcGIS maps from group
  const { data: arcgisMaps = [], isLoading: mapsLoading } = useQuery<any[]>({
    queryKey: ['arcgis-maps', ARCGIS_GROUP_ID],
    queryFn: async () => {
      
      const url = `https://www.arcgis.com/sharing/rest/content/groups/${ARCGIS_GROUP_ID}?f=json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch ArcGIS maps');
      }
      
      const data = await response.json();
      
      // Check if there's an error in the response
      if (data.error) {
        throw new Error(data.error.message || 'ArcGIS API error');
      }
      
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
    enabled: createDialogOpen || editDialogOpen,
  });

  const createAssignmentForm = useForm({
    resolver: zodResolver(insertAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'text' as const,
      classId: parseInt(classId || '0'),
      unitId: null,
      dueDate: '',
      isGraded: true,
    },
  });

  const editAssignmentForm = useForm({
    resolver: zodResolver(updateAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      instructions: '',
      type: 'text' as const,
      estimatedDuration: '',
      resources: '',
      dueDate: undefined,
      isGraded: true,
    },
  });

  const createUnitForm = useForm({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: {
      title: '',
      description: '',
      classId: parseInt(classId || '0'),
      order: (units.length || 0) + 1,
    },
  });

  const editUnitForm = useForm({
    resolver: zodResolver(insertUnitSchema),
    defaultValues: {
      title: '',
      description: '',
      classId: parseInt(classId || '0'),
      order: 1,
    },
  });

  const editClassForm = useForm({
    resolver: zodResolver(insertClassSchema),
    defaultValues: {
      title: '',
      description: '',
      weeks: 0,
      lessons: 0,
      grade_level: '' as const,
      objectives: [],
      teacherId: user?.id || 0,
      isActive: true,
    },
  });

  const queryClient = useQueryClient();

  // Unit mutations
  const createUnitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/classes/${classId}/units`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'units'] });
      setCreateUnitDialogOpen(false);
      createUnitForm.reset();
      toast({
        title: 'Unit created',
        description: 'The unit has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create unit',
        variant: 'destructive',
      });
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PUT', `/api/units/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'units'] });
      setEditUnitDialogOpen(false);
      setEditingUnit(null);
      editUnitForm.reset();
      toast({
        title: 'Unit updated',
        description: 'The unit has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update unit',
        variant: 'destructive',
      });
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const response = await apiRequest('DELETE', `/api/units/${unitId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'units'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'assignments'] });
      toast({
        title: 'Unit deleted',
        description: 'The unit and its assignments have been reorganized.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete unit',
        variant: 'destructive',
      });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', `/api/classes/${classId}/assignments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      setCreateDialogOpen(false);
      setUploadedFiles([]);
      setSelectedLibraryFiles([]);
      setAssignmentCreationType('custom');
      setSelectedSampleAssignment(null);
      createAssignmentForm.reset();
      toast({ title: 'Assignment created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating assignment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const editAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'units'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      setEditDialogOpen(false);
      setEditingAssignment(null);
      setEditUploadedFiles([]);
      editAssignmentForm.reset();
      toast({ title: 'Assignment updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating assignment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (assignmentId: number) => apiRequest('DELETE', `/api/assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      toast({ title: 'Assignment deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting assignment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ assignmentId, isPublished }: { assignmentId: number; isPublished: boolean }) => {
      const response = await apiRequest('PATCH', `/api/assignments/${assignmentId}/publish`, { isPublished });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      toast({
        title: 'Assignment updated',
        description: 'Assignment visibility has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });

  const editClassMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/classes/${classId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setEditClassDialogOpen(false);
      editClassForm.reset();
      toast({ title: 'Class updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating module',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: () => apiRequest('DELETE', `/api/classes/${classId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      setLocation('/classes');
      toast({ title: 'Class deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting module',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const toggleClassActiveMutation = useMutation({
    mutationFn: (isActive: boolean) => apiRequest('PATCH', `/api/classes/${classId}/activate`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId] });
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
      toast({ title: `Class ${module?.isActive ? 'deactivated' : 'activated'} successfully` });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating module status',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; tag: 'question' | 'discussion' }) => {
      const response = await apiRequest('POST', `/api/classes/${classId}/comments`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'comments'] });
      setCommentContent('');
      setCommentTag('discussion');
      toast({ title: 'Comment posted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error posting comment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const onEditClass = (data: any) => {
    editClassMutation.mutate(data);
  };

  const handleEditClass = () => {
    if (!module) return;
    editClassForm.reset({
      title: module.title,
      description: module.description,
      weeks: module.weeks,
      lessons: module.lessons,
      grade_level: module.grade_level,
      objectives: module.objectives || [],
      teacherId: module.teacherId,
      isActive: module.isActive,
    });
    setEditClassDialogOpen(true);
  };

  const handleDeleteClass = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteClass = () => {
    deleteClassMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const handleToggleClassActive = () => {
    if (!module) return;
    setActivateDialogOpen(true);
  };

  const confirmToggleClassActive = () => {
    if (!module) return;
    toggleClassActiveMutation.mutate(!module.isActive);
    setActivateDialogOpen(false);
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

  const addEditMapSelection = (map: { id: string; title: string; thumbnailUrl?: string }) => {
    if (!editSelectedMaps.find(m => m.id === map.id)) {
      setEditSelectedMaps([...editSelectedMaps, map]);
    }
  };

  const removeEditMapSelection = (mapId: string) => {
    setEditSelectedMaps(editSelectedMaps.filter(m => m.id !== mapId));
  };

  const onCreateAssignment = (data: any) => {
    let formattedData;
    
    if (assignmentCreationType === 'library' && selectedSampleAssignment) {
      // Use sample assignment data
      const attachments = [
        ...uploadedFiles.map(f => `${f.originalName}:::${f.url}`),
        ...selectedLibraryFiles.map(f => `${f.originalName}:::${f.files[0]}`),
      ];

      // Add the original PDF attachment from the sample assignment if it exists
      if (selectedSampleAssignment.attachmentPath) {
        const originalFileName = selectedSampleAssignment.attachmentPath.split('/').pop() || 'attachment.pdf';
        const displayFileName = originalFileName.replace(/_\d+\.pdf$/, '.pdf'); // Clean up the filename
        attachments.unshift(`${displayFileName}:::${selectedSampleAssignment.attachmentPath}`);
      }

      formattedData = {
        title: selectedSampleAssignment.title,
        description: selectedSampleAssignment.description,
        type: selectedSampleAssignment.type,
        instructions: selectedSampleAssignment.instructions,
        reflectionQuestions: selectedSampleAssignment.reflectionQuestions,
        resources: selectedSampleAssignment.resources,
        rubricCriteria: selectedSampleAssignment.rubricCriteria,
        estimatedDuration: selectedSampleAssignment.estimatedDuration,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        unitId: data.unitId === 'none' ? null : data.unitId,
        attachments: attachments,
        selectedMaps: selectedMaps.length > 0 ? selectedMaps : undefined,
      };
    } else {
      // Use custom assignment data
      formattedData = {
        ...data,
        reflectionQuestions: reflectionQuestions.length > 0 ? reflectionQuestions : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        unitId: data.unitId === 'none' ? null : data.unitId,
        attachments: [
          ...uploadedFiles.map(f => `${f.originalName}:::${f.url}`),
          ...selectedLibraryFiles.map(f => `${f.originalName}:::${f.files[0]}`),
        ],
        selectedMaps: selectedMaps.length > 0 ? selectedMaps : undefined,
      };
    }
    
    createAssignmentMutation.mutate(formattedData);
  };

  const onCreateUnit = (data: any) => {
    createUnitMutation.mutate(data);
  };

  const onEditUnit = (data: any) => {
    updateUnitMutation.mutate({ id: editingUnit.id, data });
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnit(unit);
    editUnitForm.reset({
      title: unit.title,
      description: unit.description || '',
      classId: unit.classId,
      order: unit.order,
    });
    setEditUnitDialogOpen(true);
  };

  const handleDeleteUnit = (unitId: number) => {
    if (window.confirm('Are you sure you want to delete this unit? All activities in this unit will be moved to "Unorganized".')) {
      deleteUnitMutation.mutate(unitId);
    }
  };

  const handleSubmitComment = () => {
    if (!commentContent.trim()) {
      toast({
        title: 'Comment required',
        description: 'Please enter a comment before posting.',
        variant: 'destructive',
      });
      return;
    }
    
    createCommentMutation.mutate({
      content: commentContent.trim(),
      tag: commentTag,
    });
  };

  const handleMoveAssignment = (assignmentId: number, unitId: number | null) => {
    editAssignmentMutation.mutate({
      id: assignmentId,
      data: { unitId }
    });
  };

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

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
          url: e.target?.result as string,
          originalName: file.name,
        };
        setUploadedFiles(prev => [...prev, fileData]);
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const handleEditFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

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
          url: e.target?.result as string,
          originalName: file.name,
        };
        setEditUploadedFiles(prev => [...prev, fileData]);
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeEditFile = (index: number) => {
    setEditUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeLibraryFile = (fileId: number) => {
    setSelectedLibraryFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSelectLibraryFile = (file: any) => {
    if (!selectedLibraryFiles.find(f => f.id === file.id)) {
      setSelectedLibraryFiles(prev => [...prev, file]);
    }
  };

  const handleSelectSampleAssignment = (assignment: SampleAssignment) => {
    setSelectedSampleAssignment(assignment);
  };

  // Helper functions for reflection questions
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

  // Helper functions for edit reflection questions
  const addEditReflectionQuestion = () => {
    setEditReflectionQuestions([...editReflectionQuestions, '']);
  };

  const updateEditReflectionQuestion = (index: number, value: string) => {
    const updated = [...editReflectionQuestions];
    updated[index] = value;
    setEditReflectionQuestions(updated);
  };

  const removeEditReflectionQuestion = (index: number) => {
    setEditReflectionQuestions(editReflectionQuestions.filter((_, i) => i !== index));
  };

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'gis':
        return <MapIcon className="h-5 w-5" />;
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'mixed':
        return (
          <div className="flex gap-1">
            <FileText className="h-4 w-4" />
            <MapIcon className="h-4 w-4" />
          </div>
        );
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Component to render attachment links (simple list for class page)
  const renderAttachments = (attachments: string | string[] | null | undefined) => {
    if (!attachments) return null;
    
    // Handle string format (comma-separated)
    if (typeof attachments === 'string') {
      if (attachments.length === 0) return null;
      const attachmentArray = attachments.split(',');
      return (
        <div className="mt-2">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {attachmentArray.length} file{attachmentArray.length > 1 ? 's' : ''} attached
          </div>
        </div>
      );
    }
    
    // Handle array format
    if (Array.isArray(attachments) && attachments.length === 0) return null;
    const count = Array.isArray(attachments) ? attachments.length : 0;
    
    return (
      <div className="mt-2">
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {count} file{count > 1 ? 's' : ''} attached
        </div>
      </div>
    );
  };

  const onEditAssignment = (data: any) => {
    if (!editingAssignment) return;
    
    const formattedData = {
      ...data,
      reflectionQuestions: editReflectionQuestions.length > 0 ? editReflectionQuestions : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      attachments: editUploadedFiles.map(f => `${f.originalName}:::${f.url}`),
      selectedMaps: editSelectedMaps.length > 0 ? editSelectedMaps : undefined,
      // Clear old attachmentPath if it exists since we're now using the new attachments format
      attachmentPath: null,
    };

    editAssignmentMutation.mutate({ id: editingAssignment.id, data: formattedData });
  };

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment(assignment);
    setEditReflectionQuestions(assignment.reflectionQuestions || []);
    setEditSelectedMaps(assignment.selectedMaps || []);
    editAssignmentForm.reset({
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions || '',
      type: assignment.type,
      estimatedDuration: assignment.estimatedDuration || '',
      resources: assignment.resources || '',
      classId: assignment.classId,
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : undefined,
    });
    
    // Load existing attachments - handle both attachment format and old attachmentPath
    const existingFiles = [];
    
    // Handle new attachment format (array of "name:::url" strings)
    if (assignment.attachments && Array.isArray(assignment.attachments) && assignment.attachments.length > 0) {
      assignment.attachments.forEach((attachment: string) => {
        if (attachment.includes(':::')) {
          const [name, url] = attachment.split(':::');
          existingFiles.push({ url, originalName: name });
        } else {
          // Fallback for old format
          existingFiles.push({
            url: attachment,
            originalName: attachment.startsWith('data:') ? 'uploaded-file' : attachment.split('/').pop() || 'file',
          });
        }
      });
    }
    
    // Handle legacy attachmentPath for older template assignments
    if (assignment.attachmentPath && !existingFiles.length) {
      const originalFileName = assignment.attachmentPath.split('/').pop() || 'attachment.pdf';
      const displayFileName = originalFileName.replace(/_\d+\.pdf$/, '.pdf');
      existingFiles.push({
        url: assignment.attachmentPath,
        originalName: displayFileName,
      });
    }
    
    setEditUploadedFiles(existingFiles);
    setEditDialogOpen(true);
  };

  const handleDeleteAssignment = (assignmentId: number) => {
    if (window.confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      deleteAssignmentMutation.mutate(assignmentId);
    }
  };

  const handleTogglePublish = (assignmentId: number, currentPublished: boolean) => {
    publishMutation.mutate({ assignmentId, isPublished: !currentPublished });
  };

  const enrollStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await apiRequest('POST', `/api/classes/${classId}/enroll`, { studentId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'students'] });
      // Invalidate assignment-related queries to update missing/submitted sections
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      // Invalidate specific assignment queries that might be open
      const currentAssignments = assignments || [];
      currentAssignments.forEach((assignment: any) => {
        queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignment.id, 'missing'] });
        queryClient.invalidateQueries({ queryKey: ['/api/assignments', assignment.id, 'submissions'] });
      });
      toast({
        title: 'Student enrolled',
        description: 'Student has been successfully enrolled in the module.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to enroll student',
        variant: 'destructive',
      });
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: number) => {
      const response = await apiRequest('DELETE', `/api/classes/${classId}/students/${studentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/classes', classId, 'students'] });
      toast({
        title: 'Student removed',
        description: 'Student has been removed from the module.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove student',
        variant: 'destructive',
      });
    },
  });

  const handleEnrollStudent = (studentId: number) => {
    enrollStudentMutation.mutate(studentId);
  };

  const handleRemoveStudent = (studentId: number) => {
    removeStudentMutation.mutate(studentId);
  };

  const getAvailableStudents = () => {
    const enrolledStudentIds = enrolledStudents.map((es: any) => es.studentId);
    return students.filter((student: any) => !enrolledStudentIds.includes(student.id));
  };

  const getAssignmentsByUnit = () => {
    const assignmentsByUnit: { [key: string]: any[] } = {};
    const unorganized: any[] = [];

    assignments.forEach((assignment: any) => {
      if (assignment.unitId) {
        const unit = units.find((u: any) => u.id === assignment.unitId);
        if (unit) {
          const unitKey = `unit_${unit.id}`;
          if (!assignmentsByUnit[unitKey]) {
            assignmentsByUnit[unitKey] = [];
          }
          assignmentsByUnit[unitKey].push(assignment);
        } else {
          unorganized.push(assignment);
        }
      } else {
        unorganized.push(assignment);
      }
    });

    return { assignmentsByUnit, unorganized };
  };

  const getAssignmentStatus = (assignment: any) => {
    if (!isTeacher) {
      const studentAssignment = studentAssignments.find((sa: any) => sa.id === assignment.id);
      if (studentAssignment?.submission?.status === 'graded') {
        return { status: 'graded', variant: 'default' as const };
      }
      if (studentAssignment?.submission) {
        return { status: 'submitted', variant: 'secondary' as const };
      }
      return { status: 'assigned', variant: 'outline' as const };
    }
    return null;
  };



  if (moduleLoading || assignmentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Class Not Found</h2>
          <p className="text-slate-600 mb-4">The module you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/classes">
            <Button>Back to Classes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/classes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-300"></div>
         
        </div>
      </div>

      {/* Class Info */}
       <div className="flex items-center gap-3 classdetailtitle_container mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">Class Name: {module.title}</h1>
                <Badge
                  variant={module.isActive ? "default" : "secondary"}
                  className={module.isActive ? "classtag_purple" : "classtags"}
                >
                  {module.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-slate-600">{module.description}</p>
            </div>
          </div>
      {/* Class Management Section */}
      {isTeacher && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Class Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleToggleClassActive}
                variant={module.isActive ? "outline" : "default"}
                disabled={toggleClassActiveMutation.isPending}
              >
                {module.isActive ? <PowerOff className="h-4 w-4 mr-2" /> : <Power className="h-4 w-4 mr-2" />}
                {module.isActive ? "Deactivate Class" : "Activate Class"}
              </Button>
              <Button
                onClick={() => setEnrollDialogOpen(true)}
                variant="outline"
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
              <Button
                onClick={handleEditClass}
                variant="outline"
                disabled={editClassMutation.isPending}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Class
              </Button>
              <Button
                onClick={handleDeleteClass}
                variant="outline"
                disabled={deleteClassMutation.isPending || module.isActive}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-400"
                title={module.isActive ? "Deactivate module first to delete" : "Delete module"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Class
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              {module.isActive
                ? "This module is currently active and visible to students. Deactivating will hide it from students and prevent activity publishing."
                : "This module is inactive and hidden from students. Activate it to make it visible and allow activity publishing."
              }
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 classdetail_summarycontainer">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Weeks</p>
                <p className="text-lg font-semibold text-slate-900">{module.weeks || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Lessons per Week</p>
                <p className="text-lg font-semibold text-slate-900">{module.lessons || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Grade Level</p>
                <p className="text-lg font-semibold text-slate-900">{module.grade_level || 'Not specified'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Activities</p>
                <p className="text-lg font-semibold text-slate-900">{assignments.length}</p>
              </div>
            </div>
            {isTeacher && (
              <div className="flex items-center gap-3 md:col-span-3 mt-4 pt-4 border-t border-slate-200">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Enrollment Code</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">
                      {module.enrollmentCode}
                    </p>
                    <Button
                      className="edugis-btn-primary"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(module.enrollmentCode);
                        toast({
                          title: 'Copied!',
                          description: 'Enrollment code copied to clipboard',
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Students can use this code to join your class</p>
                </div>
              </div>
            )}
          </div>
          {module.objectives && module.objectives.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Learning Objectives</h3>
              <ul className="text-slate-700 space-y-1">
                {module.objectives.map((objective: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-slate-400 mr-2">•</span>
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Section */}
      <Card className="bluebox mb-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{isTeacher ? 'Content' : 'Activities'}</CardTitle>
            {isTeacher && (
              <div className="flex gap-2">
                <Button className="edugis-btn-secondary" variant="outline" onClick={() => setCreateUnitDialogOpen(true)}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Unit
                </Button>
                <Button className="edugis-btn-primary" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {units.length === 0 && assignments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">{isTeacher ? 'No content in this module yet' : 'No activities available yet'}</p>
              {isTeacher && (
                <div className="flex gap-2 justify-center">
                  <Button className="edugis-btn-secondary" variant="outline" onClick={() => setCreateUnitDialogOpen(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create First Unit
                  </Button>
                  <Button className="edugis-btn-primary" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Activity
                  </Button>
                </div>
              )}
            </div>
          ) : isTeacher ? (
            <div className="space-y-6">
              {/* Render Units */}
              {units.map((unit: any) => {
                const { assignmentsByUnit } = getAssignmentsByUnit();
                const unitAssignments = assignmentsByUnit[`unit_${unit.id}`] || [];
                
                return (
                  <div key={unit.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Folder className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{unit.title}</h3>
                          {unit.description && (
                            <p className="text-sm text-slate-600">{unit.description}</p>
                          )}
                        </div>
                      </div>
                      {isTeacher && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditUnit(unit)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteUnit(unit.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {unitAssignments.length === 0 ? (
                      <div className="text-center py-4 bg-slate-50 rounded-lg">
                        <p className="text-slate-500 text-sm">No activities in this unit</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {unitAssignments.map((assignment: any) => {
                          const status = getAssignmentStatus(assignment);
                          const studentAssignment = !isTeacher ? studentAssignments.find((sa: any) => sa.id === assignment.id) : null;
                          
                          return (
                            <Card key={assignment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/assignments/${assignment.id}`)}>
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                      {getAssignmentTypeIcon(assignment.type)}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <h4 className="text-md font-semibold text-slate-900">{assignment.title}</h4>
                                        {status && (
                                          <Badge variant={status.variant}>{status.status}</Badge>
                                        )}
                                      </div>
                                      <p className="text-slate-600 mb-2 text-sm">{assignment.description}</p>
                                      {renderAttachments(assignment.attachments)}
                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          Due {assignment.dueDate 
                                            ? new Date(assignment.dueDate).toLocaleDateString() 
                                            : 'No due date'
                                          }
                                        </span>
                                        {isTeacher && (
                                          <div className="flex items-center gap-1">
                                            {assignment.isPublished ? (
                                              <Eye className="h-3 w-3 text-green-600" />
                                            ) : (
                                              <EyeOff className="h-3 w-3 text-slate-400" />
                                            )}
                                            <span className={assignment.isPublished ? "text-green-600" : "text-slate-400"}>
                                              {assignment.isPublished ? "Published" : "Unpublished"}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {isTeacher && (
                                    <div className="flex items-center gap-2 ml-4">
                                      <Select onValueChange={(value) => handleMoveAssignment(assignment.id, value === 'none' ? null : parseInt(value))} value={assignment.unitId?.toString() || 'none'}>
                                        <SelectTrigger className="w-32 h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">Unorganized</SelectItem>
                                          {units.map((unit: any) => (
                                            <SelectItem key={unit.id} value={unit.id.toString()}>
                                              {unit.title}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleTogglePublish(assignment.id, assignment.isPublished); }}>
                                        {assignment.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {/* Unorganized Assignments */}
              {(() => {
                const { unorganized } = getAssignmentsByUnit();
                if (unorganized.length === 0) return null;
                
                return (
                  <div className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-4 w-4 text-slate-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Unorganized</h3>
                    </div>
                    
                    <div className="space-y-3">
                      {unorganized.map((assignment: any) => {
                        const status = getAssignmentStatus(assignment);
                        const studentAssignment = !isTeacher ? studentAssignments.find((sa: any) => sa.id === assignment.id) : null;
                        
                        return (
                          <Card key={assignment.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation(`/assignments/${assignment.id}`)}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                    {getAssignmentTypeIcon(assignment.type)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-md font-semibold text-slate-900">{assignment.title}</h4>
                                      {status && (
                                        <Badge variant={status.variant}>{status.status}</Badge>
                                      )}
                                    </div>
                                    <p className="text-slate-600 mb-2 text-sm">{assignment.description}</p>
                                    {renderAttachments(assignment.attachments)}
                                    <div className="flex items-center gap-4 text-xs text-slate-500">

                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Due {assignment.dueDate 
                                          ? new Date(assignment.dueDate).toLocaleDateString() 
                                          : 'No due date'
                                        }
                                      </span>
                                      {isTeacher && (
                                        <div className="flex items-center gap-1">
                                          {assignment.isPublished ? (
                                            <Eye className="h-3 w-3 text-green-600" />
                                          ) : (
                                            <EyeOff className="h-3 w-3 text-slate-400" />
                                          )}
                                          <span className={assignment.isPublished ? "text-green-600" : "text-slate-400"}>
                                            {assignment.isPublished ? "Published" : "Unpublished"}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {isTeacher && (
                                  <div className="flex items-center gap-2 ml-4">
                                    <Select onValueChange={(value) => handleMoveAssignment(assignment.id, value === 'none' ? null : parseInt(value))} value={assignment.unitId?.toString() || 'none'}>
                                      <SelectTrigger className="w-32 h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">Unorganized</SelectItem>
                                        {units.map((unit: any) => (
                                          <SelectItem key={unit.id} value={unit.id.toString()}>
                                            {unit.title}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleTogglePublish(assignment.id, assignment.isPublished); }}>
                                      {assignment.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            // Student View - Read-only assignment list
            <div className="space-y-4">
              {assignments.filter((assignment: any) => assignment.isPublished).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No published activities yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments
                    .filter((assignment: any) => assignment.isPublished)
                    .map((assignment: any) => {
                      const submission = studentAssignments?.find((sub: any) => sub.assignmentId === assignment.id);
                      const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && !submission;
                      
                      return (
                        <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getAssignmentTypeIcon(assignment.type)}
                                  <h3 className="font-semibold text-lg">{assignment.title}</h3>
                                  {submission ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      Submitted
                                    </Badge>
                                  ) : isOverdue ? (
                                    <Badge variant="destructive" className="classtag_red">Overdue</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="classtags">Not Submitted</Badge>
                                  )}
                                </div>
                                <p className="text-slate-600 mb-3">{assignment.description}</p>
                                
                                {assignment.dueDate && (
                                  <p className="text-sm text-slate-500 mb-2">
                                    Due: {new Date(assignment.dueDate).toLocaleDateString()} at{' '}
                                    {new Date(assignment.dueDate).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </p>
                                )}
                                
                                {assignment.estimatedDuration && (
                                  <p className="text-sm text-slate-500 mb-2">
                                    Estimated time: {assignment.estimatedDuration}
                                  </p>
                                )}
                                
                                {assignment.instructions && (
                                  <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                    <h4 className="font-medium text-sm mb-1">Instructions:</h4>
                                    <p className="text-sm text-slate-700">{assignment.instructions}</p>
                                  </div>
                                )}
                                
                                {/* Assignment Files */}
                                {assignment.attachments && typeof assignment.attachments === 'string' && assignment.attachments.length > 0 && (
                                  <div className="mt-3">
                                    <h4 className="font-medium text-sm mb-2">Attached Files:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {assignment.attachments.split(',').map((attachment: string, index: number) => {
                                        const [filename, url] = attachment.split(':::');
                                        return (
                                          <a
                                            key={index}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                          >
                                            <FileText className="h-4 w-4" />
                                            {filename}
                                          </a>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-2 ml-4">
                                <Link href={submission ? `/submissions/${submission.id}` : `/assignments/${assignment.id}/submit`}>
                                  <Button size="sm" className="w-full edugis-btn-primary">
                                    {submission ? 'View Submission' : 'Start Activity'}
                                  </Button>
                                </Link>
                                
                                {submission && submission.grade && (
                                  <div className="text-center p-2 bg-green-50 rounded-lg">
                                    <p className="text-xs text-green-600 font-medium">Graded</p>
                                    <p className="text-xs text-green-700">{submission.grade}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Students Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Students - {module?.title}</DialogTitle>
            <DialogDescription>
              Enroll students in this module or remove existing enrollments. Students will have access to all activities in this module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Enrolled Students */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Enrolled Students ({enrolledStudents.length})</h3>
              {enrolledStudents.length === 0 ? (
                <p className="text-slate-500 text-sm">No students enrolled yet.</p>
              ) : (
                <div className="space-y-2">
                  {enrolledStudents.map((enrollment: any) => (
                    <div key={enrollment.studentId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{enrollment.student.firstName} {enrollment.student.lastName}</p>
                        <p className="text-sm text-slate-500">{enrollment.student.email}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveStudent(enrollment.studentId)}
                        disabled={removeStudentMutation.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Students */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Available Students</h3>
              {getAvailableStudents().length === 0 ? (
                <p className="text-slate-500 text-sm">All students are already enrolled.</p>
              ) : (
                <div className="space-y-2">
                  {getAvailableStudents().map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">{student.firstName} {student.lastName}</p>
                        <p className="text-sm text-slate-500">{student.email}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleEnrollStudent(student.id)}
                        disabled={enrollStudentMutation.isPending}
                      >
                        Enroll
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Activation Confirmation Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{module?.isActive ? "Deactivate" : "Activate"} Class</DialogTitle>
            <DialogDescription>
              {module?.isActive 
                ? "Are you sure you want to deactivate this module? It will be hidden from students and activities cannot be published until reactivated."
                : "Are you sure you want to activate this module? It will become visible to enrolled students and activities can be published."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setActivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={module?.isActive ? "outline" : "default"}
              onClick={confirmToggleClassActive}
              disabled={toggleClassActiveMutation.isPending}
            >
              {toggleClassActiveMutation.isPending 
                ? (module?.isActive ? 'Deactivating...' : 'Activating...') 
                : (module?.isActive ? 'Deactivate' : 'Activate')
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
            <DialogDescription>
              Modify the activity details. Changes will be visible to students immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...editAssignmentForm}>
            <form onSubmit={editAssignmentForm.handleSubmit(onEditAssignment)} className="space-y-4">
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
                {editSelectedMaps.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {editSelectedMaps.map((map) => (
                      <div key={map.id} className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                        {map.thumbnailUrl && (
                          <img src={map.thumbnailUrl} alt={map.title} className="w-10 h-10 rounded object-cover" />
                        )}
                        <span className="flex-1 text-sm text-slate-700">{map.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEditMapSelection(map.id)}
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
                  selectedMaps={editSelectedMaps}
                  onSelect={addEditMapSelection}
                  isLoading={mapsLoading}
                />
                
                {editSelectedMaps.length === 0 && (
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
              
              <FormField
                control={editAssignmentForm.control}
                name="isGraded"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Graded Activity
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        If checked, this activity will be graded with a rubric. If unchecked, only feedback will be provided.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Additional Instructions */}
              <FormField
                control={editAssignmentForm.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detailed instructions for students..." {...field} />
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

              {/* Reflection Questions for Edit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Reflection Questions (Optional)</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEditReflectionQuestion}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Question
                  </Button>
                </div>
                {editReflectionQuestions.length > 0 && (
                  <div className="space-y-2">
                    {editReflectionQuestions.map((question, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Question ${index + 1}`}
                          value={question}
                          onChange={(e) => updateEditReflectionQuestion(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEditReflectionQuestion(index)}
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
                    onClick={() => document.getElementById('edit-file-upload')?.click()}
                    className="text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Add Files
                  </Button>
                </div>
                
                <input
                  type="file"
                  multiple
                  onChange={handleEditFileUpload}
                  className="hidden"
                  id="edit-file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
                />
                
                {/* Display uploaded files with remove option */}
                {editUploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Attached Files:</p>
                    {editUploadedFiles.map((file, index) => (
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
                            setEditUploadedFiles(prev => prev.filter((_, i) => i !== index));
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
                
                {editUploadedFiles.length === 0 && (
                  <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <FileText className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No files attached</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Files" to attach documents</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingAssignment(null);
                    setEditUploadedFiles([]);
                    setEditReflectionQuestions([]);
                    setEditSelectedMaps([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editAssignmentMutation.isPending}>
                  {editAssignmentMutation.isPending ? 'Updating...' : 'Update Activity'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={editClassDialogOpen} onOpenChange={setEditClassDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update the module details. Changes will be visible to students immediately.
            </DialogDescription>
          </DialogHeader>
          <Form {...editClassForm}>
            <form onSubmit={editClassForm.handleSubmit(onEditClass)} className="space-y-4">
              <FormField
                control={editClassForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Class title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editClassForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Class description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editClassForm.control}
                name="weeks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weeks</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editClassForm.control}
                name="grade_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="K">Kindergarten</SelectItem>
                          <SelectItem value="1">1st Grade</SelectItem>
                          <SelectItem value="2">2nd Grade</SelectItem>
                          <SelectItem value="3">3rd Grade</SelectItem>
                          <SelectItem value="4">4th Grade</SelectItem>
                          <SelectItem value="5">5th Grade</SelectItem>
                          <SelectItem value="6">6th Grade</SelectItem>
                          <SelectItem value="7">7th Grade</SelectItem>
                          <SelectItem value="8">8th Grade</SelectItem>
                          <SelectItem value="9">9th Grade</SelectItem>
                          <SelectItem value="10">10th Grade</SelectItem>
                          <SelectItem value="11">11th Grade</SelectItem>
                          <SelectItem value="12">12th Grade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditClassDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={editClassMutation.isPending}>
                  {editClassMutation.isPending ? 'Updating...' : 'Update Class'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Assignment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) {
          setAssignmentCreationType('custom');
          setSelectedSampleAssignment(null);
          setUploadedFiles([]);
          setSelectedLibraryFiles([]);
          setSelectedMaps([]);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Activity</DialogTitle>
            <DialogDescription>
              Add a new activity to this module. Students will be able to see it once you publish it.
            </DialogDescription>
          </DialogHeader>

          {/* Assignment Source Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={assignmentCreationType === 'custom' ? 'default' : 'outline'}
                onClick={() => setAssignmentCreationType('custom')}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Custom Activity
              </Button>
              <Button
                type="button"
                variant={assignmentCreationType === 'library' ? 'default' : 'outline'}
                onClick={() => setAssignmentCreationType('library')}
                className="flex-1"
              >
                <Book className="h-4 w-4 mr-2" />
                Use Library Activity
              </Button>
            </div>

            {assignmentCreationType === 'library' && (
              <div className="border rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Select from Sample Activities</h4>
                <div className="grid gap-2 max-h-60 overflow-y-auto">
                  {sampleAssignments.map((assignment: SampleAssignment) => (
                    <div
                      key={assignment.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSampleAssignment?.id === assignment.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleSelectSampleAssignment(assignment)}
                    >
                      <div className="flex items-start gap-3">
                        {getAssignmentTypeIcon(assignment.type)}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm truncate">{assignment.title}</h5>
                          <p className="text-xs text-gray-600 line-clamp-2">{assignment.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {assignment.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {assignment.grade_level}
                            </Badge>
                            <span className="text-xs text-gray-500">{assignment.estimatedDuration}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Form {...createAssignmentForm}>
            <form onSubmit={createAssignmentForm.handleSubmit(onCreateAssignment)} className="space-y-4">
              {assignmentCreationType === 'custom' && (
                <>
                  <FormField
                    control={createAssignmentForm.control}
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
                    control={createAssignmentForm.control}
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
                    control={createAssignmentForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Activity type" />
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
                  {assignmentCreationType === 'custom' && (
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
                  )}

                  <FormField
                    control={createAssignmentForm.control}
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
                  
                  {/* Reflection Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel>Reflection Questions (Optional)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addReflectionQuestion}
                        className="text-xs"
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
                </>
              )}

              {assignmentCreationType === 'library' && selectedSampleAssignment && (
                <div className="bg-blue-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-sm mb-2">Selected Activity</h4>
                  <div className="flex items-start gap-3">
                    {getAssignmentTypeIcon(selectedSampleAssignment.type)}
                    <div className="flex-1">
                      <h5 className="font-medium">{selectedSampleAssignment.title}</h5>
                      <p className="text-sm text-gray-600 mt-1">{selectedSampleAssignment.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedSampleAssignment.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {selectedSampleAssignment.grade_level}
                        </Badge>
                        <span className="text-xs text-gray-500">{selectedSampleAssignment.estimatedDuration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <FormField
                control={createAssignmentForm.control}
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
              
              <FormField
                control={createAssignmentForm.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value))} value={field.value?.toString() || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit or leave unorganized" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unorganized</SelectItem>
                        {units.map((unit: any) => (
                          <SelectItem key={unit.id} value={unit.id.toString()}>
                            {unit.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createAssignmentForm.control}
                name="isGraded"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Graded Activity
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        If checked, this activity will be graded with a rubric. If unchecked, only feedback will be provided.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {/* File Attachments */}
              <div className="space-y-3">
                <FormLabel>File Attachments (Optional)</FormLabel>
                
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>

                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg"
                />
              </div>
                {/* Display selected files */}
                {(uploadedFiles.length > 0 || selectedLibraryFiles.length > 0) && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Attached files:</p>
                    
                    {/* Uploaded files */}
                    {uploadedFiles.map((file, index) => (
                      <div key={`upload-${index}`} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{file.originalName}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {/* Library files */}
                    {selectedLibraryFiles.map((file) => (
                      <div key={`library-${file.id}`} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">{file.originalName}</span>
                          <Badge variant="secondary" className="text-xs">Library</Badge>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLibraryFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setUploadedFiles([]);
                    setSelectedLibraryFiles([]);
                    createAssignmentForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createAssignmentMutation.isPending || (assignmentCreationType === 'library' && !selectedSampleAssignment)}
                >
                  {createAssignmentMutation.isPending ? 'Creating...' : 'Create Activity'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Class Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inactive module? This will also delete all activities and submissions. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteClass}
              disabled={deleteClassMutation.isPending}
            >
              {deleteClassMutation.isPending ? 'Deleting...' : 'Delete Class'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Unit Dialog */}
      <Dialog open={createUnitDialogOpen} onOpenChange={setCreateUnitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Unit</DialogTitle>
            <DialogDescription>
              Create a unit to organize related activities together.
            </DialogDescription>
          </DialogHeader>
          <Form {...createUnitForm}>
            <form onSubmit={createUnitForm.handleSubmit(onCreateUnit)} className="space-y-4">
              <FormField
                control={createUnitForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Introduction to GIS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUnitForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of this unit..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setCreateUnitDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUnitMutation.isPending}>
                  Create Unit
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={editUnitDialogOpen} onOpenChange={setEditUnitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
            <DialogDescription>
              Update the unit information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editUnitForm}>
            <form onSubmit={editUnitForm.handleSubmit(onEditUnit)} className="space-y-4">
              <FormField
                control={editUnitForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Introduction to GIS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editUnitForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of this unit..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditUnitDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUnitMutation.isPending}>
                  Update Unit
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Class Comments Section */}
      <div className="space-y-6">
        <Card className="yellowbox">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Class Discussion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comment Input */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={commentTag === 'discussion' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentTag('discussion')}
                  className="flex items-center gap-1 edugis-btn-primary"
                >
                  <MessageCircle className="h-4 w-4" />
                  Discussion
                </Button>
                <Button
                  variant={commentTag === 'question' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCommentTag('question')}
                  className="flex items-center gap-1 edugis-btn-secondary"
                >
                  <HelpCircle className="h-4 w-4" />
                  Question
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder={`Write a ${commentTag}...`}
                  className="flex-1"
                  rows={3}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={createCommentMutation.isPending || !commentContent.trim()}
                  size="sm"
                  className="self-end edugis-btn-primary"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Comments List */}
            <div className="space-y-4 shadow-sm white_innerbox">
              {classComments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600">No comments yet</p>
                  <p className="text-sm text-slate-500">Start a discussion or ask a question!</p>
                </div>
              ) : (
                classComments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-600">
                          {comment.user.firstName[0]}{comment.user.lastName[0]}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {comment.user.firstName} {comment.user.lastName}
                        </span>
                        {comment.user.role === 'teacher' && (
                          <Badge variant="secondary" className="text-xs">Teacher</Badge>
                        )}
                        <Badge 
                          variant={comment.tag === 'question' ? 'default' : 'outline'} 
                          className="text-xs"
                        >
                          {comment.tag === 'question' ? (
                            <>
                              <HelpCircle className="h-3 w-3 mr-1" />
                              Question
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Discussion
                            </>
                          )}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                          {new Date(comment.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Library File Selection Dialog */}
      <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Files from Library</DialogTitle>
            <DialogDescription>
              Choose files from your library to attach to this activity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {libraryFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderOpen className="h-12 w-12 text-slate-400 mb-4" />
                <p className="text-slate-500 mb-2">No files in library</p>
                <p className="text-sm text-slate-400">Upload files to your library first to select them for activities.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {libraryFiles.map((file: any) => {
                  const isSelected = selectedLibraryFiles.find(f => f.id === file.id);
                  return (
                    <div
                      key={file.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleSelectLibraryFile(file)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="h-6 w-6 text-slate-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-slate-900 truncate">{file.originalName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={file.scope === 'teacher' ? 'default' : 'secondary'} className="text-xs">
                                {file.scope === 'teacher' ? 'Personal' : 'Global'}
                              </Badge>
                              {file.category && (
                                <Badge variant="outline" className="text-xs">
                                  {file.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="ml-2">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-sm text-slate-600">
              {selectedLibraryFiles.length} file{selectedLibraryFiles.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLibraryDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setLibraryDialogOpen(false)}
                disabled={selectedLibraryFiles.length === 0}
              >
                Add Selected Files
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}