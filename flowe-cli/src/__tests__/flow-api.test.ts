import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/flow/route';
import { kv } from '@/lib/keyv';
import type { Process } from '@/types/types';

vi.mock('@/lib/keyv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  }
}));

describe('Flow API POST endpoint', () => {
  const mockDate = 1515151515151;
  
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });
  
  it('should return 400 if id or flowId is missing', async () => {
    const request = new NextRequest('http://localhost/api/flow', {
      method: 'POST',
      body: JSON.stringify({ status: 'pending' }), // no id or flowId
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'id and flowId are required');
  });
  
  it('should create a new process when it does not exist', async () => {
    vi.mocked(kv.get).mockResolvedValueOnce(null as unknown as Process);
    vi.mocked(kv.set).mockResolvedValueOnce(true as unknown as boolean);
    
    const mockProcess: Process = {
      id: 'test-process',
      flowId: 'test-flow',
      arguments: { param: 'value' },
      output: { result: 'success' },
      timestamp: mockDate,
      createdAt: mockDate,
      status: 'pending' as const,
      parentIds: ['parent-1']
    };
    vi.mocked(kv.get).mockResolvedValueOnce(mockProcess as unknown as Process);
    
    const request = new NextRequest('http://localhost/api/flow', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-process',
        flowId: 'test-flow',
        arguments: { param: 'value' },
        output: { result: 'success' },
        status: 'pending',
        parentIds: ['parent-1']
      }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('message', 'Process test-process stored successfully');
    expect(data).toHaveProperty('processId', 'test-process');
    expect(data).toHaveProperty('flowId', 'test-flow');
    
    expect(vi.mocked(kv.set)).toHaveBeenCalledWith('test-process', expect.objectContaining({
      id: 'test-process',
      flowId: 'test-flow',
      arguments: { param: 'value' },
      output: { result: 'success' },
      timestamp: mockDate,
      createdAt: mockDate,
      status: 'pending',
      parentIds: ['parent-1']
    }));
  });
  
  it('should update an existing process', async () => {
    const existingProcess: Process = {
      id: 'test-process',
      flowId: 'test-flow',
      arguments: { oldParam: 'oldValue' },
      output: { oldResult: 'pending' },
      timestamp: mockDate - 5000,
      createdAt: mockDate - 5000,
      status: 'pending' as const,
      parentIds: []
    };
    
    vi.mocked(kv.get).mockResolvedValueOnce(existingProcess as unknown as Process);
    vi.mocked(kv.set).mockResolvedValueOnce(true as unknown as boolean);
    
    const updatedProcess: Process = {
      id: 'test-process',
      flowId: 'test-flow',
      arguments: { newParam: 'newValue' },
      output: { result: 'success' },
      timestamp: mockDate,
      createdAt: mockDate - 5000,
      status: 'completed' as const,
      parentIds: ['parent-1'],
      completedAt: mockDate
    };
    vi.mocked(kv.get).mockResolvedValueOnce(updatedProcess as unknown as Process);
    
    const request = new NextRequest('http://localhost/api/flow', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-process',
        flowId: 'test-flow',
        arguments: { newParam: 'newValue' },
        output: { result: 'success' },
        status: 'completed',
        parentIds: ['parent-1']
      }),
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    
    expect(vi.mocked(kv.set)).toHaveBeenCalledWith('test-process', expect.objectContaining({
      id: 'test-process',
      flowId: 'test-flow',
      arguments: { newParam: 'newValue' },
      output: { result: 'success' },
      timestamp: mockDate,
      createdAt: mockDate - 5000,
      status: 'completed',
      parentIds: ['parent-1'],
      completedAt: mockDate
    }));
  });
}); 