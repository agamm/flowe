import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFlow } from '@/hooks/use-flow';

// Access the mock EventSource
const MockEventSource = (global.EventSource as unknown) as {
  instances: Array<{
    url: string;
    simulateMessage: (data: unknown) => void;
    simulateError: () => void;
  }>;
};

describe('useFlow hook', () => {
  afterEach(() => {
    vi.clearAllMocks();
    MockEventSource.instances.length = 0;
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useFlow('test-flow-id'));
    
    expect(result.current.isLoading).toBe(true);
    expect(result.current.flow).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should receive and update flow data from SSE', async () => {
    // Render the hook with a flow ID
    const { result } = renderHook(() => useFlow('test-flow-id'));
    
    // Simulate SSE connection and message
    await act(async () => {
      // Wait for EventSource to be created
      await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
      
      // Verify the correct URL was used (flowId param since it includes a dash)
      expect(MockEventSource.instances[0].url).toBe('/api/flow/stream?flowId=test-flow-id');
      
      // Simulate receiving a message with sample flow
      const mockFlow = {
        flowId: 'test-flow-id',
        processes: [
          { id: 'process-1', flowId: 'test-flow-id', timestamp: 1000, status: 'completed' }
        ]
      };
      
      MockEventSource.instances[0].simulateMessage(mockFlow);
    });
    
    // Verify the flow was updated
    expect(result.current.isLoading).toBe(false);
    expect(result.current.flow).toEqual({
      flowId: 'test-flow-id',
      processes: [
        { id: 'process-1', flowId: 'test-flow-id', timestamp: 1000, status: 'completed' }
      ]
    });
    expect(result.current.error).toBeNull();
  });

  it('should handle connection errors gracefully', async () => {
    // Render the hook
    const { result } = renderHook(() => useFlow('test-flow-id'));
    
    // Simulate SSE connection error
    await act(async () => {
      // Wait for EventSource to be created
      await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
      
      // Simulate error
      MockEventSource.instances[0].simulateError();
    });
    
    // Should show error state
    expect(result.current.isLoading).toBe(false);
    expect(result.current.flow).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to connect to stream');
  });

  it('should use different parameter based on ID format', async () => {
    // Render the hook with a numeric ID (without dash)
    renderHook(() => useFlow('12345'));
    
    await act(async () => {
      // Wait for EventSource to be created
      await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
      
      // Verify the correct URL was used (id param since it does not include a dash)
      expect(MockEventSource.instances[0].url).toBe('/api/flow/stream?id=12345');
    });
  });
}); 