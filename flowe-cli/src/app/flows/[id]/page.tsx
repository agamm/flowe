"use client";

import { ProcessFlow } from "@/components/process-flow";
import { JsonView } from "@/components/json-view";
import { useFlow } from "@/hooks/use-flow";
import { notFound } from "next/navigation";
import { useState, use, useEffect } from "react";
import type { Process } from "@/types/types";
import { Clock, RefreshCw } from "lucide-react";

export default function FlowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { flow, isLoading, error } = useFlow(id);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Update the selected process when flow data changes
  useEffect(() => {
    if (flow && selectedProcess) {
      // Find the updated version of the selected process
      const updatedProcess = flow.processes.find(p => p.id === selectedProcess.id);
      if (updatedProcess && JSON.stringify(updatedProcess) !== JSON.stringify(selectedProcess)) {
        setSelectedProcess(updatedProcess);
        setIsStreaming(true);
        setLastUpdated(new Date());
        
        // Reset streaming indicator after a delay
        const timer = setTimeout(() => {
          setIsStreaming(false);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [flow, selectedProcess]);

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Flow View</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Flow View</h1>
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  if (!flow) {
    notFound();
  }

  // Find the first process (usually the one without a parent)
  const rootProcess = flow.processes.find(p => !p.parentIds || p.parentIds.length === 0) || flow.processes[0];
  if (!rootProcess) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Flow View</h1>
        <p className="text-red-500">Error: No processes found in this flow</p>
      </div>
    );
  }

  const handleProcessSelect = (process: Process | null) => {
    setSelectedProcess(process);
  };

  // Count pending processes
  const pendingProcesses = flow.processes.filter(p => p.status === "pending").length;

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Flow View</h1>
          <div className="text-sm text-muted-foreground mt-1">
            Started: {new Date(rootProcess.createdAt || rootProcess.timestamp).toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">
            Processes: {flow.processes.length} 
            {pendingProcesses > 0 && (
              <span className="ml-2 text-blue-500">
                ({pendingProcesses} pending)
              </span>
            )}
          </div>
        </div>
        
        {isStreaming && (
          <div className="flex items-center bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm animate-pulse">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Updating...
          </div>
        )}
      </div>

      <div className="h-[600px] border rounded-lg overflow-hidden">
        <ProcessFlow flow={flow} onNodeSelect={handleProcessSelect} />
      </div>

      {selectedProcess && (
        <div className="mt-6">
          <div className="flex items-center mb-4">
            <h2 className="text-xl font-semibold mr-2">Process Details</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
              {selectedProcess.id}
            </span>
            {selectedProcess.parentIds && selectedProcess.parentIds.length > 0 && (
              <div className="flex items-center ml-2 gap-1">
                <span className="text-sm text-muted-foreground">Parent{selectedProcess.parentIds.length > 1 ? 's' : ''}:</span>
                {selectedProcess.parentIds.map((parentId) => (
                  <span key={parentId} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {parentId}
                  </span>
                ))}
              </div>
            )}
            {selectedProcess.status === "pending" && (
              <span className="ml-2 flex items-center text-blue-500">
                <Clock className="h-4 w-4 mr-1 animate-pulse" />
                <span className="text-sm">Pending</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {selectedProcess.arguments && (
              <JsonView 
                data={selectedProcess.arguments} 
                title="Input"
              />
            )}
            
            {selectedProcess.status === "pending" ? (
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Output</h3>
                  <div className="flex items-center text-blue-500 text-sm">
                    <Clock className="h-4 w-4 mr-1 animate-pulse" />
                    <span>Pending</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded text-slate-500 italic text-sm">
                  Waiting for process to complete...
                </div>
              </div>
            ) : selectedProcess.output && (
              <JsonView 
                data={selectedProcess.output} 
                title="Output" 
                timing={selectedProcess.completedAt ? {
                  start: new Date(selectedProcess.createdAt || selectedProcess.timestamp).toISOString(),
                  end: new Date(selectedProcess.completedAt).toISOString()
                } : undefined}
              />
            )}
          </div>
          
          <div className="mb-4">
            <JsonView 
              data={{
                duration: selectedProcess.completedAt 
                  ? `${((selectedProcess.completedAt - (selectedProcess.createdAt || selectedProcess.timestamp)) / 1000).toFixed(2)}s`
                  : selectedProcess.status === "pending"
                  ? `${((Date.now() - (selectedProcess.createdAt || selectedProcess.timestamp)) / 1000).toFixed(2)}s (in progress)`
                  : "Completed (timestamp missing)",
                createdAt: new Date(selectedProcess.createdAt || selectedProcess.timestamp).toLocaleString(),
                timestamp: new Date(selectedProcess.timestamp).toLocaleString(),
                status: selectedProcess.status
              }} 
              title="Metadata"
            />
          </div>
          
          {isStreaming && (
            <div className="text-xs text-blue-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {!selectedProcess && (
        <div className="mt-6 p-8 border rounded-lg text-center text-muted-foreground">
          <p>Select a node in the graph to view details</p>
        </div>
      )}
    </div>
  );
} 