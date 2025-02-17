// stream.ts

import { TransactionId } from '@irys/sdk';
import { AgentId } from '../core/nexus-agent-network';

/**
 * Represents a data stream source type
 */
export type StreamSource = 
  | 'blockchain'
  | 'api'
  | 'websocket'
  | 'database'
  | 'file'
  | 'sensor'
  | 'custom';

/**
 * Represents the status of a stream
 */
export type StreamStatus = 
  | 'initializing'
  | 'active'
  | 'paused'
  | 'error'
  | 'completed'
  | 'terminated';

/**
 * Represents the priority level of a stream
 */
export type StreamPriority = 
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'background';

/**
 * Configuration for stream validation
 */
export interface StreamValidationConfig {
  schema?: object;
  rules?: ValidationRule[];
  timeout: number;
  retryAttempts: number;
  errorThreshold: number;
}

/**
 * Represents a validation rule for stream data
 */
export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  condition?: any;
  errorMessage?: string;
}

/**
 * Configuration for stream processing
 */
export interface StreamConfig {
  batchSize: number;
  interval: number;
  retention: number;
  validation?: StreamValidationConfig;
  priority: StreamPriority;
  maxRetries: number;
  timeout: number;
  bufferSize: number;
  compression?: boolean;
  encryption?: boolean;
}

/**
 * Metadata associated with a stream
 */
export interface StreamMetadata {
  created: number;
  lastUpdated: number;
  owner: AgentId;
  tags: string[];
  version: string;
  checkpoints: StreamCheckpoint[];
  stats: StreamStats;
}

/**
 * Statistics for a stream
 */
export interface StreamStats {
  totalProcessed: number;
  successRate: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  lastBatchSize: number;
  peakThroughput: number;
  uptimePercentage: number;
}

/**
 * Represents a checkpoint in stream processing
 */
export interface StreamCheckpoint {
  id: string;
  timestamp: number;
  position: number;
  txId: TransactionId;
  state: any;
  metadata: {
    processedCount: number;
    errors: number;
    duration: number;
  };
}

/**
 * Configuration for stream error handling
 */
export interface ErrorHandlingConfig {
  retryStrategy: 'immediate' | 'exponential' | 'fixed';
  maxRetries: number;
  retryDelay: number;
  errorTypes: string[];
  fallbackAction?: 'skip' | 'cache' | 'terminate';
}

/**
 * Core stream interface
 */
export interface Stream {
  id: string;
  source: StreamSource;
  timestamp: number;
  data: any;
  status: StreamStatus;
  config: StreamConfig;
  metadata: StreamMetadata;
  errorHandling: ErrorHandlingConfig;
}

/**
 * Interface for a stream batch
 */
export interface StreamBatch {
  batchId: string;
  streamId: string;
  timestamp: number;
  items: any[];
  metadata: {
    size: number;
    sequenceNumber: number;
    checksum: string;
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  };
}

/**
 * Interface for stream processing results
 */
export interface StreamProcessingResult {
  streamId: string;
  batchId?: string;
  timestamp: number;
  success: boolean;
  data: any;
  metrics: {
    processingTime: number;
    itemsProcessed: number;
    errors: StreamError[];
    resourceUsage: ResourceUsage;
  };
  storage: {
    txId: TransactionId;
    verified: boolean;
  };
}

/**
 * Interface for stream errors
 */
export interface StreamError {
  code: string;
  message: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    streamId: string;
    position: number;
    data?: any;
  };
  stackTrace?: string;
}

/**
 * Interface for resource usage metrics
 */
export interface ResourceUsage {
  cpu: number;
  memory: number;
  storage: number;
  bandwidth: number;
  latency: number;
}

/**
 * Configuration for stream transformation
 */
export interface StreamTransformConfig {
  operations: TransformOperation[];
  validation?: StreamValidationConfig;
  errorHandling?: ErrorHandlingConfig;
}

/**
 * Interface for transform operations
 */
export interface TransformOperation {
  type: 'filter' | 'map' | 'reduce' | 'aggregate' | 'enrich';
  config: any;
  validation?: ValidationRule[];
}

/**
 * Factory function to create a new stream
 */
export function createStream(
  source: StreamSource,
  config: Partial<StreamConfig> = {}
): Stream {
  const timestamp = Date.now();
  const id = generateStreamId(source, timestamp);

  return {
    id,
    source,
    timestamp,
    data: null,
    status: 'initializing',
    config: {
      batchSize: 100,
      interval: 1000,
      retention: 30,
      priority: 'medium',
      maxRetries: 3,
      timeout: 5000,
      bufferSize: 1000,
      ...config
    },
    metadata: {
      created: timestamp,
      lastUpdated: timestamp,
      owner: '',
      tags: [],
      version: '1.0.0',
      checkpoints: [],
      stats: {
        totalProcessed: 0,
        successRate: 1,
        averageLatency: 0,
        errorRate: 0,
        throughput: 0,
        lastBatchSize: 0,
        peakThroughput: 0,
        uptimePercentage: 100
      }
    },
    errorHandling: {
      retryStrategy: 'exponential',
      maxRetries: 3,
      retryDelay: 1000,
      errorTypes: ['timeout', 'connection', 'validation']
    }
  };
}

/**
 * Generate a unique stream ID
 */
function generateStreamId(source: StreamSource, timestamp: number): string {
  return `${source}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  createStream
};
