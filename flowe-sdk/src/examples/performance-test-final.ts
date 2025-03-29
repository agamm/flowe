import { Flowe } from '../flowe/index.js';
import { performance } from 'node:perf_hooks';

async function runTest(iterations: number, testFn: () => Promise<void>): Promise<number> {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await testFn();
  }
  
  const end = performance.now();
  return end - start;
}

async function testDisabled(flowe: Flowe): Promise<void> {
  const id = `process-${Math.random().toString(36).substring(2, 9)}`;
  flowe.start(id, { test: 'disabled' });
  flowe.end(id, { result: 'success' });
}

async function testEnabled(flowe: Flowe): Promise<void> {
  const id = `process-${Math.random().toString(36).substring(2, 9)}`;
  flowe.start(id, { test: 'enabled' });
  flowe.end(id, { result: 'success' });
}

class MockServer {
  requests: any[] = [];
  
  async handle(req: Request): Promise<Response> {
    const data = await req.json();
    this.requests.push(data);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

function silenceConsole(): () => void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  
  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  };
}

async function runMultipleTests(label: string, iterations: number, testRuns: number, testFn: () => Promise<void>): Promise<number> {
  console.log(`\nRunning ${label} (${iterations} iterations x ${testRuns} runs)`);
  
  const times: number[] = [];
  
  for (let i = 0; i < testRuns; i++) {
    const restoreConsole = silenceConsole();
    const time = await runTest(iterations, testFn);
    restoreConsole();
    
    times.push(time);
    console.log(`  Run ${i + 1}: ${time.toFixed(2)}ms`);
  }
  
  if (times.length >= 5) {
    const sortedTimes = [...times].sort((a, b) => a - b);
    const trimmedTimes = sortedTimes.slice(1, -1);
    const avgTime = trimmedTimes.reduce((sum, time) => sum + time, 0) / trimmedTimes.length;
    console.log(`Average time (excluding min/max): ${avgTime.toFixed(2)}ms`);
    console.log(`Average time per operation: ${(avgTime / iterations).toFixed(5)}ms`);
    return avgTime;
  } else {
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    console.log(`Average time: ${avgTime.toFixed(2)}ms`);
    console.log(`Average time per operation: ${(avgTime / iterations).toFixed(5)}ms`);
    return avgTime;
  }
}

async function runPerformanceTests() {
  console.log('Running Flowe SDK performance tests...');
  
  const mockServer = new MockServer();
  const iterations = 10000;
  const testRuns = 5;
  
  const originalFetch = global.fetch;
  global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    return mockServer.handle(new Request(url, init));
  };
  
  try {
    const disabledFlowe = new Flowe({ 
      enabled: false,
      logErrors: false,
      suppressErrors: true
    });
    
    const disabledTime = await runMultipleTests(
      'Test 1: SDK disabled', 
      iterations, 
      testRuns, 
      () => testDisabled(disabledFlowe)
    );
    
    mockServer.requests = [];
    const enabledFlowe = new Flowe({
      enabled: true,
      ingestEndpoint: 'http://localhost:27182/api/flow',
      suppressErrors: true,
      logErrors: false
    });
    
    const enabledTime = await runMultipleTests(
      'Test 2: SDK enabled',
      iterations, 
      testRuns, 
      () => testEnabled(enabledFlowe)
    );
    
    console.log(`\nRequests sent: ${mockServer.requests.length}`);
    
    const overhead = enabledTime - disabledTime;
    const overheadPerOp = overhead / iterations;
    console.log(`\nOverhead Summary:`);
    console.log(`Total overhead: ${overhead.toFixed(2)}ms for ${iterations} operations`);
    console.log(`Overhead per operation: ${overheadPerOp.toFixed(5)}ms`);
    console.log(`Relative overhead: ${((overhead / disabledTime) * 100).toFixed(2)}%`);
  } finally {
    global.fetch = originalFetch;
  }
}

runPerformanceTests().catch(console.error);