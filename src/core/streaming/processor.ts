// Save as: src/core/streaming/processor.ts

import { DataPoint } from '../ai/pipeline';
import { EventEmitter } from 'events';

// Types and Interfaces
interface StreamConfig {
  batchSize: number;
  maxQueueSize: number;
  processingInterval: number;
  retentionPeriod: number;
}

interface BatchProcessingResult {
  processedCount: number;
  errors: Error[];
  timing: {
    start: number;
    end: number;
    duration: number;
  };
}

interface StreamMetrics {
  processedCount: number;
  errorCount: number;
  averageProcessingTime: number;
  queueSize: number;
  memoryUsage: number;
}

// Custom Queue Implementation
class StreamQueue<T> {
  private queue: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  enqueue(item: T): boolean {
    if (this.queue.length >= this.maxSize) {
      return false;
    }
    this.queue.push(item);
    return true;
  }

  dequeueMany(count: number): T[] {
    return this.queue.splice(0, count);
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}

// Memory Manager
class MemoryManager {
  private readonly maxMemoryUsage: number;
  private readonly warningThreshold: number;

  constructor(maxMemoryUsageMB: number = 1024, warningThresholdPercentage: number = 80) {
    this.maxMemoryUsage = maxMemoryUsageMB * 1024 * 1024;
    this.warningThreshold = this.maxMemoryUsage * (warningThresholdPercentage / 100);
  }

  checkMemoryUsage(): boolean {
    const used = process.memoryUsage().heapUsed;
    return used < this.maxMemoryUsage;
  }

  getMemoryMetrics(): {
    used: number;
    total: number;
    percentage: number;
    warning: boolean;
  } {
    const used = process.memoryUsage().heapUsed;
    return {
      used,
      total: this.maxMemoryUsage,
      percentage: (used / this.maxMemoryUsage) * 100,
      warning: used > this.warningThreshold
    };
  }
}

// Stream Processor
export class StreamProcessor extends EventEmitter {
  private readonly queue: StreamQueue<DataPoint>;
  private readonly memoryManager: MemoryManager;
  private readonly config: StreamConfig;
  private readonly metrics: StreamMetrics;
  private processingInterval: NodeJS.Timer | null = null;
  private isProcessing: boolean = false;

  constructor(config: Partial<StreamConfig> = {}) {
    super();
    this.config = {
      batchSize: config.batchSize || 1000,
      maxQueueSize: config.maxQueueSize || 10000,
      processingInterval: config.processingInterval || 100,
      retentionPeriod: config.retentionPeriod || 3600000 // 1 hour
    };

    this.queue = new StreamQueue<DataPoint>(this.config.maxQueueSize);
    this.memoryManager = new MemoryManager();
    this.metrics = {
      processedCount: 0,
      errorCount: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      memoryUsage: 0
    };
  }

  start(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(
      () => this.processBatch(),
      this.config.processingInterval
    );

    this.emit('started');
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    this.emit('stopped');
  }

  async addDataPoint(dataPoint: DataPoint): Promise<boolean> {
    if (!this.memoryManager.checkMemoryUsage()) {
      this.emit('memory-warning', this.memoryManager.getMemoryMetrics());
      return false;
    }

    const success = this.queue.enqueue(dataPoint);
    if (!success) {
      this.emit('queue-full', {
        queueSize: this.queue.size(),
        rejectedPoint: dataPoint
      });
    }

    this.updateMetrics();
    return success;
  }

  private async processBatch(): Promise<BatchProcessingResult> {
    if (this.isProcessing) {
      return {
        processedCount: 0,
        errors: [],
        timing: { start: 0, end: 0, duration: 0 }
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();
    const batch = this.queue.dequeueMany(this.config.batchSize);
    const errors: Error[] = [];

    try {
      // Process each data point in the batch
      for (const dataPoint of batch) {
        try {
          await this.processDataPoint(dataPoint);
          this.metrics.processedCount++;
        } catch (error) {
          errors.push(error as Error);
          this.metrics.errorCount++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update average processing time
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime * this.metrics.processedCount + duration) /
        (this.metrics.processedCount + 1);

      const result: BatchProcessingResult = {
        processedCount: batch.length,
        errors,
        timing: {
          start: startTime,
          end: endTime,
          duration
        }
      };

      this.emit('batch-processed', result);
      this.updateMetrics();
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  private async processDataPoint(dataPoint: DataPoint): Promise<void> {
    // Apply data point processing logic
    // This could include validation, transformation, or analysis
    if (!this.validateDataPoint(dataPoint)) {
      throw new Error('Invalid data point');
    }

    // Emit processed data point
    this.emit('data-processed', dataPoint);
  }

  private validateDataPoint(dataPoint: DataPoint): boolean {
    return (
      typeof dataPoint.timestamp === 'number' &&
      typeof dataPoint.value === 'number' &&
      dataPoint.timestamp > 0
    );
  }

  private updateMetrics(): void {
    this.metrics.queueSize = this.queue.size();
    this.metrics.memoryUsage = process.memoryUsage().heapUsed;

    this.emit('metrics-updated', this.metrics);
  }

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  clearQueue(): void {
    this.queue.clear();
    this.updateMetrics();
    this.emit('queue-cleared');
  }
}

// Memory-Efficient Window Manager
export class WindowManager {
  private readonly windows: Map<string, DataPoint[]>;
  private readonly windowSizes: Map<string, number>;
  private readonly retentionPeriod: number;

  constructor(retentionPeriod: number = 3600000) { // 1 hour default
    this.windows = new Map();
    this.windowSizes = new Map();
    this.retentionPeriod = retentionPeriod;
  }

  addToWindow(windowId: string, dataPoint: DataPoint, maxSize: number): void {
    if (!this.windows.has(windowId)) {
      this.windows.set(windowId, []);
      this.windowSizes.set(windowId, maxSize);
    }

    const window = this.windows.get(windowId)!;
    window.push(dataPoint);

    // Prune old data points
    const cutoffTime = Date.now() - this.retentionPeriod;
    while (window.length > 0 && window[0].timestamp < cutoffTime) {
      window.shift();
    }

    // Trim to max size if needed
    if (window.length > maxSize) {
      window.splice(0, window.length - maxSize);
    }
  }

  getWindow(windowId: string): DataPoint[] {
    return this.windows.get(windowId) || [];
  }

  clearWindow(windowId: string): void {
    this.windows.delete(windowId);
    this.windowSizes.delete(windowId);
  }

  getWindowMetrics(windowId: string): {
    size: number;
    maxSize: number;
    oldestTimestamp: number;
    newestTimestamp: number;
  } {
    const window = this.windows.get(windowId) || [];
    return {
      size: window.length,
      maxSize: this.windowSizes.get(windowId) || 0,
      oldestTimestamp: window[0]?.timestamp || 0,
      newestTimestamp: window[window.length - 1]?.timestamp || 0
    };
  }
}

// Usage example:
// const processor = new StreamProcessor();
// processor.on('data-processed', (dataPoint) => console.log('Processed:', dataPoint));
// processor.start();
// await processor.addDataPoint({ timestamp: Date.now(), value: 42 });
