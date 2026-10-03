export interface AIComponentItem {
  name: string;
  type: string;
  description: string;
}

export interface AIRelationshipItem {
  from: string;
  to: string;
  relationship: string;
}

export interface AIPotentialIssueItem {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

export interface AISuggestionItem {
  title: string;
  description: string;
}

export interface AIDiagramAnalysisResult {
  diagramType: string;
  confidence: number;
  components: AIComponentItem[];
  relationships: AIRelationshipItem[];
  dataFlow: string[];
  summary: string;
  potentialIssues: AIPotentialIssueItem[];
  suggestions: AISuggestionItem[];
}

// UPGRADED AI WHITEBOARD ASSISTANT TYPES

export interface AIGeneratedObject {
  id: string;
  type:
    | 'brush'
    | 'eraser'
    | 'line'
    | 'arrow'
    | 'rectangle'
    | 'ellipse'
    | 'triangle'
    | 'diamond'
    | 'polygon'
    | 'text'
    | 'sticky'
    | 'connector';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  color?: string;
  fillColor?: string;
  strokeWidth?: number;
  size?: number;
  fontSize?: number;
  text?: string;
  fromId?: string;
  toId?: string;
  points?: { x: number; y: number }[];
}

export interface AIGenerateWhiteboardResponse {
  title: string;
  description: string;
  objects: AIGeneratedObject[];
}

export type WhiteboardAIAction =
  | 'analyze'
  | 'summarize'
  | 'explain'
  | 'solve'
  | 'check'
  | 'generate_questions'
  | 'study_notes'
  | 'find_mistakes'
  | 'improve'
  | 'custom_question'
  | 'generate_whiteboard';

export type WhiteboardAIContextType =
  | 'education'
  | 'mathematics'
  | 'science'
  | 'software'
  | 'business'
  | 'planning'
  | 'general'
  | 'unknown';

export interface WhiteboardAIContext {
  type: WhiteboardAIContextType;
  label: string;
  confidence: number;
}

export interface WhiteboardAIAnalysisDetails {
  explanation?: string;
  mistakes?: string[];
  suggestions?: string[];
  stepByStep?: string[];
}

export interface WhiteboardAIResult {
  context: WhiteboardAIContext;
  observations: string[];
  inferences: string[];
  uncertainties: string[];
  summary: string;
  keyPoints: string[];
  analysis: WhiteboardAIAnalysisDetails;
  questions: string[];
  customAnswer?: string;
  generatedContent?: AIGenerateWhiteboardResponse;
}
