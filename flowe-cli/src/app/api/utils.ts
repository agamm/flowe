import { NextResponse } from "next/server";
import { getAllProcessesForFlow } from "@/lib/keyv";
import type { Flow } from "@/types/types";

/**
 * Creates a JSON response with appropriate status
 */
export function createJsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Retrieves all processes for a specific flow
 */
export async function fetchFlowById(flowId: string): Promise<Flow> {
  const processes = await getAllProcessesForFlow(flowId);
  
  // Extract flow name from the first process that has one
  const flowName = processes.find(p => p.flowName)?.flowName || 
                   processes[0]?.arguments?.name as string || 
                   flowId.split('-')[0];
  
  return {
    flowId,
    flowName,
    processes: processes.sort((a, b) => a.timestamp - b.timestamp)
  };
}

/**
 * Sorts flows by timestamp, newest first
 */
export function sortFlowsByTimestamp(flows: Flow[]): Flow[] {
  return flows.sort((a, b) => {
    const aTime = a.processes[0]?.timestamp ?? 0;
    const bTime = b.processes[0]?.timestamp ?? 0;
    return bTime - aTime;
  });
}

/**
 * Creates SSE response headers
 */
export function createSSEHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  };
} 