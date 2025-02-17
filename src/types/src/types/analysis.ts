// analysis.ts

import { TransactionId } from '@irys/sdk';
import { Stream } from './stream';
import { ProcessingOptions } from './processing';

/**
 * Types of pattern analysis
 */
export type PatternType = 
  | 'temporal'
  | 'spatial'
  | 'sequential'
  | 'cyclical'
  | 'structural'
  | 'behavioral'
  | 'anomaly'
  | 'custom';

/**
 * Types of predictions
 */
export type PredictionType =
  | 'classification'
  | 'regression'
  | 'timeSeries'
  | 'clustering'
  | 'recommendation'
  | 'anomalyPrediction'
  | 'custom';

/**
 * Time horizons for predictions
 */
export type PredictionHorizon = 
  | 'immediate'
  | 'shortTerm'
  | 'mediumTerm'
  | 'longTerm';

/**
 * Confidence levels
 */
export type ConfidenceLevel = 
  | 'veryLow'
  | 'low'
  | 'medium'
  | 'high'
  | 'veryHigh';

/**
 * Core pattern analysis interface
 */
export interface PatternAnalysis {
  id: string;
  timestamp: number;
  type: PatternType;
  patterns: Pattern[];
  metadata: PatternMetadata;
  confidence: number;
  validation: ValidationResults;
  storage?: StorageInfo;
}

/**
 * Individual pattern interface
 */
export interface Pattern {
  id: string;
  type: PatternType;
  description: string;
  confidence: number;
  support: number;
  importance: number;
  features: string[];
  relationships: Relationship[];
  temporal?: TemporalInfo;
  metrics: PatternMetrics;
}

/**
 * Pattern relationships
 */
export interface Relationship {
  type: 'correlation' | 'causation' | 'sequence' | 'hierarchy';
  source: string;
  target: string;
  strength: number;
  direction: 'positive' | 'negative' | 'bidirectional';
  confidence: number;
}

/**
 * Temporal information for patterns
 */
export interface TemporalInfo {
  startTime: number;
  endTime: number;
  duration: number;
  frequency: number;
  periodicity?: number;
  seasonality?: {
    period: number;
    strength: number;
    phase: number;
  };
}

/**
 * Pattern metadata
 */
export interface PatternMetadata {
  analysisVersion: string;
  dataPoints: number;
  dimensions: string[];
  timeframe: {
    start: number;
    end: number;
  };
  modelInfo: {
    type: string;
    version: string;
    parameters: Map<string, any>;
  };
}

/**
 * Pattern metrics
 */
export interface PatternMetrics {
  frequency: number;
  coverage: number;
  distinctiveness: number;
  stability: number;
  complexity: number;
  customMetrics: Map<string, number>;
}

/**
 * Core prediction interface
 */
export interface Prediction {
  id: string;
  timestamp: number;
  type: PredictionType;
  horizon: PredictionHorizon;
  predictions: PredictionItem[];
  confidence: number;
  metadata: PredictionMetadata;
  validation: ValidationResults;
  storage?: StorageInfo;
}

/**
 * Individual prediction item
 */
export interface PredictionItem {
  id: string;
  timestamp: number;
  target: string;
  value: any;
  confidence: number;
  probability?: number;
  range?: {
    min: number;
    max: number;
    confidence: number;
  };
  features: Map<string, any>;
  explanation?: string;
}

/**
 * Prediction metadata
 */
export interface PredictionMetadata {
  modelVersion: string;
  dataPoints: number;
  features: string[];
  horizon: {
    start: number;
    end: number;
  };
  modelInfo: {
    type: string;
    version: string;
    parameters: Map<string, any>;
  };
  performance: ModelPerformance;
}

/**
 * Model performance metrics
 */
export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  customMetrics: Map<string, number>;
}

/**
 * Validation results
 */
export interface ValidationResults {
  isValid: boolean;
  score: number;
  checks: ValidationCheck[];
  timestamp: number;
}

/**
 * Individual validation check
 */
