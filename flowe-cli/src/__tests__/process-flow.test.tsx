import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProcessFlow } from '@/components/process-flow';
import type { Flow, Process } from '@/types/types';

describe('ProcessFlow component', () => {
  // Create a mock sample flow for testing
  const createSampleFlow = (): Flow => {
    const now = Date.now();
    
    // Create root process
    const rootProcess: Process = {
      id: 'process-root',
      flowId: 'test-flow-1',
      status: 'completed',
      timestamp: now - 5000,
      createdAt: now - 5000,
      completedAt: now - 4000,
      arguments: { name: 'Root Process' }
    };
    
    // Create child process
    const childProcess: Process = {
      id: 'process-child',
      flowId: 'test-flow-1',
      status: 'completed',
      timestamp: now - 3000,
      createdAt: now - 3000,
      completedAt: now - 1000,
      arguments: { name: 'Child Process' },
      parentIds: ['process-root']
    };
    
    // Create a pending process
    const pendingProcess: Process = {
      id: 'process-pending',
      flowId: 'test-flow-1',
      status: 'pending',
      timestamp: now - 500,
      createdAt: now - 500,
      arguments: { name: 'Pending Process' },
      parentIds: ['process-child']
    };
    
    return {
      flowId: 'test-flow-1',
      processes: [rootProcess, childProcess, pendingProcess]
    };
  };
  
  it('should render a flow with all processes', async () => {
    const flow = createSampleFlow();
    
    render(<ProcessFlow flow={flow} />);
    
    // Verify processes are rendered
    await waitFor(() => {
      expect(screen.getByText('Root Process')).toBeInTheDocument();
      expect(screen.getByText('Child Process')).toBeInTheDocument();
      expect(screen.getByText('Pending Process')).toBeInTheDocument();
    });
  });
  
  it('should call onNodeSelect when clicking on a node', async () => {
    const flow = createSampleFlow();
    const handleNodeSelect = vi.fn();
    
    render(<ProcessFlow flow={flow} onNodeSelect={handleNodeSelect} />);
    
    // Find and click on a process node
    const rootNode = await screen.findByText('Root Process');
    fireEvent.click(rootNode);
    
    // Verify onNodeSelect was called with the correct process
    expect(handleNodeSelect).toHaveBeenCalledTimes(1);
    expect(handleNodeSelect).toHaveBeenCalledWith(flow.processes[0]);
    
    // Click again to deselect
    fireEvent.click(rootNode);
    
    // Should call with null when deselecting
    expect(handleNodeSelect).toHaveBeenCalledTimes(2);
    expect(handleNodeSelect).toHaveBeenLastCalledWith(null);
  });
  
  it('should display duration badges with correct formatting', async () => {
    const flow = createSampleFlow();
    
    render(<ProcessFlow flow={flow} />);
    
    // Look for duration badges (assuming they contain "s" for seconds)
    // We don't check for exact values since they depend on time differences
    const durationBadges = await screen.findAllByText(/[0-9]+(\.[0-9])?[sm]s?/);
    
    // Should have at least one duration badge
    expect(durationBadges.length).toBeGreaterThan(0);
  });
}); 