import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  BookOpen, 
  FileText, 
  Map,
  Search,
  Grid3X3,
  List,
  Clock,
  ExternalLink,
  Eye,
  Tag,
  Users
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { SampleAssignment } from '@shared/schema';

export default function Library() {
  const user = auth.getUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<SampleAssignment | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const { data: sampleAssignments = [], isLoading } = useQuery({
    queryKey: ['/api/sample-assignments'],
  });

  // Filter assignments based on search and filters
  const filteredAssignments = sampleAssignments.filter((assignment: SampleAssignment) => {
    const matchesSearch = searchTerm === '' || 
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || assignment.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || assignment.category === selectedCategory;
    const matchesGradeLevel = selectedGradeLevel === 'all' || assignment.grade_level === selectedGradeLevel;
    
    return matchesSearch && matchesType && matchesCategory && matchesGradeLevel;
  });

  // Get unique categories and types for filters
  const categories = [...new Set(sampleAssignments.map((a: SampleAssignment) => a.category))];
  const types = [...new Set(sampleAssignments.map((a: SampleAssignment) => a.type))];

  const getAssignmentTypeIcon = (type: string) => {
    switch (type) {
      case 'gis':
        return <Map className="h-5 w-5" />;
      case 'text':
        return <FileText className="h-5 w-5" />;
      case 'mixed':
        return (
          <div className="flex gap-1">
            <FileText className="h-4 w-4" />
            <Map className="h-4 w-4" />
          </div>
        );
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getAssignmentTypeLabel = (type: string) => {
    switch (type) {
      case 'gis':
        return 'GIS Activity';
      case 'text':
        return 'Text Activity';
      case 'mixed':
        return 'Mixed Activity';
      default:
        return 'Activity';
    }
  };

  const getGradeLevelColor = (grade_level: string) => {
    switch (grade_level) {
      case 'K':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        return 'bg-purple-100 text-purple-800';
      case '6':
      case '7':
      case '8':
        return 'bg-blue-100 text-blue-800';
      case '9':
      case '10':
      case '11':
      case '12':
        return 'bg-green-100 text-green-800';
      case '':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (assignment: SampleAssignment) => {
    setSelectedAssignment(assignment);
    setIsDetailDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Activity Library</h1>
          <p className="text-slate-600 mt-1">Pre-built activities ready to add to your classes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Types</option>
                {types.map(type => (
                  <option key={type} value={type}>
                    {getAssignmentTypeLabel(type)}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={selectedGradeLevel}
                onChange={(e) => setSelectedGradeLevel(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Grades</option>
                <option value="K">Kindergarten</option>
                <option value="1">1st Grade</option>
                <option value="2">2nd Grade</option>
                <option value="3">3rd Grade</option>
                <option value="4">4th Grade</option>
                <option value="5">5th Grade</option>
                <option value="6">6th Grade</option>
                <option value="7">7th Grade</option>
                <option value="8">8th Grade</option>
                <option value="9">9th Grade</option>
                <option value="10">10th Grade</option>
                <option value="11">11th Grade</option>
                <option value="12">12th Grade</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No activities found</h3>
              <p className="text-slate-600">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
          }>
            {filteredAssignments.map((assignment: SampleAssignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getAssignmentTypeIcon(assignment.type)}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{assignment.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {assignment.category}
                          </Badge>
                          <Badge className={`text-xs ${getGradeLevelColor(assignment.grade_level)}`}>
                            {assignment.grade_level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm line-clamp-3 mb-4">
                    {assignment.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {assignment.estimatedDuration && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>{assignment.estimatedDuration}</span>
                      </div>
                    )}
                    {assignment.reflectionQuestions && assignment.reflectionQuestions.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <FileText className="h-3 w-3" />
                        <span>{assignment.reflectionQuestions.length} reflection questions</span>
                      </div>
                    )}
                    {assignment.resources && assignment.resources.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <ExternalLink className="h-3 w-3" />
                        <span>{assignment.resources.length} resources</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(assignment)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {getAssignmentTypeIcon(selectedAssignment.type)}
                  </div>
                  {selectedAssignment.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedAssignment.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Assignment Info */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Type:</span>
                    <Badge variant="outline">{getAssignmentTypeLabel(selectedAssignment.type)}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Grade Level:</span>
                    <Badge className={getGradeLevelColor(selectedAssignment.grade_level)}>
                      {selectedAssignment.grade_level}
                    </Badge>
                  </div>
                  {selectedAssignment.estimatedDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600">Duration:</span>
                      <span className="text-sm">{selectedAssignment.estimatedDuration}</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Instructions</h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                      {selectedAssignment.instructions}
                    </pre>
                  </div>
                </div>

                {/* Reflection Questions */}
                {selectedAssignment.reflectionQuestions && selectedAssignment.reflectionQuestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Reflection Questions</h3>
                    <div className="space-y-2">
                      {selectedAssignment.reflectionQuestions.map((question, index) => (
                        <div key={index} className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                          <span className="text-blue-600 font-medium text-sm">{index + 1}.</span>
                          <p className="text-sm text-slate-700">{question}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {selectedAssignment.resources && selectedAssignment.resources.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Resources</h3>
                    <div className="space-y-2">
                      {selectedAssignment.resources.map((resource, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <h4 className="font-medium text-slate-900">{resource.name}</h4>
                            {resource.description && (
                              <p className="text-sm text-slate-600">{resource.description}</p>
                            )}
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rubric Criteria */}
                {selectedAssignment.rubricCriteria && selectedAssignment.rubricCriteria.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Assessment Criteria</h3>
                    <div className="grid gap-2">
                      {selectedAssignment.rubricCriteria.map((criteria, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                          <span className="text-slate-600 text-sm">•</span>
                          <span className="text-sm text-slate-700">{criteria}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedAssignment.tags && selectedAssignment.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAssignment.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}