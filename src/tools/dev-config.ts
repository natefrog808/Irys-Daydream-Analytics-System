// Save as: .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "jest.autoRun": "off",
  "jest.showCoverageOnLoad": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}

// Save as: .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}

// Save as: scripts/dev-setup.sh
#!/bin/bash

echo "Setting up development environment..."

# Install global dependencies
npm install -g typescript ts-node nodemon

# Install VSCode extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-tslint-plugin
code --install-extension orta.vscode-jest
code --install-extension ms-azuretools.vscode-docker

# Setup git hooks
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
npx husky add .husky/pre-push "npm run validate"

# Create development database
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Initialize database
npm run prisma migrate dev
npm run prisma generate

echo "Development environment setup complete!"

// Save as: scripts/dev.js
const concurrently = require('concurrently');

concurrently([
  {
    command: 'npm run watch-ts',
    name: 'typescript',
    prefixColor: 'blue'
  },
  {
    command: 'npm run watch-node',
    name: 'node',
    prefixColor: 'green'
  },
  {
    command: 'npm run watch-test',
    name: 'test',
    prefixColor: 'yellow'
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3
}).catch(error => {
  console.error('Development script failed:', error);
  process.exit(1);
});

// Save as: scripts/create-component.js
const fs = require('fs');
const path = require('path');

const componentName = process.argv[2];
if (!componentName) {
  console.error('Please provide a component name');
  process.exit(1);
}

const componentDir = path.join(__dirname, '../src/components', componentName);
fs.mkdirSync(componentDir, { recursive: true });

// Component file
const componentContent = `import React from 'react';

interface ${componentName}Props {
  // Add props here
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <div>
      {/* Add component content */}
    </div>
  );
};
`;

// Test file
const testContent = `import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders correctly', () => {
    render(<${componentName} />);
    // Add test assertions
  });
});
`;

fs.writeFileSync(
  path.join(componentDir, `${componentName}.tsx`),
  componentContent
);
fs.writeFileSync(
  path.join(componentDir, `${componentName}.test.tsx`),
  testContent
);

console.log(`Component ${componentName} created successfully!`);

// Save as: scripts/benchmark.js
const { performance } = require('perf_hooks');

async function runBenchmark(testFn, iterations = 1000) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await testFn();
    const end = performance.now();
    times.push(end - start);
  }

  const average = times.reduce((a, b) => a + b) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`Benchmark Results (${iterations} iterations):`);
  console.log(`Average: ${average.toFixed(2)}ms`);
  console.log(`Min: ${min.toFixed(2)}ms`);
  console.log(`Max: ${max.toFixed(2)}ms`);
}

// Save as: .env.development
NODE_ENV=development
DEBUG=nexus-stream:*
LOG_LEVEL=debug
ENABLE_METRICS=true
ENABLE_PLAYGROUND=true

# Development Services
DATABASE_URL=postgresql://dev:dev@localhost:5432/nexus_stream_dev
REDIS_URL=redis://localhost:6379

# API Configuration
PORT=3000
API_URL=http://localhost:3000
WS_PORT=3001

# Development Keys
JWT_SECRET=dev-secret
API_KEY=dev-key
API_SECRET=dev-secret

# LLM Configuration
GROQ_API_KEY=your-dev-groq-key
LLM_MODEL=deepseek-r1-distill-llama-70b

# Blockchain Configuration
IRYS_NODE=https://devnet.irys.xyz
IRYS_PRIVATE_KEY=your-dev-irys-key

# Email Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=dev
SMTP_PASS=dev

// Save as: nodemon.json
{
  "watch": ["src"],
  "ext": ".ts,.js",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node ./src/index.ts"
}

// Save as: .gitignore
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage
.nyc_output

# Production
build
dist

# Development
.env*
.vscode/*
!.vscode/settings.json
!.vscode/launch.json
.idea
*.log
logs
*.swp

# Cache
.cache
.npm
.eslintcache
.stylelintcache
*.tsbuildinfo

# Misc
.DS_Store
Thumbs.db
