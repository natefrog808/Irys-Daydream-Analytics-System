// Save as: src/tests/IntegratedDataViz.test.tsx

import { render, fireEvent, screen, act } from '@testing-library/react';
import IntegratedDataViz from '../components/data-visualization/IntegratedDataViz';
import { createStreamEnabledAgent } from '../agents/stream-integration';

// Mock the agent
jest.mock('../agents/stream-integration', () => ({
  createStreamEnabledAgent: jest.fn().mockReturnValue({
    run: jest.fn().mockResolvedValue({ success: true }),
    start: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('IntegratedDataViz', () => {
  const mockAgent = createStreamEnabledAgent({
    groqApiKey: 'test-key',
    privateKey: 'test-key',
    jwtSecret: 'test-secret',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<IntegratedDataViz agent={mockAgent} />);
    expect(screen.getByText('Real-Time Data Streams')).toBeInTheDocument();
  });

  it('adds new stream when button clicked', async () => {
    render(<IntegratedDataViz agent={mockAgent} />);
    const addButton = screen.getByRole('button', { name: /add/i });
    
    await act(async () => {
      fireEvent.click(addButton);
    });

    expect(mockAgent.run).toHaveBeenCalledWith(
      'create-stream',
      expect.any(Object)
    );
  });

  it('handles simulation toggle', async () => {
    render(<IntegratedDataViz agent={mockAgent} />);
    const playButton = screen.getByRole('button', { name: /play|pause/i });
    
    await act(async () => {
      fireEvent.click(playButton);
    });

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });
});

// Save as: src/tests/StreamIntegration.test.ts

import { createStreamEnabledAgent } from '../agents/stream-integration';
import { withRetry } from '../utils/error-handling';

describe('Stream Integration', () => {
  const agent = createStreamEnabledAgent({
    groqApiKey: 'test-key',
    privateKey: 'test-key',
    jwtSecret: 'test-secret',
  });

  it('creates new streams successfully', async () => {
    const result = await agent.run('create-stream', {
      type: 'financial',
      name: 'Test Stream',
      settings: {
        dataRate: 10,
        retentionPeriod: 3600,
        storageEnabled: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.streamId).toBeDefined();
  });

  it('handles data points correctly', async () => {
    const result = await agent.run('add-stream-data', {
      streamId: 0,
      timestamp: Date.now(),
      value: 100,
    });

    expect(result.success).toBe(true);
  });
});

// Save as: src/tests/performance.bench.ts

import { performance } from 'perf_hooks';
import { createStreamEnabledAgent } from '../agents/stream-integration';

async function runPerformanceBenchmark() {
  const agent = createStreamEnabledAgent({
    groqApiKey: 'test-key',
    privateKey: 'test-key',
    jwtSecret: 'test-secret',
  });

  // Measure stream creation performance
  const streamCreationTimes: number[] = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await agent.run('create-stream', {
      type: 'financial',
      name: `Test Stream ${i}`,
      settings: {
        dataRate: 10,
        retentionPeriod: 3600,
        storageEnabled: true,
      },
    });
    streamCreationTimes.push(performance.now() - start);
  }

  // Measure data point addition performance
  const dataPointTimes: number[] = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await agent.run('add-stream-data', {
      streamId: 0,
      timestamp: Date.now(),
      value: Math.random() * 100,
    });
    dataPointTimes.push(performance.now() - start);
  }

  return {
    streamCreation: {
      average: streamCreationTimes.reduce((a, b) => a + b) / streamCreationTimes.length,
      min: Math.min(...streamCreationTimes),
      max: Math.max(...streamCreationTimes),
    },
    dataPoints: {
      average: dataPointTimes.reduce((a, b) => a + b) / dataPointTimes.length,
      min: Math.min(...dataPointTimes),
      max: Math.max(...dataPointTimes),
    },
  };
}

export { runPerformanceBenchmark };
