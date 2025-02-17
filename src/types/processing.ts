// processing.ts

import { TransactionId } from '@irys/sdk';
import { Stream, StreamBatch, StreamError } from './stream';
import { PatternAnalysis, Prediction } from './analysis';
import { ComputationProof } from '../core/nexus-agent-network';

/**
 * Processing priority levels
 */
export type ProcessingPriority = 'realtime' | 'high' | 'normal' | 'low' | 'batch';

/**
 * Verification levels for processing
 */
export type VerificationLevel = 'none' | 'basic' | 'enhanced' | 'full';

/**
 * Processing status types
 */
export type ProcessingStatus = 
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'verified'
  | 'archived';

/**
 * Options for processing configuration
 */
export interface ProcessingOptions {
  priority: ProcessingPriority;
  verificationLevel: VerificationLevel;
  retentionPeriod: number; // in days
  maxRetries: number;
  timeout: number;
  batchSize?: number;
  parallelProcessing?: boolean;
  compressionEnabled?: boolean;
  cachingEnabled?: boolean;
  resourceLimits?: ResourceLimits;
}

/**
 * Resource limits for processing
 */
export interface ResourceLimits {
  maxMemory: number;
  maxCpu: number;
  maxStorage: number;
  maxBandwidth: number;
  maxDuration: number;
}

/**
 * Result of processing operations
 */
export interface ProcessingResult {
  id: string;
  streamId: string;
  batchId?: string;
  timestamp: number;
  status: ProcessingStatus;
  patterns: PatternAnalysis;
  predictions: Prediction;
  insights: ProcessingInsights;
  metadata: ProcessingMetadata;
  metrics: ProcessingMetrics;
  storage: StorageInfo;
  verification: VerificationInfo;
}

/**
 * Insights generated during processing
 */
export interface ProcessingInsights {
  summary: string;
  confidence: number;
  recommendations: string[];
  anomalies: AnomalyDetection[];
  correlations: CorrelationAnalysis[];
  trends: TrendAnalysis[];
  metadata: {
    generationTime: number;
    modelVersion: string;
    dataPoints: number;
  };
}

/**
 * Anomaly detection results
 */
export interface AnomalyDetection {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  timestamp: number;
  details: {
    description: string;
    affectedMetrics: string[];
    threshold: number;
    actualValue: number;
  };
}

/**
 * Correlation analysis results
 */
export interface CorrelationAnalysis {
  variables: string[];
  coefficient: number;
  significance: number;
  direction: 'positive' | 'negative';
  strength: 'weak' | 'moderate' | 'strong';
  metadata: {
    sampleSize: number;
    timeframe: string;
  };
}

/**
 * Trend analysis results
 */
export interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number;
  period: string;
  confidence: number;
  seasonality?: {
    pattern: string;
    strength: number;
    period: number;
  };
}

/**
 * Metadata for processing operations
 */
export interface ProcessingMetadata {
  startTime: number;
  endTime: number;
  duration: number;
  options: ProcessingOptions;
  version: string;
  agent: string;
  checkpoints: ProcessingCheckpoint[];
}

/**
 * Checkpoint information during processing
 */
export interface ProcessingCheckpoint {
  id: string;
  timestamp: number;
  stage: string;
  status: ProcessingStatus;
  metrics: {
    duration: number;
    resourceUsage: ResourceUsage;
    itemsProcessed: number;
  };
}

/**
 * Resource usage during processing
 */
export interface ResourceUsage {
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  bandwidthUsage: number;
  latency: number;
}

/**
 * Metrics collected during processing
 */
export interface ProcessingMetrics {
  // Performance metrics
  totalProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  latency: number;
  
  // Quality metrics
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  
  // Resource metrics
  resourceUsage: ResourceUsage;
  
  // Custom metrics
  customMetrics: Map<string, number>;
}

/**
 * Information about storage operations
 */
export interface StorageInfo {
  txId: TransactionId;
  timestamp: number;
  size: number;
  proof: ComputationProof;
  location: string;
  verified: boolean;
  metadata: {
    compression: boolean;
    encryption: boolean;
    checksum: string;
  };
}

/**
 * Information about verification operations
 */
export interface VerificationInfo {
  level: VerificationLevel;
  status: 'pending' | 'verified' | 'failed';
  timestamp: number;
  proof?: ComputationProof;
  details: {
    checksCompleted: string[];
    validationResults: Map<string, boolean>;
    errorDetails?: string[];
  };
}

/**
 * Configuration for the processing pipeline
 */
export interface ProcessingPipelineConfig {
  stages: ProcessingStage[];
  validation: ValidationConfig;
  errorHandling: ErrorHandlingConfig;
  monitoring: MonitoringConfig;
}

/**
 * Individual processing stage configuration
 */
export interface ProcessingStage {
  id: string;
  type: 'analysis' | 'prediction' | 'insight' | 'verification';
  config: any;
  dependencies?: string[];
  timeout: number;
  retries: number;
}

/**
 * Configuration for validation
 */
export interface ValidationConfig {
  schemas: Map<string, object>;
  rules: ValidationRule[];
  errorThreshold: number;
  validationTimeout: number;
}

/**
 * Individual validation rule
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  condition: any;
  errorMessage: string;
}

/**
 * Configuration for error handling
 */
export interface ErrorHandlingConfig {
  retryStrategy: 'immediate' | 'exponential' | 'fixed';
  maxRetries: number;
  retryDelay: number;
  errorTypes: string[];
  fallbackAction: 'skip' | 'cache' | 'terminate';
}

/**
 * Configuration for monitoring
 */
export interface MonitoringConfig {
  metrics: string[];
  interval: number;
  alertThresholds: Map<string, number>;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Factory function to create processing options
 */
export function createProcessingOptions(
  override: Partial<ProcessingOptions> = {}
): ProcessingOptions {
  return {
    priority: 'normal',
    verificationLevel: 'enhanced',
    retentionPeriod: 30,
    maxRetries: 3,
    timeout: 5000,
    batchSize: 100,
    parallelProcessing: true,
    compressionEnabled: true,
    cachingEnabled: true,
    resourceLimits: {
      maxMemory: 1024 * 1024 * 1024, // 1GB
      maxCpu: 80, // 80% CPU usage
      maxStorage: 5 * 1024 * 1024 * 1024, // 5GB
      maxBandwidth: 100 * 1024 * 1024, // 100MB/s
      maxDuration: 300000 // 5 minutes
    },
    ...override
  };
}

/**
 * Create an empty processing result
 */
export function createEmptyProcessingResult(
  streamId: string,
  options: ProcessingOptions
): ProcessingResult {
  const timestamp = Date.now();
  return {
    id: `proc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    streamId,
    timestamp,
    status: 'queued',
    patterns: null,
    predictions: null,
    insights: null,
    metadata: {
      startTime: timestamp,
      endTime: null,
      duration: 0,
      options,
      version: '1.0.0',
      agent: '',
      checkpoints: []
    },
    metrics: {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      errorRate: 0,
      throughput: 0,
      latency: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0,
        storageUsage: 0,
        bandwidthUsage: 0,
        latency: 0
      },
      customMetrics: new Map()
    },
    storage: null,
    verification: {
      level: options.verificationLevel,
      status: 'pending',
      timestamp,
      details: {
        checksCompleted: [],
        validationResults: new Map()
      }
    }
  };
}

export default {
  createProcessingOptions,
  createEmptyProcessingResult
};
