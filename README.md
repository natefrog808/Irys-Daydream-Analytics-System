# Irys-Daydream-Analytics-System

A robust real-time data analytics and visualization system built on the Daydreams framework with Irys blockchain storage integration. This system combines pattern analysis, data streaming, and interactive visualization capabilities with enterprise-grade error handling and comprehensive testing.

## Features

### Core Analytics Engine
- **Pattern Analysis**: Time series decomposition and trend analysis
- **Real-Time Processing**: Stream data processing with configurable rates
- **Blockchain Storage**: Permanent data storage using Irys
- **Statistical Analysis**: Automated statistical calculations including mean, standard deviation, min/max values

### Visualization
- **Real-Time Charts**: Interactive line charts with multiple data streams
- **Performance Metrics**: Live performance monitoring and statistics
- **Configurable Display**: Adjustable data rates and retention periods
- **Export Capabilities**: Data export in CSV format

### Error Handling & Reliability
- **Retry Mechanisms**: Configurable retry strategies with exponential backoff
- **Error Boundaries**: React error boundaries for graceful failure handling
- **Error Reporting**: Centralized error reporting system
- **Type Safety**: Comprehensive TypeScript type definitions

### Testing Infrastructure
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: End-to-end system testing
- **Performance Benchmarks**: Automated performance testing
- **Test Coverage**: Minimum 80% code coverage requirement

## Project Structure

```
src/
├── agents/
│   ├── hedge-fund-agent.ts     # Core hedge fund analytics agent
│   ├── hedge-pattern-agent.ts  # Pattern analysis integration
│   └── stream-integration.ts   # Stream data management
├── components/
│   └── data-visualization/
│       └── IntegratedDataViz.tsx  # React visualization component
├── utils/
│   └── error-handling.ts       # Error handling utilities
├── tests/
│   ├── setup.ts               # Test environment setup
│   ├── IntegratedDataViz.test.tsx
│   ├── StreamIntegration.test.ts
│   └── performance.bench.ts
├── types/
│   └── index.ts               # TypeScript type definitions
└── docs/
    └── API.md                 # API documentation
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```env
GROQ_API_KEY=your_groq_api_key
PRIVATE_KEY=your_blockchain_private_key
JWT_SECRET=your_jwt_secret
```

## Usage

### Initialize the Agent

```typescript
import { createStreamEnabledAgent } from './agents/stream-integration';

const agent = createStreamEnabledAgent({
  groqApiKey: process.env.GROQ_API_KEY,
  privateKey: process.env.PRIVATE_KEY,
  jwtSecret: process.env.JWT_SECRET,
});

await agent.start();
```

### Add Visualization Component

```typescript
import IntegratedDataViz from './components/data-visualization/IntegratedDataViz';

function App() {
  return <IntegratedDataViz agent={agent} />;
}
```

### Error Handling

```typescript
import { withRetry, StreamError } from './utils/error-handling';

try {
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
} catch (error) {
  if (error instanceof StreamError) {
    // Handle stream-specific errors
  }
}
```

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:bench

# Generate coverage report
npm run test:coverage
```

### Code Quality

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Generate documentation
npm run docs
```

## Technical Details

### Dependencies
- Node.js >=18
- React >=18
- TypeScript >=4.5
- Daydreams Framework
- Irys SDK

### Performance Considerations
- Maximum 5 concurrent streams
- Configurable data retention periods
- Automatic memory management
- Rate limiting and request validation

### Testing Coverage Requirements
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure tests pass (`npm test`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## Limitations

- Maximum 5 concurrent data streams
- Data rate limited to 1-100 points per second
- Requires Groq API key for LLM functionality
- Requires Irys private key for blockchain storage

## Support

- Examine test coverage: `npm run test:coverage`
- View documentation: `npm run docs`
- Check API documentation: See `src/docs/API.md`
- Run performance benchmarks: `npm run test:bench`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Daydreams Framework](https://docs.daydreams.ai)
- Visualization powered by [Recharts](https://recharts.org)
- Blockchain storage by [Irys](https://irys.xyz)
- LLM support via [Groq](https://groq.com)
