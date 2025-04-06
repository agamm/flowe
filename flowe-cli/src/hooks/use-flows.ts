"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Flow } from "@/types/types";

export function useFlows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const hasLoadedRef = useRef(false);

  const updateFlows = useCallback((newFlows: Flow[]) => {
    // Skip empty flows
    if (!newFlows.length) return;
    
    // Quick checks for obvious differences
    const newFlowIds = newFlows.map(f => f.flowId).sort().join(',');
    const oldFlowIds = flows.map(f => f.flowId).sort().join(',');
    
    // New flow arrived or number of flows changed
    if (newFlowIds !== oldFlowIds) {
      console.log("New flows detected:", newFlows.length);
      setFlows(newFlows);
      setIsLoading(false);
      setError(null);
      hasLoadedRef.current = true;
      return;
    }
    
    // Check for process count changes
    const hasProcessChanges = newFlows.some(newFlow => {
      const oldFlow = flows.find(f => f.flowId === newFlow.flowId);
      return !oldFlow || oldFlow.processes.length !== newFlow.processes.length;
    });
    
    if (hasProcessChanges) {
      console.log("Process changes detected", newFlows.length);
      setFlows(newFlows);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    // Check for process status changes
    const hasStatusChanges = newFlows.some(newFlow => {
      const oldFlow = flows.find(f => f.flowId === newFlow.flowId);
      if (!oldFlow) return false;
      
      return newFlow.processes.some(newProcess => {
        const oldProcess = oldFlow.processes.find(p => p.id === newProcess.id);
        return oldProcess && oldProcess.status !== newProcess.status;
      });
    });
    
    if (hasStatusChanges) {
      console.log("Process status changes detected", newFlows.length);
      setFlows(newFlows);
      setIsLoading(false);
      setError(null);
    }
  }, [flows]);

  useEffect(() => {
    let active = true;

    const setupEventSource = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/flows/stream");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        if (!active) return;
        try {
          const newFlows = JSON.parse(event.data);
          if (Array.isArray(newFlows)) {
            updateFlows(newFlows);
          }
        } catch (err) {
          console.error("Failed to parse SSE data:", err);
          if (!hasLoadedRef.current) {
            setError(new Error("Failed to parse stream data"));
          }
        }
      };

      es.onerror = () => {
        if (!active) return;
        es.close();
        eventSourceRef.current = null;

        if (!hasLoadedRef.current) {
          setError(new Error("Failed to connect to stream"));
          setIsLoading(false);
        }

        // Attempt to reconnect after a short delay
        setTimeout(() => {
          if (active) setupEventSource();
        }, 1000);
      };
    };

    setupEventSource();

    return () => {
      active = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [updateFlows]);

  return { flows, isLoading, error };
}
