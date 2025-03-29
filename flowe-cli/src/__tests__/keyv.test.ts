import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kv, listAllKeys, getAllRecords, getAllProcessesForFlow } from '@/lib/keyv';
import type { Process } from '@/types/types';

// Mock the fs module correctly
vi.mock('fs', async () => {
  return {
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined)
    },
    default: {}
  };
});

// Mock path module correctly
vi.mock('path', async () => {
  return {
    resolve: vi.fn().mockReturnValue('/mock/path/kvstore.json'),
    default: {
      resolve: vi.fn().mockReturnValue('/mock/path/kvstore.json')
    }
  };
});

// Mock console to avoid noise in test output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('KV Store', () => {
  const mockProcess1: Process = {
    id: 'process-1',
    flowId: 'flow-1',
    timestamp: 1000,
    createdAt: 1000,
    status: 'completed',
    arguments: { test: 'data1' },
    output: { result: 'success' }
  };

  const mockProcess2: Process = {
    id: 'process-2',
    flowId: 'flow-1',
    timestamp: 2000,
    createdAt: 2000,
    status: 'pending',
    arguments: { test: 'data2' }
  };

  const mockProcess3: Process = {
    id: 'process-3',
    flowId: 'flow-2',
    timestamp: 3000,
    createdAt: 3000,
    status: 'failed',
    arguments: { test: 'data3' },
    output: { error: 'Test error' }
  };

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();
    // Clear the store
    await kv.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should store and retrieve processes', async () => {
    // Store a process
    await kv.set(mockProcess1.id, mockProcess1);
    
    // Retrieve it
    const retrieved = await kv.get(mockProcess1.id);
    
    // Verify it matches what we stored
    expect(retrieved).toEqual(mockProcess1);
  });

  it('should update an existing process', async () => {
    // Store initial process
    await kv.set(mockProcess1.id, mockProcess1);
    
    // Create updated version
    const updatedProcess = {
      ...mockProcess1,
      status: 'failed' as const,
      output: { error: 'Something went wrong' }
    };
    
    // Update the process
    await kv.set(mockProcess1.id, updatedProcess);
    
    // Retrieve it
    const retrieved = await kv.get(mockProcess1.id);
    
    // Verify it was updated
    expect(retrieved).toEqual(updatedProcess);
    expect(retrieved?.status).toBe('failed');
    expect(retrieved?.output?.error).toBe('Something went wrong');
  });

  it('should delete a process', async () => {
    // Store a process
    await kv.set(mockProcess1.id, mockProcess1);
    
    // Verify it exists
    expect(await kv.has(mockProcess1.id)).toBe(true);
    
    // Delete it
    await kv.delete(mockProcess1.id);
    
    // Verify it's gone
    expect(await kv.get(mockProcess1.id)).toBeUndefined();
    expect(await kv.has(mockProcess1.id)).toBe(false);
  });

  it('should clear all processes', async () => {
    // Store multiple processes
    await kv.set(mockProcess1.id, mockProcess1);
    await kv.set(mockProcess2.id, mockProcess2);
    
    // Clear the store
    await kv.clear();
    
    // Verify they're all gone
    expect(await kv.get(mockProcess1.id)).toBeUndefined();
    expect(await kv.get(mockProcess2.id)).toBeUndefined();
  });
  
  it('should list all keys with their flowIds', async () => {
    // Store multiple processes
    await kv.set(mockProcess1.id, mockProcess1);
    await kv.set(mockProcess2.id, mockProcess2);
    await kv.set(mockProcess3.id, mockProcess3);
    
    // Get all keys
    const keys = await listAllKeys();
    
    // Verify we get all the keys with their flowIds
    expect(keys).toHaveLength(3);
    expect(keys).toContainEqual({ key: 'process-1', flowId: 'flow-1' });
    expect(keys).toContainEqual({ key: 'process-2', flowId: 'flow-1' });
    expect(keys).toContainEqual({ key: 'process-3', flowId: 'flow-2' });
  });
  
  it('should get all records', async () => {
    // Store multiple processes
    await kv.set(mockProcess1.id, mockProcess1);
    await kv.set(mockProcess2.id, mockProcess2);
    
    // Get all records
    const records = await getAllRecords();
    
    // Verify we get all the records
    expect(Object.keys(records)).toHaveLength(2);
    expect(records['process-1']).toEqual(mockProcess1);
    expect(records['process-2']).toEqual(mockProcess2);
  });
  
  it('should get all processes for a specific flow', async () => {
    // Store multiple processes
    await kv.set(mockProcess1.id, mockProcess1);
    await kv.set(mockProcess2.id, mockProcess2);
    await kv.set(mockProcess3.id, mockProcess3);
    
    // Get processes for flow-1
    const flow1Processes = await getAllProcessesForFlow('flow-1');
    
    // Verify we get only flow-1 processes
    expect(flow1Processes).toHaveLength(2);
    expect(flow1Processes).toContainEqual(mockProcess1);
    expect(flow1Processes).toContainEqual(mockProcess2);
    
    // Get processes for flow-2
    const flow2Processes = await getAllProcessesForFlow('flow-2');
    
    // Verify we get only flow-2 processes
    expect(flow2Processes).toHaveLength(1);
    expect(flow2Processes).toContainEqual(mockProcess3);
  });
}); 