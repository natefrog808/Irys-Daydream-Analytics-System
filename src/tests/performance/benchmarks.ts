// Save as: src/tests/performance/benchmarks.ts

import { performance } from 'perf_hooks';
import { createStreamEnabledAgent } from '../../agents/stream-integration';

class PerformanceBenchmark {
  private results: Map<string, number[]> = new Map();
  private readonly agent = createStreamEnabledAgent({
    groqApiKey: process.env.GROQ_API_KEY!,
    privateKey: process.env.PRIVATE_KEY!,
    jwtSecret: process.env.JWT_SECRET!,
  });

  async measure(name: string, fn: () => Promise<void>, iterations: number = 100) {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    this.results.set(name, times);
    return this.getStats(times);
  }

  private getStats(times: number[]) {
    const sorted = [...times].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: times.reduce((a, b) => a + b) / times.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  async runStreamTests() {
    // Test stream creation
    await this.measure('stream_creation', async () => {
      await this.agent.run('create-stream', {
        name: 'test-stream',
        type: 'default',
        config: {
          dataRate: 1000,
          retentionPeriod: 3600
        }
      });
    });

    // Test data ingestion
    await this.measure('data_ingestion', async () => {
      await this.agent.run('add-stream-data', {
        streamId: 'test-stream',
        data: {
          timestamp: Date.now(),
          value: Math.random() * 100
        }
      });
    });

    // Test pattern analysis
    await this.measure('pattern_analysis', async () => {
      await this.agent.run('analyze-patterns', {
        streamId: 'test-stream',
        timeframe: '1h'
      });
    });
  }

  async runLoadTest(
    concurrentUsers: number,
    duration: number,
    rampUpTime: number
  ) {
    const startTime = Date.now();
    const users: Promise<void>[] = [];

    const userSimulation = async (userId: number) => {
      const delay = (userId / concurrentUsers) * rampUpTime;
      await new Promise(resolve => setTimeout(resolve, delay));

      while (Date.now() - startTime < duration) {
        await this.agent.run('add-stream-data', {
          streamId: 'test-stream',
          data: {
            timestamp: Date.now(),
            value: Math.random() * 100
          }
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    for (let i = 0; i < concurrentUsers; i++) {
      users.push(userSimulation(i));
    }

    await Promise.all(users);
  }

  async runResourceTests() {
    const initialMemory = process.memoryUsage();
    const startTime = Date.now();

    // Generate load
    await this.runLoadTest(100, 60000, 10000);

    const finalMemory = process.memoryUsage();
    const duration = Date.now() - startTime;

    return {
      memoryLeak: finalMemory.heapUsed - initialMemory.heapUsed,
      duration,
      peakMemory: Math.max(finalMemory.heapUsed, initialMemory.heapUsed),
    };
  }

  printResults() {
    console.log('\nPerformance Test Results:');
    console.log('========================\n');

    for (const [name, times] of this.results.entries()) {
      const stats = this.getStats(times);
      console.log(`${name}:`);
      console.log(`  Min: ${stats.min.toFixed(2)}ms`);
      console.log(`  Max: ${stats.max.toFixed(2)}ms`);
      console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
      console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99: ${stats.p99.toFixed(2)}ms\n`);
    }
  }
}

// Save as: src/tests/performance/load-test.ts

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at peak
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% of requests should be below 100ms
    http_req_failed: ['rate<0.01'],   // Less than 1% error rate
  },
};

export default function () {
  const response = http.post('http://localhost:3000/api/streams/data', {
    streamId: 'test-stream',
    data: {
      timestamp: Date.now(),
      value: Math.random() * 100
    }
  });

  check(response, {
    'is status 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 100,
  });

  sleep(1);
}

// Save as: src/tests/performance/memory-test.ts

async function testMemoryLeak() {
  const initialMemory = process.memoryUsage().heapUsed;
  const intervals: number[] = [];
  
  // Create streams
  for (let i = 0; i < 10; i++) {
    intervals.push(setInterval(() => {
      // Generate data
      const data = {
        timestamp: Date.now(),
        value: Math.random() * 100
      };
    }, 100));
  }

  // Run for 1 hour
  await new Promise(resolve => setTimeout(resolve, 3600000));

  // Clean up
  intervals.forEach(clearInterval);

  const finalMemory = process.memoryUsage().heapUsed;
  const leak = finalMemory - initialMemory;

  console.log(`Memory leak: ${(leak / 1024 / 1024).toFixed(2)}MB`);
  return leak < 1024 * 1024; // Less than 1MB leak
}

// Usage example:
async function runPerformanceTests() {
  const benchmark = new PerformanceBenchmark();

  console.log('Running stream performance tests...');
  await benchmark.runStreamTests();

  console.log('Running load tests...');
  await benchmark.runLoadTest(100, 60000, 10000);

  console.log('Running resource tests...');
  const resourceResults = await benchmark.runResourceTests();

  console.log('Running memory leak test...');
  const memoryTestResult = await testMemoryLeak();

  benchmark.printResults();

  return {
    benchmarks: benchmark.results,
    resourceResults,
    memoryTest: memoryTestResult
  };
}

export { PerformanceBenchmark, runPerformanceTests };
