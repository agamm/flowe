import { NextRequest } from "next/server";
import type { Flow } from "@/types/types";
import { fetchFlowById, createSSEHeaders } from "../../utils";

const SSE_POLL_INTERVAL = 500; 

/**
 * Streams flow with SSE
 */
async function streamFlow(
  flowId: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  signal: AbortSignal
) {
  const sendFlowUpdate = async () => {
    if (signal.aborted) return;
    
    try {
      const flow: Flow = await fetchFlowById(flowId);
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(flow)}\n\n`)
      );
    } catch (err) {
      console.warn(`Error streaming flow ${flowId}:`, err);
      // Send an empty but valid flow to prevent client-side errors
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ flowId, processes: [] })}\n\n`)
      );
    }
  };
  
  // Send initial data
  await sendFlowUpdate();
  
  // Set up interval for polling
  const intervalId = setInterval(sendFlowUpdate, SSE_POLL_INTERVAL);
  
  // Clean up when client disconnects
  signal.addEventListener('abort', () => {
    clearInterval(intervalId);
    controller.close();
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const flowId = searchParams.get('flowId');
  
  if (!flowId) {
    return new Response(
      JSON.stringify({ error: "flowId parameter is required" }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
  
  console.log(`Streaming flow with ID: ${flowId}`);
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      await streamFlow(flowId, controller, encoder, request.signal);
    }
  });
  
  return new Response(stream, { headers: createSSEHeaders() });
} 