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
   - Parameters: `StreamData`
   - Returns: `{ success: boolean, dataPoint: StreamData }`

## Components

### IntegratedDataViz

React component for real-time data visualization.

```typescript
<IntegratedDataViz agent={streamEnabledAgent} />
```

#### Props
- `agent`: Instance of StreamEnabledAgent

#### Features
- Real-time data streaming (1-100 points/second)
- Up to 5 concurrent streams
- Statistical analysis
- Data export

## Error Handling

### Retry Mechanism

```typescript
await withRetry(
  async () => {
    // Your async operation
  },
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffFactor: 2
  }
);
```

### Error Types

1. `StreamError`
   - For stream-related operations
   - Includes error code and metadata

2. `BlockchainError`
   - For blockchain operations
   - Includes transaction hash and metadata

## Testing

### Unit Tests

Run unit tests:
```bash
npm run test:unit
```

### Integration Tests

Run integration tests:
```bash
npm run test:integration
```

### Performance Tests

Run performance benchmarks:
```bash
npm run test:bench
```

## Security

### Authentication
- JWT-based authentication
- Rate limiting
- Input validation

### Data Validation
All inputs are validated using Zod schemas:

```typescript
const streamConfigSchema = z.object({
  type: z.enum(['financial', 'analytics', 'custom']),
  name: z.string(),
  settings: z.object({
    dataRate: z.number().min(1).max(100),
    retentionPeriod: z.number().min(1),
    storageEnabled: z.boolean()
  })
});
```

## Performance Considerations

1. Data Retention
   - Configurable retention periods
   - Automatic data pruning
   - Memory usage optimization

2. Streaming Performance
   - Rate limiting
   - Batch processing
   - Optimized rendering
