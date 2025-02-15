# Nexus Stream AI API Documentation

## Overview

Nexus Stream AI provides a powerful API for real-time data streaming, pattern analysis, and blockchain integration. This documentation covers all available endpoints, components, and integration points.

## Authentication

All API requests require authentication using JWT tokens:

```typescript
const headers = {
  'Authorization': 'Bearer your-jwt-token',
  'Content-Type': 'application/json'
};
```

### Getting an API Token

```typescript
const response = await fetch('/api/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey: 'your-api-key',
    secret: 'your-secret'
  })
});

const { token } = await response.json();
```

## Stream Management

### Create Stream

Creates a new data stream with specified configuration.

```typescript
POST /api/streams
Content-Type: application/json

{
  "name": "BTC Price Stream",
  "type": "financial",
  "config": {
    "dataRate": 1000,
    "retentionPeriod": 3600,
    "storageEnabled": true
  }
}

// Response
{
  "streamId": "stream-123",
  "status": "active",
  "createdAt": "2025-02-15T10:00:00Z"
}
```

### Add Data to Stream

Adds data points to an existing stream.

```typescript
POST /api/streams/{streamId}/data
Content-Type: application/json

{
  "timestamp": 1676458800000,
  "value": 42,
  "metadata": {
    "source": "exchange",
    "confidence": 0.95
  }
}

// Response
{
  "success": true,
  "dataPointId": "dp-456",
  "timestamp": "2025-02-15T10:00:00Z"
}
```

### Get Stream Data

Retrieves data from a stream with optional filtering.

```typescript
GET /api/streams/{streamId}/data?start=1676458800000&end=1676459800000

// Response
{
  "data": [
    {
      "timestamp": 1676458800000,
      "value": 42,
      "metadata": { ... }
    },
    // ...
  ],
  "pagination": {
    "next": "cursor-789"
  }
}
```

## Pattern Analysis

### Analyze Patterns

Performs pattern analysis on stream data.

```typescript
POST /api/analysis/patterns
Content-Type: application/json

{
  "streamId": "stream-123",
  "timeframe": "1h",
  "analysisTypes": ["trend", "anomaly", "prediction"]
}

// Response
{
  "patterns": [
    {
      "type": "trend",
      "confidence": 0.95,
      "startTime": "2025-02-15T10:00:00Z",
      "endTime": "2025-02-15T11:00:00Z",
      "metadata": { ... }
    }
  ],
  "statistics": {
    "mean": 42,
    "stdDev": 5,
    "min": 30,
    "max": 50
  }
}
```

### Get Predictions

Generates predictions based on historical data.

```typescript
POST /api/analysis/predict
Content-Type: application/json

{
  "streamId": "stream-123",
  "horizon": "1h",
  "confidence": 0.95
}

// Response
{
  "predictions": [
    {
      "timestamp": "2025-02-15T12:00:00Z",
      "value": 45,
      "confidence": 0.92
    }
  ],
  "metadata": {
    "model": "deepseek-r1",
    "features": ["trend", "seasonality"]
  }
}
```

## Blockchain Integration

### Store Data on Irys

Stores data permanently on the Irys network.

```typescript
POST /api/blockchain/store
Content-Type: application/json

{
  "data": {
    "streamId": "stream-123",
    "timestamp": "2025-02-15T10:00:00Z",
    "value": 42
  },
  "tags": [
    { "name": "type", "value": "financial" },
    { "name": "source", "value": "nexus-stream" }
  ]
}

// Response
{
  "success": true,
  "transactionId": "tx-abc",
  "timestamp": "2025-02-15T10:00:00Z"
}
```

### Verify Data

Verifies data stored on the blockchain.

```typescript
GET /api/blockchain/verify/{transactionId}

// Response
{
  "verified": true,
  "timestamp": "2025-02-15T10:00:00Z",
  "metadata": {
    "node": "node1.irys.xyz",
    "confirmations": 6
  }
}
```

## WebSocket API

Real-time data streaming via WebSocket connection.

### Connect to Stream

```typescript
const ws = new WebSocket('wss://api.nexus-stream.ai/streams/{streamId}');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Subscribe to Events

```typescript
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['data', 'patterns', 'predictions']
}));
```

### Event Types

```typescript
interface StreamEvent {
  type: 'data' | 'pattern' | 'prediction';
  timestamp: string;
  data: any;
}

// Data Event
{
  type: 'data',
  timestamp: "2025-02-15T10:00:00Z",
  data: {
    value: 42,
    metadata: { ... }
  }
}

// Pattern Event
{
  type: 'pattern',
  timestamp: "2025-02-15T10:00:00Z",
  data: {
    patternType: 'trend',
    confidence: 0.95,
    metadata: { ... }
  }
}
```

## Error Handling

All API errors follow a standard format:

```typescript
{
  "error": {
    "code": "STREAM_NOT_FOUND",
    "message": "Stream with ID stream-123 not found",
    "details": { ... }
  }
}
```

Common Error Codes:
- `AUTHENTICATION_ERROR`: Invalid or expired token
- `VALIDATION_ERROR`: Invalid request parameters
- `STREAM_NOT_FOUND`: Stream ID not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `BLOCKCHAIN_ERROR`: Blockchain operation failed

## Rate Limits

- Authentication: 100 requests per minute
- Stream Operations: 1000 requests per minute per stream
- Analysis: 100 requests per minute
- Blockchain Operations: 50 requests per minute

## SDKs

### JavaScript/TypeScript

```typescript
import { NexusStreamAI } from '@nexus-stream/sdk';

const client = new NexusStreamAI({
  apiKey: 'your-api-key',
  secret: 'your-secret'
});

// Create stream
const stream = await client.createStream({
  name: 'BTC Price Stream',
  type: 'financial'
});

// Add data
await stream.addData({
  value: 42,
  metadata: { source: 'exchange' }
});

// Subscribe to updates
stream.onData((data) => {
  console.log('New data:', data);
});
```

### Python

```python
from nexus_stream import NexusStreamAI

client = NexusStreamAI(
    api_key='your-api-key',
    secret='your-secret'
)

# Create stream
stream = client.create_stream(
    name='BTC Price Stream',
    type='financial'
)

# Add data
stream.add_data(
    value=42,
    metadata={'source': 'exchange'}
)

# Subscribe to updates
@stream.on_data
def handle_data(data):
    print('New data:', data)
```

## Best Practices

1. **Error Handling**
   - Implement proper error handling and retries
   - Use exponential backoff for retries
   - Monitor error rates and types

2. **Performance**
   - Batch operations when possible
   - Use WebSocket for real-time data
   - Implement client-side caching

3. **Security**
   - Rotate API keys regularly
   - Use appropriate scopes for tokens
   - Validate all input data

4. **Data Management**
   - Implement proper data retention policies
   - Monitor storage usage
   - Regular backup of critical data

## Support

- Documentation: https://docs.nexus-stream.ai
- API Status: https://status.nexus-stream.ai
- Support Email: support@nexus-stream.ai
- GitHub Issues: https://github.com/nexus-stream/nexus-stream-ai/issues