export interface ValidationCheck {
  type: string;
  passed: boolean;
  score: number;
  details: string;
  timestamp: number;
}

/**
 * Storage information
 */
export interface StorageInfo {
  txId: TransactionId;
  timestamp: number;
  location: string;
  size: number;
  metadata: {
    compression: boolean;
    encryption: boolean;
    checksum: string;
  };
}

/**
 * Analysis configuration
 */
export interface AnalysisConfig {
  patterns: PatternAnalysisConfig;
  predictions: PredictionConfig;
  validation: ValidationConfig;
  resources: ResourceConfig;
}

/**
 * Pattern analysis configuration
 */
export interface PatternAnalysisConfig {
  types: PatternType[];
  minConfidence: number;
  maxPatterns: number;
  temporalWindow: number;
  featureImportance: boolean;
  complexityThreshold: number;
}

/**
 * Prediction configuration
 */
export interface PredictionConfig {
  types: PredictionType[];
  horizon: PredictionHorizon;
  minConfidence: number;
  maxPredictions: number;
  ensembleSize: number;
  featureSelection: boolean;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  minScore: number;
  checks: string[];
  crossValidation: boolean;
  testSize: number;
  metrics: string[];
}

/**
 * Resource configuration
 */
export interface ResourceConfig {
  maxMemory: number;
  maxCpu: number;
  timeout: number;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Factory function to create a pattern analysis
 */
export function createPatternAnalysis(
  type: PatternType,
  stream: Stream,
  options: ProcessingOptions
): PatternAnalysis {
  const timestamp = Date.now();
  return {
    id: `pat_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    type,
    patterns: [],
    metadata: {
      analysisVersion: '1.0.0',
      dataPoints: 0,
      dimensions: [],
      timeframe: {
        start: timestamp,
        end: timestamp
      },
      modelInfo: {
        type: 'default',
        version: '1.0.0',
        parameters: new Map()
      }
    },
    confidence: 0,
    validation: {
      isValid: false,
      score: 0,
      checks: [],
      timestamp
    }
  };
}

/**
 * Factory function to create a prediction
 */
export function createPrediction(
  type: PredictionType,
  horizon: PredictionHorizon,
  stream: Stream,
  options: ProcessingOptions
): Prediction {
  const timestamp = Date.now();
  return {
    id: `pred_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp,
    type,
    horizon,
    predictions: [],
    confidence: 0,
    metadata: {
      modelVersion: '1.0.0',
      dataPoints: 0,
      features: [],
      horizon: {
        start: timestamp,
        end: timestamp
      },
      modelInfo: {
        type: 'default',
        version: '1.0.0',
        parameters: new Map()
      },
      performance: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        customMetrics: new Map()
      }
    },
    validation: {
      isValid: false,
      score: 0,
      checks: [],
      timestamp
    }
  };
}

/**
 * Factory function to create analysis configuration
 */
export function createAnalysisConfig(
  override: Partial<AnalysisConfig> = {}
): AnalysisConfig {
  return {
    patterns: {
      types: ['temporal', 'sequential', 'structural'],
      minConfidence: 0.7,
      maxPatterns: 100,
      temporalWindow: 86400000, // 24 hours
      featureImportance: true,
      complexityThreshold: 0.8
    },
    predictions: {
      types: ['timeSeries', 'classification'],
      horizon: 'mediumTerm',
      minConfidence: 0.8,
      maxPredictions: 100,
      ensembleSize: 5,
      featureSelection: true
    },
    validation: {
      minScore: 0.7,
      checks: ['crossValidation', 'stability', 'significance'],
      crossValidation: true,
      testSize: 0.2,
      metrics: ['accuracy', 'f1Score', 'precision', 'recall']
    },
    resources: {
      maxMemory: 1024 * 1024 * 1024, // 1GB
      maxCpu: 80, // 80% CPU usage
      timeout: 300000, // 5 minutes
      priority: 'medium'
    },
    ...override
  };
}

export default {
  createPatternAnalysis,
  createPrediction,
  createAnalysisConfig
};
