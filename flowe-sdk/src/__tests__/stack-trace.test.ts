import { describe, it, expect, vi } from 'vitest';
import { createFlowe } from '../flowe';

// Define a type for the private method we're accessing
interface StackTraceAccessor {
  getStackTrace: () => Array<{
    file: string;
    func: string;
    line: string | number;
  }>;
}

describe('Stack Trace Functionality', () => {
  it('should parse a stack trace into structured objects with correct format', () => {
    const flowe = createFlowe({
      enabled: true,
      ingestEndpoint: 'http://test.endpoint'
    });
    
    // Get the stack trace directly from an instance
    const stackTrace = (flowe as unknown as StackTraceAccessor).getStackTrace();
    
    // Basic structure validation
    expect(Array.isArray(stackTrace)).toBe(true);
    
    if (stackTrace.length > 0) {
      const firstFrame = stackTrace[0];
      
      // Each frame should have the correct structure
      expect(firstFrame).toHaveProperty('file');
      expect(firstFrame).toHaveProperty('func');
      expect(firstFrame).toHaveProperty('line');
      
      // Validate types
      expect(typeof firstFrame.file).toBe('string');
      expect(typeof firstFrame.func).toBe('string');
      expect(['string', 'number']).toContain(typeof firstFrame.line);
      
      // Verify the getStackTrace function itself is filtered out
      const containsGetStackTrace = stackTrace.some((frame: { func: string }) => 
        frame.func.includes('getStackTrace')
      );
      expect(containsGetStackTrace).toBe(false);
      
      // File should be a path
      expect(firstFrame.file).toMatch(/\//);
      
      // Function name should be a valid identifier, including anonymous functions
      expect(firstFrame.func).toMatch(/^[\w\s.$<>()\[\]]+$/);
    }
  });

  it('should show stack trace in the correct order (innermost calls last)', () => {
    // Define a nested functions to create a known stack trace
    function level3() {
      const flowe = createFlowe({
        enabled: true,
        ingestEndpoint: 'http://test.endpoint'
      });
      
      return (flowe as unknown as StackTraceAccessor).getStackTrace();
    }
    
    function level2() {
      return level3();
    }
    
    function level1() {
      return level2();
    }
    
    const stackTrace = level1();
    
    // Ensure we have enough frames to test order
    if (stackTrace.length >= 3) {
      // Last item should be the deepest call (level3)
      const lastIndex = stackTrace.length - 1;
      const lastFunc = stackTrace[lastIndex].func;
      const secondLastFunc = stackTrace[lastIndex - 1].func;
      const thirdLastFunc = stackTrace[lastIndex - 2].func;
      
      // Expected order is level1, level2, level3 (outermost to innermost)
      expect(lastFunc).toContain('level3');
      expect(secondLastFunc).toContain('level2');
      expect(thirdLastFunc).toContain('level1');
    }
  });

  it.only('should correctly parse webpack-internal stack traces', () => {
    const flowe = createFlowe({
      enabled: true,
      ingestEndpoint: 'http://test.endpoint'
    });
    
    // Webpack-internal style stack trace
    const mockStackTrace = `Error: 
    at Flowe.getStackTrace (webpack-internal:///(action-browser)/../../node_modules/.pnpm/flowe@0.2.9_@opentelemetry+api@1.9.0_@types+react-dom@19.0.3_@types+react@19.0.8__@types+react@19.0.8/node_modules/flowe/dist/sdk/index.js:136:23)
    at Flowe.start (webpack-internal:///(action-browser)/../../node_modules/.pnpm/flowe@0.2.9_@opentelemetry+api@1.9.0_@types+react-dom@19.0.3_@types+react@19.0.8__@types+react@19.0.8/node_modules/flowe/dist/sdk/index.js:226:37)
    at extractPropertyTypeAction (webpack-internal:///(action-browser)/../../packages/ai/workflows/extract_v1/tasks/extractPropertyType.ts:27:42)
    at processExtraction (webpack-internal:///(action-browser)/../../packages/ai/workflows/extract_v1/index.ts:164:98)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async runExtraction (webpack-internal:///(action-browser)/./src/app/(sidebar)/extract/actions/extract.ts:130:9)`;
    
    // Call parseStackTrace directly instead of mocking Error
    const stackTrace = (flowe as any).parseStackTrace(mockStackTrace);
    
    // Verify structure
    expect(Array.isArray(stackTrace)).toBe(true);
    expect(stackTrace.length).toBe(4); // 4 after filtering out node:internal and getStackTrace
    
    // Verify first frame (which should be runExtraction after reversing)
    expect(stackTrace[0]).toEqual({
      file: 'webpack-internal:///(action-browser)/./src/app/(sidebar)/extract/actions/extract.ts',
      func: 'runExtraction',
      line: '130'
    });
    
    // Verify second frame (skipping node:internal which should be filtered)
    expect(stackTrace[1]).toEqual({
      file: 'webpack-internal:///(action-browser)/../../packages/ai/workflows/extract_v1/index.ts',
      func: 'processExtraction',
      line: '164'
    });
    
    // Verify third frame
    expect(stackTrace[2]).toEqual({
      file: 'webpack-internal:///(action-browser)/../../packages/ai/workflows/extract_v1/tasks/extractPropertyType.ts',
      func: 'extractPropertyTypeAction',
      line: '27'
    });
    
    // Verify fourth frame (should be Flowe.start after filtering out getStackTrace)
    expect(stackTrace[3]).toEqual({
      file: 'webpack-internal:///(action-browser)/../../node_modules/.pnpm/flowe@0.2.9_@opentelemetry+api@1.9.0_@types+react-dom@19.0.3_@types+react@19.0.8__@types+react@19.0.8/node_modules/flowe/dist/sdk/index.js',
      func: 'Flowe.start',
      line: '226'
    });
    
    // Verify getStackTrace itself was filtered out
    const hasGetStackTrace = stackTrace.some(frame => frame.func.includes('getStackTrace'));
    expect(hasGetStackTrace).toBe(false);
  });
}); 