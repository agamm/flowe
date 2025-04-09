import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Flowe, f as globalFlowe } from '../flowe';

describe('Flowe track function', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  let flowe: Flowe;
  let startSpy: any;
  let endSpy: any;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
    
    // Create a fresh Flowe instance for each test
    flowe = new Flowe({
      enabled: true,
      ingestEndpoint: 'http://test.endpoint',
      suppressErrors: true,
      logErrors: false
    });
    
    // Spy on the start and end methods
    startSpy = vi.spyOn(flowe, 'start');
    endSpy = vi.spyOn(flowe, 'end');
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should execute the wrapped function and return its result', async () => {
    const testFn = async () => {
      await vi.advanceTimersByTimeAsync(100);
      return 'test result';
    };
    
    const result = await flowe.track(testFn);
    
    expect(result).toBe('test result');
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle explicit function name via id parameter', async () => {
    const testFn = async () => 'result';
    
    await flowe.track(testFn, [], 'custom-id');
    
    expect(startSpy).toHaveBeenCalledWith('custom-id', expect.anything(), undefined);
  });

  it('should extract function name from named function', async () => {
    async function namedFunction() {
      return 'result';
    }
    
    await flowe.track(namedFunction);
    
    expect(startSpy).toHaveBeenCalledWith('namedFunction', expect.anything(), undefined);
  });

  it('should handle errors in the tracked function', async () => {
    const errorMessage = 'Test error';
    const testFn = async () => {
      throw new Error(errorMessage);
    };
    
    await expect(flowe.track(testFn)).rejects.toThrow(errorMessage);
    
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ 
        error: errorMessage 
      })
    );
  });
  
  it('should handle basic parameter values', async () => {
    const testFn = async () => 'result';
    
    await flowe.track(testFn, ['value1', 123, true]);
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        param1: 'value1',
        param2: 123,
        param3: true
      }),
      undefined
    );
  });
  
  it('should handle named parameters using object format', async () => {
    const testFn = async () => 'result';
    const param1 = 'test value';
    const param2 = 42;
    
    await flowe.track(testFn, [{ param: param1, count: param2 }]);
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        param: param1,
        count: param2
      }),
      undefined
    );
  });
  
  it('should handle multiple parameter objects', async () => {
    const testFn = async () => 'result';
    
    await flowe.track(testFn, [
      { param1: 'value1' },
      { param2: 'value2' },
      'plain value'
    ]);
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        param1: 'value1',
        param2: 'value2',
        param3: 'plain value'
      }),
      undefined
    );
  });
  
  it('should handle complex object values in parameters', async () => {
    const testFn = async () => 'result';
    const complexValue = {
      nested: {
        value: 'test',
        array: [1, 2, 3]
      }
    };
    
    await flowe.track(testFn, [{ complex: complexValue }]);
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        complex: complexValue
      }),
      undefined
    );
  });
  
  it('should handle parent process relationships', async () => {
    const testFn = async () => 'result';
    const parentId = 'parent-process-id';
    
    await flowe.track(testFn, [], undefined, parentId);
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      parentId
    );
  });
  
  it('should work with arrow functions and parameter extraction', async () => {
    const param = 'test param';
    
    // Using arrow function that uses the parameter
    await flowe.track(
      () => (async () => {
        return `processed: ${param}`;
      })(),
      [{ param }]
    );
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ param }),
      undefined
    );
  });
  
  it('should handle nested tracking calls', async () => {
    const outerParam = 'outer';
    const innerParam = 'inner';
    
    const innerFn = async (param: string) => {
      return `inner: ${param}`;
    };
    
    const outerFn = async (param: string) => {
      const innerResult = await flowe.track(
        () => innerFn(innerParam), 
        [{ param: innerParam }]
      );
      return `outer: ${param}, ${innerResult}`;
    };
    
    const result = await flowe.track(
      () => outerFn(outerParam), 
      [{ param: outerParam }]
    );
    
    expect(result).toBe('outer: outer, inner: inner');
    expect(startSpy).toHaveBeenCalledTimes(2);
    expect(endSpy).toHaveBeenCalledTimes(2);
  });
});

describe('Global f instance track function', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  let startSpy: any;
  let endSpy: any;
  
  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
    
    // Configure global instance
    globalFlowe.setEnabled(true);
    
    // Spy on the start and end methods
    startSpy = vi.spyOn(globalFlowe, 'start');
    endSpy = vi.spyOn(globalFlowe, 'end');
    
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    
    // Reset global instance state
    globalFlowe.setEnabled(false);
  });
  
  it('should correctly track functions with the global instance', async () => {
    const testFn = async () => {
      await vi.advanceTimersByTimeAsync(100);
      return 'global result';
    };
    
    const result = await globalFlowe.track(testFn);
    
    expect(result).toBe('global result');
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(endSpy).toHaveBeenCalledTimes(1);
  });
  
  it('should handle parameters correctly with the global instance', async () => {
    const testFn = async () => 'result';
    const testParam = 'global param';
    
    await globalFlowe.track(testFn, [{ param: testParam }]);
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        param: testParam
      }),
      undefined
    );
  });
  
  it('should work as expected in a real-world scenario', async () => {
    const processData = async (input: string) => {
      return `processed: ${input}`;
    };
    
    const runWorkflow = async () => {
      const input = 'test input';
      
      // Track the data processing
      const result = await globalFlowe.track(
        () => processData(input),
        [{ input }]
      );
      
      return { status: 'success', result };
    };
    
    const result = await runWorkflow();
    
    expect(result).toEqual({
      status: 'success',
      result: 'processed: test input'
    });
    
    expect(startSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: 'test input'
      }),
      undefined
    );
  });
}); 