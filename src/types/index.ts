// Save as: src/types/index.ts

/**
 * Represents a data point in a stream
 * @interface StreamData
 */
export interface StreamData {
  /** Unique identifier for the stream */
  streamId: number;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Numerical value of the data point */
  value: number;
  /** Optional blockchain transaction ID */
  txId?: string;
}

/**
 * Configuration for a data stream
 * @interface StreamConfig
 */
export interface StreamConfig {
  /** Type of the stream */
  type: 'financial' | 'analytics' | 'custom';
  /** Human-readable name */
  name: string;
  /** Optional description */
  description?: string;
  /** Stream settings */
  settings: {
    /** Data points per second (1-100) */
    dataRate: number;
    /** Data retention period in seconds */
    retentionPeriod: number;
    /** Whether to store data on blockchain */
    storageEnabled: boolean;
  };
}

// Save as: src/docs/API.md

# API Documentation

## Agents

### Stream Enabled Agent

The stream-enabled agent provides real-time data streaming capabilities with blockchain integration.

#### Creation

```typescript
const agent = createStreamEnabledAgent({
  groqApiKey: string;
  privateKey: string;
  jwtSecret: string;
  defaultChain?: string;
});
```

#### Actions

1. `create-stream`
   - Creates a new data stream
   - Parameters: `StreamConfig`
   - Returns: `{ success: boolean, streamId: number }`

2. `add-stream-data`
   - Adds data to an existing stream
   - Parameters: `Stream
