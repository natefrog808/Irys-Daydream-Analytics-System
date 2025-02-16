# Development Tools Guide

## Setup

### Initial Setup
```bash
# Run setup script
./scripts/dev-setup.sh

# Install dependencies
npm install

# Start development environment
npm run dev
```

## VSCode Configuration

### Extensions
1. ESLint
2. Prettier
3. TypeScript
4. Jest
5. Docker

### Features
- Auto-formatting on save
- ESLint auto-fix
- TypeScript integration
- Integrated debugging
- Test runner

## Development Scripts

### Component Creation
```bash
# Create new component
node scripts/create-component.js ComponentName

# Output:
# - ComponentName.tsx
# - ComponentName.test.tsx
```

### Development Server
```bash
# Start development server
npm run dev

# Watch mode with auto-reload
npm run watch
```

### Testing
```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Debugging

### VSCode Debugger
1. Server Debugging
   - Launch configuration for Node.js
   - TypeScript source maps
   - Environment variables

2. Test Debugging
   - Jest integration
   - Breakpoint support
   - Console output

## Performance Tools

### Benchmarking
```javascript
// Example benchmark usage
const { runBenchmark } = require('./scripts/benchmark');

await runBenchmark(async () => {
  // Code to benchmark
}, 1000);
```

### Monitoring
- Real-time metrics
- Performance tracking
- Resource usage

## Git Hooks

### Pre-commit
- Lint staged files
- Type checking
- Format code

### Pre-push
- Run tests
- Build validation
- Security checks

## Database Tools

### Prisma
```bash
# Generate Prisma client
npm run prisma generate

# Run migrations
npm run prisma migrate dev

# Reset database
npm run prisma reset
```

## Code Quality

### Linting
```bash
# Run ESLint
npm run lint

# Fix issues
npm run lint:fix
```

### Formatting
```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

## Environment Configuration

### Development Environment
```env
NODE_ENV=development
DEBUG=nexus-stream:*
LOG_LEVEL=debug
```

### Service Configuration
```env
DATABASE_URL=postgresql://dev:dev@localhost:5432/nexus_stream_dev
REDIS_URL=redis://localhost:6379
```

## Best Practices

### Code Organization
1. Component Structure
   - Separate files for logic
   - Co-located tests
   - Shared utilities

2. Testing Strategy
   - Unit tests
   - Integration tests
   - E2E tests

3. Performance
   - Regular benchmarking
   - Profile analysis
   - Optimization

### Development Workflow
1. Feature Development
   - Create branch
   - Develop feature
   - Write tests
   - Submit PR

2. Code Review
   - Automated checks
   - Peer review
   - Quality gates

3. Deployment
   - Build validation
   - Environment checks
   - Version control

## Troubleshooting

### Common Issues
1. **Development Server**
   ```bash
   # Clear cache
   npm run clean:cache
   
   # Restart server
   npm run dev:restart
   ```

2. **Database**
   ```bash
   # Reset database
   npm run db:reset
   
   # Check migrations
   npm run prisma migrate status
   ```

3. **TypeScript**
   ```bash
   # Clear TypeScript cache
   rm -rf node_modules/.cache/typescript
   
   # Regenerate types
   npm run type-check
   ```

## Maintenance

### Regular Tasks
1. Update dependencies
2. Run security audits
3. Check performance
4. Update documentation

### Tools Update
1. Check VSCode extensions
2. Update global packages
3. Verify configurations
4. Test integrations

## Security

### Development Security
1. Use environment variables
2. Secure API keys
3. Follow security guidelines
4. Regular audits

### Code Security
1. Input validation
2. Output sanitization
3. Security headers
4. Error handling
