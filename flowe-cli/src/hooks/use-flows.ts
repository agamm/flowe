"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { Flow } from "@/types/types";

export function useFlows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastFlowsDataRef = useRef<string>("");
  const hasLoadedRef = useRef(false);

  const updateFlows = useCallback((newFlows: Flow[]) => {
    const newFlowsStr = JSON.stringify(newFlows);
				console.log("New flows", newFlows);
    if (newFlowsStr !== lastFlowsDataRef.current) {
      lastFlowsDataRef.current = newFlowsStr;
      setFlows(newFlows);
      setIsLoading(false);
      setError(null);
      hasLoadedRef.current = true;
    }
  }, []);

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
