// Save as: src/tests/setup.ts
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.fs
global.window.fs = {
  readFile: jest.fn(),
};

// Save as: src/tests/unit/InteractiveDashboard.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { InteractiveDashboard } from '../../components/InteractiveDashboard';

describe('InteractiveDashboard', () => {
  const mockAgent = {
    run: jest.fn(),
    start: jest.fn()
  };

  const mockData = [
    { timestamp: Date.now(), value: 42 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <InteractiveDashboard
        agent={mockAgent}
        initialData={mockData}
        onSettingsChange={() => {}}
      />
    );
    expect(screen.getByText('Nexus Stream Dashboard')).toBeInTheDocument();
  });

  it('displays system status', () => {
    render(
      <InteractiveDashboard
        agent={mockAgent}
        initialData={mockData}
        onSettingsChange={() => {}}
      />
    );
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  it('handles stream management', async () => {
    render(
      <InteractiveDashboard
        agent={mockAgent}
        initialData={mockData}
        onSettingsChange={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('New stream name');
    const addButton = screen.getByText('Add');

    fireEvent.change(input, { target: { value: 'Test Stream' } });
    fireEvent.click(addButton);

    expect(screen.getByText('Test Stream')).toBeInTheDocument();
  });
});

// Save as: src/tests/unit/VisualizationPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { VisualizationPanel } from '../../components/VisualizationPanel';

describe('VisualizationPanel', () => {
  const mockData = [
    { timestamp: Date.now(), value: 42 }
  ];

  const mockStatistics = {
    mean: 42,
    stdDev: 5,
    min: 30,
    max: 50
  };

  it('renders chart and controls', () => {
    render(
      <VisualizationPanel
        data={mockData}
        statistics={mockStatistics}
      />
    );

    expect(screen.getByText('Update Interval:')).toBeInTheDocument();
    expect(screen.getByText('mean')).toBeInTheDocument();
  });

  it('handles play/pause toggle', () => {
    render(
      <VisualizationPanel
        data={mockData}
        statistics={mockStatistics}
      />
    );

    const playPauseButton = screen.getByRole('button');
    fireEvent.click(playPauseButton);
    
    // TODO: Add assertions for play/pause state
  });
});

// Save as: src/tests/integration/DataFlow.test.tsx
import { render, act } from '@testing-library/react';
import { InteractiveDashboard } from '../../components/InteractiveDashboard';

describe('Data Flow Integration', () => {
  it('processes and displays real-time data', async () => {
    const mockAgent = {
      run: jest.fn(),
      start: jest.fn()
    };

    const { rerender } = render(
      <InteractiveDashboard
        agent={mockAgent}
        initialData={[]}
        onSettingsChange={() => {}}
      />
    );

    // Simulate data updates
    await act(async () => {
      const newData = [{ timestamp: Date.now(), value: 42 }];
      rerender(
        <InteractiveDashboard
          agent={mockAgent}
          initialData={newData}
          onSettingsChange={() => {}}
        />
      );
    });

    // TODO: Add assertions for updated display
  });
});

// Save as: src/tests/performance/Benchmarks.test.ts
describe('Performance Benchmarks', () => {
  it('measures rendering performance', async () => {
    const startTime = performance.now();
    
    render(
      <InteractiveDashboard
        agent={{}}
        initialData={Array(1000).fill({ timestamp: Date.now(), value: 42 })}
        onSettingsChange={() => {}}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
  });

  it('measures data processing performance', () => {
    const data = Array(10000).fill({ timestamp: Date.now(), value: 42 });
    
    const startTime = performance.now();
    // Process data
    const endTime = performance.now();
    
    const processingTime = endTime - startTime;
    expect(processingTime).toBeLessThan(100); // Should process in under 100ms
  });
});

// Save as: src/tests/e2e/Dashboard.test.ts
import { test, expect } from '@playwright/test';

test('dashboard end-to-end test', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Basic navigation
  await expect(page.getByText('Nexus Stream Dashboard')).toBeVisible();

  // Add a stream
  await page.fill('input[placeholder="New stream name"]', 'Test Stream');
  await page.click('text=Add');
  await expect(page.getByText('Test Stream')).toBeVisible();

  // Check visualization
  await page.click('text=Streams');
  await expect(page.locator('.recharts-wrapper')).toBeVisible();

  // Test controls
  await page.click('[aria-label="Play/Pause"]');
  // TODO: Add assertions for control effects

  // Check blockchain status
  await page.click('text=Blockchain');
  await expect(page.getByText('Connected Node')).toBeVisible();
});

// Save as: src/tests/security/Security.test.ts
describe('Security Tests', () => {
  it('validates input data', () => {
    const maliciousData = [
      { timestamp: 'javascript:alert(1)', value: '<script>alert(2)</script>' }
    ];

    render(
      <InteractiveDashboard
        agent={{}}
        initialData={maliciousData}
        onSettingsChange={() => {}}
      />
    );

    // Verify that malicious content is not executed
    expect(document.querySelector('script')).toBeNull();
  });

  it('handles authentication errors', async () => {
    const mockAgent = {
      run: jest.fn().mockRejectedValue(new Error('Authentication failed')),
      start: jest.fn()
    };

    render(
      <InteractiveDashboard
        agent={mockAgent}
        initialData={[]}
        onSettingsChange={() => {}}
      />
    );

    // Verify error handling
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
  });
});

// Save as: jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/tests/**/*',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '<rootDir>/src/tests/**/*.test.{ts,tsx}',
  ],
};

// Save as: playwright.config.ts
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './src/tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' },
    },
    {
      name: 'Firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'Safari',
      use: { browserName: 'webkit' },
    },
  ],
};

export default config;
