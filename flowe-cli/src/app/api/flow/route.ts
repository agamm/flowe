import { NextRequest } from "next/server";
import { kv } from "@/lib/keyv";
import type { Process, StackFrame } from "@/types/types";
import { createJsonResponse } from "../utils";

// IngestRequest extends Process but makes some fields optional
type IngestRequest = {
  id: string;
  arguments?: Record<string, unknown>;
  output?: Record<string, unknown>;
  timestamp?: number;
  createdAt?: number;
  status: "completed" | "failed" | "pending";
  flowId: string;
  flowName?: string;
  parentIds?: string[];
  completedAt?: number;
  stackTrace?: StackFrame[];
  autoParent?: boolean; // Track processes with automatically assigned parents
};

// POST handler for storing new processes
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IngestRequest;
    
    if (!body.id || !body.flowId) {
      return createJsonResponse({ error: "id and flowId are required" }, 400);
    }
    
    const now = Date.now();
    // Look up existing process using both the process ID and flow ID
    const existingProcess = await kv.get(body.id, body.flowId) as Process | null;
    
    // Merge the incoming payload with existing process data if it exists
    const processData: Process = {
      ...existingProcess,
      ...body,
      id: body.id,
      flowId: body.flowId,
      flowName: body.flowName || existingProcess?.flowName || "Unnamed Flow",
      arguments: body.arguments || existingProcess?.arguments || {},
      output: body.output || existingProcess?.output || {},
      timestamp: body.timestamp || now,
      createdAt: existingProcess?.createdAt || body.createdAt || now,
      status: body.status,
      parentIds: body.parentIds || existingProcess?.parentIds || [],
      completedAt: body.status === "completed" ? (body.completedAt || now) : existingProcess?.completedAt,
      stackTrace: body.stackTrace || existingProcess?.stackTrace,
      autoParent: body.autoParent !== undefined ? body.autoParent : existingProcess?.autoParent
    };

    // Store the process using the composite key
    await kv.set(body.id, processData);
    
    // Verify the process was stored
    const storedProcess = await kv.get(body.id, body.flowId) as Process | null;
    
    if (!storedProcess) {
      console.error(`Failed to verify storage of process ${body.id} in flow ${body.flowId}`);
      return createJsonResponse({
        error: "Failed to verify process storage",
        processId: body.id,
        flowId: body.flowId
      }, 500);
    }
    
    return createJsonResponse({
      success: true,
      message: `Process ${body.id} stored successfully`,
      processId: body.id,
      flowId: processData.flowId
    });
  } catch (error) {
    console.error('Error storing process:', error);
    return createJsonResponse({ error: "Failed to store process" }, 500);
  }
} 