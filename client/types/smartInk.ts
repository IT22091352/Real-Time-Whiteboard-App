import { Point, StrokeData } from './whiteboard';

export type SmartInkCategory = 'text' | 'math' | 'science' | 'number';

export interface SmartInkGrounding {
  observation: string;
  interpretation: string;
  uncertainty: string;
}

export interface SmartInkResponseData {
  primary: string;
  candidates: string[];
  confidence: number;
  category: SmartInkCategory;
  latex?: string | null;
  grounding?: SmartInkGrounding;
}

export interface HandwritingGroup {
  id: string;
  strokeIds: string[];
  strokes: StrokeData[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lastUpdated: number;
}

export interface SmartInkSuggestion {
  id: string;
  group: HandwritingGroup;
  primary: string;
  candidates: string[];
  confidence: number;
  category: SmartInkCategory;
  latex?: string | null;
  grounding?: SmartInkGrounding;
  createdTime: number;
}

export interface SmartInkSettings {
  enabled: boolean;        // Master toggle (default: true)
  smartReplace: boolean;   // True Auto Replace setting (default: true)
  keepHandwriting: boolean; // Keep original strokes option (default: false)
  confidenceThreshold: number; // Threshold for auto replace (default: 0.90)
}
