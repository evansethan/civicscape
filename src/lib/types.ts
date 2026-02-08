export interface Class {
  id: number;
  title: string;
  description: string;
  weeks: number;
  lessons: number;
  grade_level: 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';
  objectives: string[];
  teacherId: number;
  isActive: boolean;
  createdAt: string;
}

export interface Unit {
  id: number;
  title: string;
  description?: string;
  classId: number;
  order: number;
  createdAt: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  type: 'text' | 'gis' | 'mixed';
  classId: number;
  unitId?: number;
  points: number;
  dueDate: string;
  isActive: boolean;
  isGraded?: boolean;
  attachments?: string[];
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
