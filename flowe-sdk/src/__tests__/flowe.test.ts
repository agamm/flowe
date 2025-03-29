import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Flowe, f as globalFlowe } from '../flowe';
import { Queue } from '../flowe/queue';

describe('Flowe SDK', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockReset();
    vi.useFakeTimers();
    globalFlowe.setEnabled(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should track successfully sent processes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, processes: [{ id: 'process1' }] })
    });

    const flowe = new Flowe({
      enabled: true,
      ingestEndpoint: 'http://test.endpoint'
    });

    const processId = flowe.start('process1', { test: 'data' });
    expect(processId).toBe('process1');

    await vi.runAllTimersAsync();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, processes: [{ id: 'process1' }] })
    });

    const result = flowe.end(processId, { result: 'success' });
    expect(result).toBeDefined();
    
    await vi.runAllTimersAsync();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should not allow ending a process that was not started successfully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');
    
    const flowe = new Flowe({
      enabled: true,
      ingestEndpoint: 'http://test.endpoint'
    });

    const result = flowe.end('non-started-process', { result: 'finished' });
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot end process')
    );
    
    expect(result).toBeUndefined();
  });

  it('should handle queue failure nicely', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const flowe = new Flowe({
      enabled: true,
      ingestEndpoint: 'http://test.endpoint',
      maxRetries: 0
    });

    flowe.start('process-fail', { test: 'data' });
    await vi.runAllTimersAsync();

    Object.defineProperty((flowe as any).queue, 'failed', {
      get: () => true
    });

    mockFetch.mockReset();
    flowe.start('another-process', { test: 'more-data' });
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should correctly configure the queue with options', () => {
    const queueSpy = vi.spyOn(Flowe.prototype as any, 'sendToQueue');
    
    const flowe = new Flowe({
      enabled: true,
      ingestEndpoint: 'http://custom.endpoint',
      maxRetries: 5,
      logErrors: false
    });

    flowe.start('test-config', { input: 'test' });
    
    expect(queueSpy).toHaveBeenCalledWith(
      'test-config',
      expect.objectContaining({
        id: 'test-config',
        arguments: { input: 'test' }
      })
    );
  });

}); 