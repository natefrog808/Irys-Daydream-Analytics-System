// Save as: src/core/memory/manager.ts

import { DataPoint } from '../ai/pipeline';
import { EventEmitter } from 'events';

// Types and Interfaces
interface MemoryStats {
  totalEntries: number;
  cacheSize: number;
  persistentSize: number;
  memoryUsage: number;
  lastGCTime: number;
}

interface CacheConfig {
  maxSize: number;
  ttl: number;
  cleanupInterval: number;
}

interface StorageConfig {
  maxSize: number;
  persistenceThreshold: number;
  compressionThreshold: number;
}

// LRU Cache Implementation
class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private readonly maxSize: number;
  private readonly ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry.timestamp)) {
      this.cache.delete(key);
      return undefined;
    }

    // Update timestamp on access
    this.cache.set(key, { ...entry, timestamp: Date.now() });
    return entry.value;
  }

  private evictOldest(): void {
    const oldest = [...this.cache.entries()]
      .reduce((oldest, current) => {
        return oldest[1].timestamp < current[1].timestamp ? oldest : current;
      });
    this.cache.delete(oldest[0]);
  }

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.ttl;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Compression Utility
class CompressionUtil {
  static compress(data: any): Buffer {
    // Simple JSON compression for demonstration
    // In production, use a proper compression library
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString);
  }

  static decompress(data: Buffer): any {
    // Simple JSON decompression
    return JSON.parse(data.toString());
  }

  static shouldCompress(data: any): boolean {
    const size = JSON.stringify(data).length;
    return size > 1024; // Compress if larger than 1KB
  }
}

// Persistent Storage Manager
class StorageManager {
  private storage: Map<string, Buffer>;
  private readonly config: StorageConfig;

  constructor(config: StorageConfig) {
    this.storage = new Map();
    this.config = config;
  }

  async store(key: string, data: any): Promise<void> {
    const shouldCompress = CompressionUtil.shouldCompress(data);
    const processedData = shouldCompress
      ? CompressionUtil.compress(data)
      : Buffer.from(JSON.stringify(data));

    if (this.storage.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.storage.set(key, processedData);
  }

  async retrieve(key: string): Promise<any | undefined> {
    const data = this.storage.get(key);
    if (!data) return undefined;

    try {
      return CompressionUtil.decompress(data);
    } catch {
      return JSON.parse(data.toString());
    }
  }

  private evictOldest(): void {
    const oldest = [...this.storage.keys()][0];
    this.storage.delete(oldest);
  }

  size(): number {
    return this.storage.size;
  }
}

// Main Memory Manager
export class MemoryManager extends EventEmitter {
  private readonly cache: LRUCache<string, DataPoint>;
  private readonly storage: StorageManager;
  private readonly cacheConfig: CacheConfig;
  private readonly storageConfig: StorageConfig;
  private cleanupInterval: NodeJS.Timer | null = null;

  constructor(
    cacheConfig: Partial<CacheConfig> = {},
    storageConfig: Partial<StorageConfig> = {}
  ) {
    super();
    
    this.cacheConfig = {
      maxSize: cacheConfig.maxSize || 1000,
      ttl: cacheConfig.ttl || 60000, // 1 minute
      cleanupInterval: cacheConfig.cleanupInterval || 30000 // 30 seconds
    };

    this.storageConfig = {
      maxSize: storageConfig.maxSize || 10000,
      persistenceThreshold: storageConfig.persistenceThreshold || 100,
      compressionThreshold: storageConfig.compressionThreshold || 1024
    };

    this.cache = new LRUCache<string, DataPoint>(
      this.cacheConfig.maxSize,
      this.cacheConfig.ttl
    );

    this.storage = new StorageManager(this.storageConfig);
    this.startCleanupInterval();
  }

  async store(key: string, data: DataPoint): Promise<void> {
    // Store in cache
    this.cache.set(key, data);

    // Check if should persist
    if (this.shouldPersist(data)) {
      await this.storage.store(key, data);
      this.emit('data-persisted', { key, data });
    }

    this.emit('memory-updated', this.getStats());
  }

  async retrieve(key: string): Promise<DataPoint | undefined> {
    // Try cache first
    let data = this.cache.get(key);
    if (data) {
      this.emit('cache-hit', { key });
      return data;
    }

    // Try persistent storage
    data = await this.storage.retrieve(key);
    if (data) {
      this.cache.set(key, data); // Cache for future use
      this.emit('storage-hit', { key });
      return data;
    }

    this.emit('miss', { key });
    return undefined;
  }

  private shouldPersist(data: DataPoint): boolean {
    const threshold = this.storageConfig.persistenceThreshold;
    const importanceScore = this.calculateImportance(data);
    return importanceScore > threshold;
  }

  private calculateImportance(data: DataPoint): number {
    // Implement importance calculation logic
    // This could consider factors like:
    // - Data age
    // - Access frequency
    // - Value volatility
    // For now, return a random score
    return Math.random() * 100;
  }

  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      this.cacheConfig.cleanupInterval
    );
  }

  private async cleanup(): Promise<void> {
    const beforeStats = this.getStats();
    
    // Perform cleanup operations
    this.cache.clear();
    
    const afterStats = this.getStats();
    this.emit('cleanup-completed', { beforeStats, afterStats });
  }

  getStats(): MemoryStats {
    return {
      totalEntries: this.cache.size() + this.storage.size(),
      cacheSize: this.cache.size(),
      persistentSize: this.storage.size(),
      memoryUsage: process.memoryUsage().heapUsed,
      lastGCTime: Date.now()
    };
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Enhanced Memory Context Manager
export class MemoryContextManager {
  private readonly memoryManager: MemoryManager;
  private readonly contexts: Map<string, Set<string>>;

  constructor(memoryManager: MemoryManager) {
    this.memoryManager = memoryManager;
    this.contexts = new Map();
  }

  async storeInContext(contextId: string, key: string, data: DataPoint): Promise<void> {
    await this.memoryManager.store(key, data);

    if (!this.contexts.has(contextId)) {
      this.contexts.set(contextId, new Set());
    }
    this.contexts.get(contextId)!.add(key);
  }

  async retrieveContext(contextId: string): Promise<DataPoint[]> {
    const keys = this.contexts.get(contextId);
    if (!keys) return [];

    const results = await Promise.all(
      Array.from(keys).map(key => this.memoryManager.retrieve(key))
    );

    return results.filter((data): data is DataPoint => data !== undefined);
  }

  async clearContext(contextId: string): Promise<void> {
    this.contexts.delete(contextId);
  }

  getContextSize(contextId: string): number {
    return this.contexts.get(contextId)?.size || 0;
  }
}

// Example usage:
/*
const memoryManager = new MemoryManager();
const contextManager = new MemoryContextManager(memoryManager);

memoryManager.on('data-persisted', ({ key, data }) => {
  console.log(`Data persisted: ${key}`);
});

await contextManager.storeInContext('analysis-1', 'data-1', {
  timestamp: Date.now(),
  value: 42
});

const contextData = await contextManager.retrieveContext('analysis-1');
*/
