// Save as: src/tests/performance/benchmarks.ts

import { performance } from 'perf_hooks';
import { render, act } from '@testing-library/react';
import { InteractiveDashboard } from '../../components/InteractiveDashboard';

// Performance monitoring utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private memorySnapshots: number[] = [];
  private readonly maxSamples: number = 100;

  measure(label: string, duration: number) {
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    const measurements = this.measurements.get(label)!;
    measurements.push(duration);
    
    // Keep only the last maxSamples measurements
    if (measurements.length > this.maxSamples) {
      measurements.shift();
    }
  }

  takeMemorySnapshot() {
    const memory = process.memoryUsage();
    this.memorySnapshots.push(memory.heapUsed);
  }

  getStats(label: string) {
    const measurements = this.measurements.get(label) || [];
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      mean: measurements.reduce((a, b) => a + b) / measurements.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      samples: measurements.length
    };
  }

  getMemoryStats() {
    const sorted = [...this.memorySnapshots].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      mean: this.memorySnapshots.reduce((a, b) => a + b) / this.memorySnapshots.length,
      samples: this.memorySnapshots.length
    };
  }

  reset() {
    this.measurements.clear();
    this.memorySnapshots = [];
  }
}

// Test data generators
const generateTimeSeriesData = (points: number) => {
  const data = [];
  const now = Date.now();
  for (let i = 0; i < points; i++) {
    data.push({
      timestamp: now - (points - i) * 1000,
      value: Math.sin(i / 10) * 50 + 50 + Math.random() * 10
    });
  }
  return data;
};

const generateStreamData = (streams: number) => {
  return Array(streams).fill(null).map((_, i) => ({
    id: i,
    name: `Stream ${i}`,
    type: 'default',
    active: true
  }));
};

// Performance Tests
describe('Performance Benchmarks', () => {
  const monitor = new PerformanceMonitor();
  
  beforeEach(() => {
    monitor.reset();
  });

  describe('Rendering Performance', () => {
    it('measures initial render time with varying data sizes', async () => {
      const dataSizes = [100, 1000, 10000];
      
      for (const size of dataSizes) {
        const data = generateTimeSeriesData(size);
        
        const start = performance.now();
        render(
          <InteractiveDashboard
            agent={{}}
            initialData={data}
            onSettingsChange={() => {}}
          />
        );
        const duration = performance.now() - start;
        
        monitor.measure(`render_${size}_points`, duration);
        monitor.takeMemorySnapshot();

        // Clear between renders
        document.body.innerHTML = '';
      }

      // Log results
      for (const size of dataSizes) {
        const stats = monitor.getStats(`render_${size}_points`);
        console.log(`Render time for ${size} points:`, stats);
      }
      console.log('Memory usage:', monitor.getMemoryStats());

      // Performance assertions
      const largeDataStats = monitor.getStats('render_10000_points');
      expect(largeDataStats?.median).toBeLessThan(1000); // Should render in under 1 second
    });

    it('measures update performance', async () => {
      const component = render(
        <InteractiveDashboard
          agent={{}}
          initialData={generateTimeSeriesData(1000)}
          onSettingsChange={() => {}}
        />
      );

      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        await act(async () => {
          component.rerender(
            <InteractiveDashboard
              agent={{}}
              initialData={generateTimeSeriesData(1000)}
              onSettingsChange={() => {}}
            />
          );
        });
        const duration = performance.now() - start;
        monitor.measure('update_1000_points', duration);
      }

      const stats = monitor.getStats('update_1000_points');
      expect(stats?.median).toBeLessThan(100); // Updates should be under 100ms
    });
  });

  describe('Data Processing Performance', () => {
    it('measures data transformation speed', () => {
      const data = generateTimeSeriesData(10000);
      
      const start = performance.now();
      const transformedData = data.map(point => ({
        ...point,
        value: point.value * 2,
        normalized: point.value / 100
      }));
      const duration = performance.now() - start;
      
      monitor.measure('data_transform_10000', duration);
      expect(duration).toBeLessThan(50); // Should transform in under 50ms
    });

    it('measures statistical calculations', () => {
      const data = generateTimeSeriesData(10000);
      
      const start = performance.now();
      const values = data.map(d => d.value);
      const mean = values.reduce((a, b) => a + b) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const duration = performance.now() - start;
      
      monitor.measure('stats_calculation_10000', duration);
      expect(duration).toBeLessThan(50); // Should calculate in under 50ms
    });
  });

  describe('Memory Usage', () => {
    it('measures memory growth with increasing data', async () => {
      const dataSizes = [1000, 5000, 10000, 50000];
      const memoryUsage = [];

      for (const size of dataSizes) {
        const beforeMemory = process.memoryUsage().heapUsed;
        const data = generateTimeSeriesData(size);
        render(
          <InteractiveDashboard
            agent={{}}
            initialData={data}
            onSettingsChange={() => {}}
          />
        );
        const afterMemory = process.memoryUsage().heapUsed;
        memoryUsage.push(afterMemory - beforeMemory);
        
        // Clear between tests
        document.body.innerHTML = '';
      }

      // Log memory usage growth
      dataSizes.forEach((size, i) => {
        console.log(`Memory usage for ${size} points: ${memoryUsage[i] / 1024 / 1024} MB`);
      });

      // Memory growth should be roughly linear
      const growthRates = [];
      for (let i = 1; i < memoryUsage.length; i++) {
        growthRates.push(memoryUsage[i] / memoryUsage[i - 1]);
      }
      
      const avgGrowthRate = growthRates.reduce((a, b) => a + b) / growthRates.length;
      expect(avgGrowthRate).toBeLessThan(5); // Growth rate should be reasonable
    });
  });

  describe('Stream Management Performance', () => {
    it('measures stream operations performance', async () => {
      const streamCounts = [10, 50, 100];

      for (const count of streamCounts) {
        const streams = generateStreamData(count);
        
        const start = performance.now();
        render(
          <InteractiveDashboard
            agent={{}}
            initialData={generateTimeSeriesData(1000)}
            onSettingsChange={() => {}}
          />
        );
        const duration = performance.now() - start;
        
        monitor.measure(`stream_render_${count}`, duration);
        document.body.innerHTML = '';
      }

      // Log results
      for (const count of streamCounts) {
        const stats = monitor.getStats(`stream_render_${count}`);
        console.log(`Render time for ${count} streams:`, stats);
      }

      const largeStreamStats = monitor.getStats('stream_render_100');
      expect(largeStreamStats?.median).toBeLessThan(500); // Should handle 100 streams in under 500ms
    });
  });
});

// Save as: src/tests/performance/load-test.ts
import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 10,  // Virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests should fail
  },
};

export default function () {
  const response = http.get('http://localhost:3000/api/data');
  check(response, {
    'is status 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}

// Add to package.json:
/*
{
  "scripts": {
    "test:performance": "jest src/tests/performance/benchmarks.ts",
    "test:load": "k6 run src/tests/performance/load-test.ts"
  }
}
*/
