import { NextRequest } from "next/server";
import { kv } from "@/lib/keyv";
import type { Flow } from "@/types/types";
import { fetchFlowById, sortFlowsByTimestamp, createSSEHeaders } from "../../utils";

const SSE_POLL_INTERVAL = 1000;

// Streams flows with SSE - mainly for the app sidebar
async function streamFlows(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  signal: AbortSignal
) {
  const sendFlowsUpdate = async () => {
    // Early exit if connection closed
    if (signal.aborted) return;
    
    try {
      const seenFlowIds = new Set<string>();
      const flows: Flow[] = [];
      
      // Extract unique flow IDs from composite keys (flowId:processId)
      const entries = kv.iterator();
      for (const [key] of entries) {
        // Extract flowId from composite key (flowId:processId)
        const colonIndex = key.indexOf(':');
        if (colonIndex === -1) continue; // Skip legacy keys
        
        const flowId = key.substring(0, colonIndex);
        if (!flowId || seenFlowIds.has(flowId)) continue;
        
        seenFlowIds.add(flowId);
        
        try {
          const flow = await fetchFlowById(flowId);
          flows.push(flow);
        } catch (err) {
          console.warn(`Failed to fetch flow ${flowId}:`, err);
        }
      }

      const sortedFlows = sortFlowsByTimestamp(flows);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(sortedFlows)}\n\n`)
      );
    } catch (err) {
      console.error("Error while sending flows update:", err);
      // We don't want to crash the stream, so we continue despite errors
    }
  };
  
  // Send initial data
  await sendFlowsUpdate();
  
  // Set up interval for polling
  const pollIntervalId = setInterval(sendFlowsUpdate, SSE_POLL_INTERVAL);
  
  // Clean up when client disconnects
  signal.addEventListener('abort', () => {
    clearInterval(pollIntervalId);
    controller.close();
  });
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      await streamFlows(controller, encoder, request.signal);
    }
  });
  
  return new Response(stream, { headers: createSSEHeaders() });
}  