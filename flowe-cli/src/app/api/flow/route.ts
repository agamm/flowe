import { NextRequest } from "next/server";
import { kv } from "@/lib/keyv";
import type { Process } from "@/types/types";
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
  parentIds?: string[];
  completedAt?: number;
};

// POST handler for storing new processes
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as IngestRequest;
    
    if (!body.id || !body.flowId) {
      return createJsonResponse({ error: "id and flowId are required" }, 400);
    }
    
    const now = Date.now();
    const existingProcess = await kv.get(body.id) as Process | null;
    
    // Merge the incoming payload with existing process data if it exists
    const processData: Process = {
      ...existingProcess,
      ...body,
      id: body.id,
      flowId: body.flowId,
      arguments: body.arguments || existingProcess?.arguments || {},
      output: body.output || existingProcess?.output || {},
      timestamp: body.timestamp || now,
      createdAt: existingProcess?.createdAt || body.createdAt || now,
      status: body.status,
      parentIds: body.parentIds || existingProcess?.parentIds || [],
      completedAt: body.status === "completed" ? (body.completedAt || now) : existingProcess?.completedAt
    };

    await kv.set(body.id, processData);
    
    const storedProcess = await kv.get(body.id) as Process | null;
    
    if (!storedProcess) {
      console.error(`Failed to verify storage of process ${body.id}`);
      return createJsonResponse({
        error: "Failed to verify process storage",
        processId: body.id
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