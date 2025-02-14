# Irys-Daydream-Analytics-System

A real-time data analytics and visualization system built on the Daydreams framework with Irys blockchain storage integration. This system combines pattern analysis, data streaming, and interactive visualization capabilities with secure blockchain-based data persistence.

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

### Security & Performance
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Comprehensive data validation using Zod
- **Performance Monitoring**: Built-in performance tracking
- **Error Handling**: Robust error management and reporting

## Project Structure

```
src/
├── agents/
│   ├── hedge-fund-agent.ts     # Core hedge fund analytics agent
│   ├── hedge-pattern-agent.ts  # Pattern analysis integration
│   └── stream-integration.ts   # Stream data management
└── components/
    └── data-visualization/
        └── IntegratedDataViz.tsx  # React visualization component
```

## Installation

1. Install dependencies:
```bash
npm install @daydreamsai/core @ai-sdk/groq @irys/upload react recharts lucide-react zod
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

### Add the Visualization Component

```typescript
import IntegratedDataViz from './components/data-visualization/IntegratedDataViz';

function App() {
  return (
    <div>
      <IntegratedDataViz agent={agent} />
    </div>
  );
}
```

## Component Features

### Analytics Agent
- Pattern detection and analysis
- Time series decomposition
- Financial metrics calculation
- Blockchain data storage via Irys

### Stream Management
- Real-time data stream processing
- Configurable data rates (1-100 points/second)
- Automatic data pruning
- Performance monitoring

### Visualization Interface
- Up to 5 concurrent data streams
- Interactive real-time charts
- Statistical analysis display
- Data export functionality

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Limitations

- Maximum 5 concurrent data streams
- Data rate limited to 1-100 points per second
- Requires Groq API key for LLM functionality
- Requires Irys private key for blockchain storage

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Daydreams Framework](https://docs.daydreams.ai)
- Visualization powered by [Recharts](https://recharts.org)
- Blockchain storage by [Irys](https://irys.xyz)
- LLM support via [Groq](https://groq.com)
