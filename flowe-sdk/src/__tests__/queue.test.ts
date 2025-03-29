import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Queue, QueueItem, QueueOptions } from '../flowe/queue';

describe('Queue', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should process queue items in order', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, processes: [{ id: 'item1' }] })
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, processes: [{ id: 'item2' }] })
    });

    const queue = new Queue({
      endpoint: 'http://test.endpoint'
    });

    queue.enqueue({ id: 'item1', payload: { id: 'item1', data: 'test1' } });
    queue.enqueue({ id: 'item2', payload: { id: 'item2', data: 'test2' } });

    await vi.runAllTimersAsync();
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][1].body).toContain('item1');
    expect(mockFetch.mock.calls[1][1].body).toContain('item2');
    expect(queue.length).toBe(0);
  });

  it('should retry failed requests with exponential backoff', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, processes: [{ id: 'retry-item' }] })
      });

    const queue = new Queue({
      endpoint: 'http://test.endpoint',
      retryDelay: 100,
      maxRetries: 1
    });

    queue.enqueue({ id: 'retry-item', payload: { id: 'retry-item', data: 'test' } });

    await vi.runAllTimersAsync();
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(queue.length).toBe(0);
  });

  it('should fail permanently after max retries', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const queue = new Queue({
      endpoint: 'http://test.endpoint',
      retryDelay: 100,
      maxRetries: 2
    });

    queue.enqueue({ id: 'fail-item', payload: { id: 'fail-item', data: 'test' } });

    await vi.runAllTimersAsync();
    await vi.advanceTimersByTimeAsync(100);
    await vi.runAllTimersAsync();
    await vi.advanceTimersByTimeAsync(200);
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(queue.failed).toBe(true);
    
    queue.enqueue({ id: 'another-item', payload: { id: 'another-item' } });
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Queue has failed permanently'));
    
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should handle server error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const queue = new Queue({
      endpoint: 'http://test.endpoint',
      maxRetries: 0
    });

    queue.enqueue({ id: 'server-error', payload: { id: 'server-error' } });
    await vi.runAllTimersAsync();

    expect(queue.failed).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing queue item'));
    
    consoleErrorSpy.mockRestore();
  });

  it('should handle invalid server responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: false })
    });

    const queue = new Queue({
      endpoint: 'http://test.endpoint',
      maxRetries: 0
    });

    queue.enqueue({ id: 'invalid-response', payload: { id: 'invalid-response' } });
    await vi.runAllTimersAsync();

    expect(queue.failed).toBe(true);
  });

  it('should clear queue and reset failed state', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const queue = new Queue({
      endpoint: 'http://test.endpoint',
      maxRetries: 0
    });

    queue.enqueue({ id: 'item-to-fail', payload: { id: 'item-to-fail' } });
    await vi.runAllTimersAsync();
    expect(queue.failed).toBe(true);

    queue.clear();
    expect(queue.failed).toBe(false);
    expect(queue.length).toBe(0);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, processes: [{ id: 'new-item' }] })
    });

    queue.enqueue({ id: 'new-item', payload: { id: 'new-item' } });
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
}); 