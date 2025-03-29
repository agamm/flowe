import { NextRequest } from "next/server";
import { kv } from "@/lib/keyv";
import type { Process, Flow } from "@/types/types";
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
  const id = searchParams.get('id');
  
  let targetFlowId = flowId;
  
  // If process ID is provided but not flow ID, lookup the process to get its flow ID
  if (id && !flowId) {
    try {
      const process = await kv.get(id) as Process | null;
      
      if (!process) {
        return new Response(
          JSON.stringify({ error: "Process not found" }),
          { status: 404, headers: { 'content-type': 'application/json' } }
        );
      }
      
      if (!process.flowId) {
        return new Response(
          JSON.stringify({ error: "Process has no flowId" }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        );
      }
      
      targetFlowId = process.flowId;
    } catch (error) {
      console.error('Error looking up process:', error);
      return new Response(
        JSON.stringify({ error: "Failed to look up process" }),
        { status: 500, headers: { 'content-type': 'application/json' } }
      );
    }
  }
  
  if (!targetFlowId) {
    return new Response(
      JSON.stringify({ error: "Either flowId or id parameter is required" }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      await streamFlow(targetFlowId!, controller, encoder, request.signal);
    }
  });
  
  return new Response(stream, { headers: createSSEHeaders() });
} 