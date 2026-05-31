// IELTS Writing Coach Pro - Type Definitions

// ============================================
// Common Types
// ============================================

export interface GrammaticalRange {
  score: number;
  feedback: string;
  examples: string[];
}

export interface LexicalResource {
  score: number;
  feedback: string;
  examples: string[];
}

export interface CoherenceCohesion {
  score: number;
  feedback: string;
  examples: string[];
}

export interface TaskAchievement {
  score: number;
  feedback: string;
  examples: string[];
}

// ============================================
// Grammar Error Types
// ============================================

export interface GrammarError {
  original: string;
  correction: string;
  context: string;
  reason: string;
}

export interface GrammarErrors {
  third_person_singular: GrammarError[];
  tense: GrammarError[];
  part_of_speech: GrammarError[];
  preposition: GrammarError[];
  redundant_preposition: GrammarError[];
  infinitive: GrammarError[];
  article: GrammarError[];
  noun_plural: GrammarError[];
  sentence_fluency: GrammarError[];
}

// ============================================
// Logic Analysis Types
// ============================================

export interface SubArgument {
  point_id: number;
  claim: string;
  reason: string;
  evidence: string;
  is_present_in_user_essay?: boolean;
  status?: '缺失' | '已覆盖';
}

export interface LogicAnalysis {
  topic: string;
  user_position: string;
  missing_angles: string[];
  optimal_outline: SubArgument[];
  missing_count?: number;
  diagnostic?: string;
}

// ============================================
// Round 1 Types (Academic/GT Writing Task 1)
// ============================================

export interface Overview {
  key_features: string[];
  summary: string;
}

export interface BandScoreAnalysis {
  grammatical_range: GrammaticalRange;
  lexical_resource: LexicalResource;
  coherence_cohesion: CoherenceCohesion;
  task_achievement: TaskAchievement;
}

export interface WritingFeedback {
  overall_band: number;
  band_score_analysis: BandScoreAnalysis;
  overall_comment: string;
  suggested_improvements: string[];
}

export interface Round1GradingResult {
  user_answer: string;
  grading_result: {
    overview: Overview;
    detailed_feedback: {
      introduction: string;
      body_paragraphs: string[];
      conclusion: string;
    };
    band_scores: {
      task_achievement: number;
      coherence_cohesion: number;
      lexical_resource: number;
      grammatical_range: number;
    };
    overall_band: number;
    logic_analysis: LogicAnalysis;
    grammar_errors: GrammarErrors;
    writing_feedback: WritingFeedback;
  };
  metadata: {
    question_type: string;
    processing_time_ms: number;
    model_used: string;
  };
}

// ============================================
// Round 2 Types (Essay Writing)
// ============================================

export interface Round2GradingResult {
  user_answer: string;
  grading_result: {
    analysis: {
      topic: string;
      perspective: string;
      requirements: string[];
    };
    criteria_analysis: {
      task_response: TaskAchievement;
      coherence_cohesion: CoherenceCohesion;
      lexical_resource: LexicalResource;
      grammatical_range: GrammaticalRange;
    };
    essay_structure: {
      introduction: {
        paraphrase: string;
        outline: string;
      };
      body_paragraphs: {
        paragraph1: {
          topic_sentence: string;
          explanation: string;
          example: string;
        };
        paragraph2: {
          topic_sentence: string;
          explanation: string;
          example: string;
        };
      };
      conclusion: {
        summary: string;
        final_thought: string;
      };
    };
    final_band_score: {
      breakdown: {
        task_response: number;
        coherence_cohesion: number;
        lexical_resource: number;
        grammatical_range: number;
      };
      overall_band: number;
    };
    detailed_feedback: {
      strengths: string[];
      weaknesses: string[];
      specific_improvements: string[];
    };
  };
  metadata: {
    question_type: string;
    processing_time_ms: number;
    model_used: string;
  };
}

// ============================================
// API Types
// ============================================

export interface GradingRequest {
  question_type: 'round1' | 'round2';
  question: string;
  user_answer: string;
}

export interface GradingResponse {
  success: boolean;
  data?: Round1GradingResult | Round2GradingResult;
  error?: string;
}

// ============================================
// App State Types
// ============================================

export interface Question {
  id: string;
  type: 'round1' | 'round2';
  title: string;
  prompt: string;
  sample_answer?: string;
}

export interface WritingSession {
  id: string;
  question: Question;
  userAnswer: string;
  status: 'draft' | 'submitted' | 'graded';
  result?: Round1GradingResult | Round2GradingResult;
  createdAt: Date;
  updatedAt: Date;
}

export type AppMode = 'development' | 'production';