export interface Module {
  id: number;
  title: string;
  description: string;
  duration: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  objectives: string[];
  teacherId: number;
  isActive: boolean;
  createdAt: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  type: 'text' | 'gis' | 'mixed';
  moduleId: number;
  points: number;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  writtenResponse?: string;
  mapData?: any;
  attachments?: string[];
  status: 'draft' | 'submitted' | 'graded';
  submittedAt?: string;
  createdAt: string;
}

export interface Grade {
  id: number;
  submissionId: number;
  score: number;
  maxScore: number;
  feedback?: string;
  rubric?: Record<string, number>;
  gradedAt: string;
  gradedBy: number;
}

export interface MapData {
  zoom: number;
  center: [number, number];
  layers: LayerData[];
  annotations: Annotation[];
}

export interface LayerData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  opacity: number;
  data?: any;
}

export interface Annotation {
  id: string;
  type: 'point' | 'line' | 'polygon' | 'text';
  coordinates: any;
  properties: {
    color?: string;
    fillColor?: string;
    strokeColor?: string;
    opacity?: number;
    text?: string;
  };
}
