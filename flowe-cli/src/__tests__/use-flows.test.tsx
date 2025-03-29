import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFlows } from '@/hooks/use-flows';

// Access the mock EventSource
const MockEventSource = (global.EventSource as unknown) as {
  instances: Array<{
    url: string;
    simulateMessage: (data: unknown) => void;
    simulateError: () => void;
  }>;
};

describe('useFlows hook', () => {
  // Clean up after each test
  afterEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances.length = 0;
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useFlows());
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.flows).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should receive and update flows from SSE', async () => {
    // Render the hook
    const { result } = renderHook(() => useFlows());
    
    // Simulate SSE connection and message
    await act(async () => {
      // Wait for EventSource to be created
      await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
      
      // Simulate receiving a message with sample flows
      const mockFlows = [
        {
          flowId: 'flow-1',
          processes: [
            { id: 'process-1', flowId: 'flow-1', timestamp: 1000 }
          ]
        }
      ];
      
      MockEventSource.instances[0].simulateMessage(mockFlows);
    });
    
    // Verify the flows were updated
    expect(result.current.isLoading).toBe(false);
    expect(result.current.flows).toEqual([
      {
        flowId: 'flow-1',
        processes: [
          { id: 'process-1', flowId: 'flow-1', timestamp: 1000 }
        ]
      }
    ]);
    expect(result.current.error).toBe(null);
  });

  it('should handle connection errors gracefully', async () => {
    // Render the hook
    const { result } = renderHook(() => useFlows());
    
    // Simulate SSE connection error
    await act(async () => {
      // Wait for EventSource to be created
      await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
      
      // Simulate error
      MockEventSource.instances[0].simulateError();
    });
    
    // Should show error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to connect to stream');
  });
}); 