import { describe, it, expect } from 'vitest';
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
}); 