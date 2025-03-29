"use client";

import { useEffect, useState, useRef } from "react";
import type { Flow } from "@/types/types";

// Helper for deep comparison of flow objects
const hasFlowChanged = (prevFlow: Flow | null, newFlow: Flow | null): boolean => {
  if (!prevFlow && !newFlow) return false;
  if (!prevFlow || !newFlow) return true;
  
  // Compare process count
  if (prevFlow.processes.length !== newFlow.processes.length) return true;
  
  // Check for new processes or status changes
  const prevProcessMap = new Map(prevFlow.processes.map(p => [p.id, p]));
  
  for (const newProcess of newFlow.processes) {
    const prevProcess = prevProcessMap.get(newProcess.id);
    
    // New process
    if (!prevProcess) return true;
    
    // Status change
    if (prevProcess.status !== newProcess.status) return true;
    
    // Completion time change (for pending → completed transitions)
    if (prevProcess.completedAt !== newProcess.completedAt) return true;
  }
  
  return false;
};

export function useFlow(id: string) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const flowIdRef = useRef<string>(id);

  useEffect(() => {
    // If the ID changes, reset state and reconnect
    if (id !== flowIdRef.current) {
      console.log(`FLOW HOOK: Flow ID changed from ${flowIdRef.current} to ${id}`);
      flowIdRef.current = id;
      setFlow(null);
      setIsLoading(true);
      setError(null);
      
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }
  }, [id]);

  useEffect(() => {
    let mounted = true;

    // Function to handle stream connection
    const setupEventSource = () => {
      // Clean up any existing connection first
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`/api/flow/stream?${id.includes('-') ? 'flowId' : 'id'}=${id}`);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        if (mounted) {
          console.log(`Stream connected for ${id}`);
        }
      };
      
      eventSource.onmessage = (event) => {
        if (mounted) {
          try {
            const updatedFlow = JSON.parse(event.data);
            
            // Only update state if the flow actually changed
            setFlow(currentFlow => {
              if (hasFlowChanged(currentFlow, updatedFlow)) {
                return updatedFlow;
              }
              return currentFlow;
            });
            
            setIsLoading(false);
            setError(null);
          } catch (err) {
            console.error(`Error handling SSE data:`, err);
            if (!flow) {
              setError(new Error("Failed to parse stream data"));
              setIsLoading(false);
            }
          }
        }
      };

      eventSource.onerror = () => {
        // Close the broken connection
        eventSource.close();
        eventSourceRef.current = null;
        
        // Only set error if we don't already have data
        if (mounted && !flow) {
          setError(new Error("Failed to connect to stream"));
          setIsLoading(false);
        }
        
        // Simple reconnect
        setTimeout(() => {
          if (mounted) {
            setupEventSource();
          }
        }, 1000);
      };
    };

    // Set up SSE immediately
    setupEventSource();

    return () => {
      mounted = false;
      
      // Clean up event source
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [id, flow]);

  return { flow, isLoading, error };
}
