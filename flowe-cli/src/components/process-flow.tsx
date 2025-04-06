"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { Flow, Process } from "@/types/types";
import * as ReactFlowModule from "@xyflow/react";
import { CheckCircle2, Clock } from "lucide-react";
import "@xyflow/react/dist/style.css";

// Types and Constants
interface ProcessFlowProps {
  flow: Flow;
  onNodeSelect?: (process: Process | null) => void;
}

const STATUS_COLORS = {
  completed: { background: "#f0fdf4", border: "#22c55e", edge: "#22c55e" },
  pending: { background: "#f7f9fc", border: "#60a5fa", edge: "#60a5fa" }
};

const SPACING = { horizontal: 300, vertical: 200 };
const FORBIDDEN_HUES = [[0, 20], [90, 150], [340, 360]]; // Avoid red and green hues

// Helper functions
const generateColor = (hue: number, isLight = true): string => {
  // Check if hue is in forbidden ranges
  const isInForbiddenRange = FORBIDDEN_HUES.some(
    ([min, max]) => hue >= min && hue <= max
  );
  
  if (isInForbiddenRange) {
    // Find a safe hue by shifting
    for (let offset = 15; offset < 360; offset += 15) {
      const newHue = (hue + offset) % 360;
      if (!FORBIDDEN_HUES.some(([min, max]) => newHue >= min && newHue <= max)) {
        hue = newHue;
        break;
      }
    }
  }
  
  const saturation = 60;
  const lightness = isLight ? 70 : 50;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const generateColors = (count: number, isLight = true): string[] => {
  if (count <= 0) return [];
  if (count === 1) return [generateColor(210, isLight)];
  
  const step = 360 / count;
  const baseHue = isLight ? 30 : 60;
  
  return Array.from({ length: count }, (_, i) => 
    generateColor((baseHue + i * step) % 360, isLight)
  );
};

function formatDuration(createdAt: number, completedAt?: number): string {
  const duration = completedAt 
    ? completedAt - createdAt 
    : Date.now() - createdAt;
  
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  if (duration < 3600000) return `${(duration / 60000).toFixed(1)}m`;
  return `${(duration / 3600000).toFixed(1)}h`;
}

function getDurationBadgeColor(createdAt: number, completedAt?: number): { bg: string, text: string } {
  const duration = completedAt ? completedAt - createdAt : Date.now() - createdAt;
  if (duration < 1000) return { bg: "bg-green-100", text: "text-green-800" };
  if (duration < 6000) return { bg: "bg-amber-100", text: "text-amber-800" };
  return { bg: "bg-red-100", text: "text-red-800" };
}

// Main flow element creation function
function createFlowElements(flow: Flow): { 
  nodes: ReactFlowModule.Node[], 
  edges: ReactFlowModule.Edge[] 
} {
  const { processes } = flow;
  if (!processes || processes.length === 0) {
    // Return empty arrays instead of throwing an error
    return { nodes: [], edges: [] };
  }

  // Maps for processing
  const processMap = new Map(processes.map(p => [p.id, p]));
  const nodeLevels = new Map<string, number>();
  const parentChildMap = new Map<string, string[]>();
  const childParentMap = new Map<string, string[]>();
  const nodePathColors = new Map<string, string>();
  
  // Build relationship maps
  processes.forEach(process => {
    if (!process.parentIds?.length) return;
    
    process.parentIds.forEach(parentId => {
      // Parent -> children
      if (!parentChildMap.has(parentId)) parentChildMap.set(parentId, []);
      parentChildMap.get(parentId)!.push(process.id);
      
      // Child -> parents (for merge detection)
      if (!childParentMap.has(process.id)) childParentMap.set(process.id, []);
      childParentMap.get(process.id)!.push(parentId);
    });
  });
  
  // Calculate levels for each node (recursive)
  const calculateLevel = (processId: string): number => {
    // Return memoized level if already calculated
    if (nodeLevels.has(processId)) return nodeLevels.get(processId)!;

    // Get the process, return 0 if not found
    const process = processMap.get(processId);
    if (!process) {
      nodeLevels.set(processId, 0);
      return 0;
    }
    
    // If no parents or empty parents array, it's a root node (level 0)
    if (!process.parentIds || !Array.isArray(process.parentIds) || process.parentIds.length === 0) {
      nodeLevels.set(processId, 0);
      return 0;
    }

    // Filter out any invalid parent IDs before mapping
    const validParentIds = process.parentIds.filter(id => id && typeof id === 'string');
    
    // If all parent IDs were invalid, make as root node
    if (validParentIds.length === 0) {
      nodeLevels.set(processId, 0);
      return 0;
    }
    
    // Calculate level based on good parents
    const level = 1 + Math.max(...validParentIds.map(calculateLevel));
    nodeLevels.set(processId, level);
    return level;
  };
  
  processes.forEach(p => calculateLevel(p.id));
  
  // Group processes by level
  const levelGroups = new Map<number, Process[]>();
  processes.forEach(p => {
    const level = nodeLevels.get(p.id)!;
    if (!levelGroups.has(level)) levelGroups.set(level, []);
    levelGroups.get(level)!.push(p);
  });
  
  // Calculate node positions
  const nodePositions = new Map<string, { x: number, y: number }>();
  
  Array.from(levelGroups.keys()).sort().forEach(level => {
    const levelProcesses = levelGroups.get(level)!;
    
    levelProcesses.forEach((process, index) => {
      let x = index * SPACING.horizontal + 100;
      
      if (process.parentIds?.length) {
        const parentPositions = process.parentIds
          .map(id => nodePositions.get(id))
          .filter(Boolean) as { x: number, y: number }[];
          
        if (parentPositions.length) {
          // Position based on average of parents
          x = parentPositions.reduce((sum, pos) => sum + pos.x, 0) / parentPositions.length;
          
          // For single parent, add slight offset
          if (process.parentIds.length === 1) x += 50;
        }
      }
      
      // Ensure minimum distance between nodes
      const nodesAtSameLevel = Array.from(nodePositions.entries())
        .filter(([id]) => nodeLevels.get(id) === level);
        
      for (const [, otherPos] of nodesAtSameLevel) {
        const minDistance = SPACING.horizontal * 0.8;
        if (Math.abs(x - otherPos.x) < minDistance) {
          x = otherPos.x + minDistance;
        }
      }
      
      nodePositions.set(process.id, { x, y: level * SPACING.vertical });
    });
  });

  // Assign colors to nodes
  const rootNodes = processes.filter(p => !p.parentIds?.length).map(p => p.id);
  const rootColors = generateColors(rootNodes.length);
  
  rootNodes.forEach((id, i) => nodePathColors.set(id, rootColors[i]));
  
  // Process queue for graph traversal
  const queue = [...rootNodes];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const nodeColor = nodePathColors.get(nodeId)!;
    const children = parentChildMap.get(nodeId) || [];
    const level = nodeLevels.get(nodeId) || 0;
    const isChildLevelLight = (level + 1) % 2 === 0;
    
    // If splitting, assign distinct colors to children
    if (children.length > 1) {
      const splitColors = generateColors(children.length, isChildLevelLight);
      children.forEach((childId, i) => {
        if (!nodePathColors.has(childId)) {
          nodePathColors.set(childId, splitColors[i]);
        }
        queue.push(childId);
      });
    } else {
      // Process each child
      children.forEach(childId => {
        if (nodePathColors.has(childId)) return; // Skip if already processed
        
        const parents = childParentMap.get(childId) || [];
        
        if (parents.length > 1) {
          // Merge point - new color
          nodePathColors.set(childId, generateColor(30 + (level * 37) % 330, isChildLevelLight));
        } else {
          // Single path - inherit parent's color
          nodePathColors.set(childId, nodeColor);
        }
        
        queue.push(childId);
      });
    }
  }
  
  // Create edges
  const edges = processes.flatMap(process => 
    process.parentIds?.map(parentId => {
      const parentProcess = processMap.get(parentId);
      const isPending = process.status === "pending" || parentProcess?.status === "pending";
      // Get color from parent node
      const edgeColor = isPending 
        ? STATUS_COLORS.pending.edge
        : nodePathColors.get(parentId) || generateColor(210);
      
      return {
        id: `${parentId}-${process.id}`,
        source: parentId,
        target: process.id,
        animated: isPending,
        style: { 
          stroke: edgeColor, 
          strokeWidth: isPending ? 3 : 2
        },
        type: 'smoothstep',
        markerEnd: {
          type: ReactFlowModule.MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: edgeColor,
        },
        data: { color: edgeColor }
      };
    }) || []
  );
  
  // Create nodes
  const nodes = processes.map(process => {
    const position = nodePositions.get(process.id) || { x: 0, y: 0 };
    const nodeLevel = nodeLevels.get(process.id) || 0;
    // Use flowName for display when available, fall back to other sources
    const processName = (process.flowName && nodeLevel === 0) ? process.flowName : 
                       (process.arguments as { name?: string })?.name || process.id.split('-')[0];
    
    // Node styling
    const nodeColor = nodePathColors.get(process.id) || "#d1d5db";
    const isCompleted = process.status === "completed";
    const isPending = process.status === "pending";

    let backgroundColor = `color-mix(in srgb, ${nodeColor}, white 70%)`;
    const statusColor = isCompleted 
      ? STATUS_COLORS.completed.background 
      : isPending 
        ? STATUS_COLORS.pending.background 
        : null;

    if (statusColor) {
      backgroundColor = `color-mix(in srgb, ${backgroundColor}, ${statusColor} 40%)`;
    }
    
    const statusIcon = isCompleted 
      ? <CheckCircle2 className="h-4 w-4 text-green-500" />
      : isPending 
        ? <Clock className="h-4 w-4 text-blue-500 animate-pulse" /> 
        : null;
    
    return {
      id: process.id,
      type: "default",
      position,
      data: { 
        label: (
          <div className="p-2 text-center" data-testid={`node-${process.id}`}>
            <div className="font-medium flex items-center justify-center gap-2">
              {processName}
              {statusIcon}
            </div>
            <div className="mt-1">
              {(process.createdAt || process.timestamp) && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  getDurationBadgeColor(
                    process.createdAt || process.timestamp,
                    process.completedAt
                  ).bg
                } ${
                  getDurationBadgeColor(
                    process.createdAt || process.timestamp,
                    process.completedAt
                  ).text
                }`}
                data-testid="duration-badge"
                >
                  {formatDuration(
                    process.createdAt || process.timestamp,
                    process.completedAt
                  )}
                </span>
              )}
            </div>
          </div>
        ),
        process
      },
      style: {
        minWidth: "180px",
        padding: "4px",
        border: "1px solid",
        borderRadius: "4px",
        background: backgroundColor,
        borderColor: nodeColor
      }
    };
  });
  
  return { nodes, edges };
}

// Main component
export function ProcessFlow({ flow, onNodeSelect }: ProcessFlowProps) {
  const { nodes, edges } = useMemo(() => {
    if (!flow.processes || flow.processes.length === 0) {
      return { nodes: [], edges: [] };
    }
    return createFlowElements(flow);
  }, [flow]);
  
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [layoutNodes, setLayoutNodes] = useState(nodes);
  const reactFlowInstance = useRef<ReactFlowModule.ReactFlowInstance | null>(null);
  const prevNodesLength = useRef(nodes.length);
  const prevProcessStateRef = useRef<string>("");
  
  // Create a fingerprint of current processes state
  const processStateFingerprint = useMemo(() => {
    if (!flow.processes || flow.processes.length === 0) return "";
    return flow.processes
      .map(p => `${p.id}:${p.status}:${p.completedAt || 0}`)
      .sort()
      .join("|");
  }, [flow.processes]);

  // Update layout when processes change
  useEffect(() => {
    if (processStateFingerprint !== prevProcessStateRef.current) {
      setLayoutNodes(nodes);
      prevProcessStateRef.current = processStateFingerprint;
      
      if (reactFlowInstance.current) {
        setTimeout(() => {
          reactFlowInstance.current?.fitView({ padding: 0.5 });
        }, 200);
        
        prevNodesLength.current = nodes.length;
      }
    }
  }, [nodes, processStateFingerprint]);

  const onNodesChange = useCallback((changes: ReactFlowModule.NodeChange[]) => {
    setLayoutNodes((nds: ReactFlowModule.Node[]) => 
      ReactFlowModule.applyNodeChanges(changes, nds)
    );
  }, []);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: ReactFlowModule.Node) => {
    const nodeId = node.id;
    const isDeselecting = selectedNode === nodeId;
    
    setSelectedNode(isDeselecting ? null : nodeId);
    onNodeSelect?.(isDeselecting ? null : flow.processes.find(p => p.id === nodeId) || null);
  }, [selectedNode, flow.processes, onNodeSelect]);

  // Render a message if there are no processes
  if (!flow.processes || flow.processes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center p-4">Loading flow data...</div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }} className="relative" data-testid="process-flow-container">
      <ReactFlowModule.ReactFlow
        nodes={layoutNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.5, minZoom: 0.5, maxZoom: 1.5 }}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        className="bg-background relative z-10"
        style={{ backgroundColor: "#F7F9FB" }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        onNodeClick={handleNodeClick}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        data-testid="react-flow"
      >
        <ReactFlowModule.Background />
        <ReactFlowModule.Controls showZoom={true} showFitView={true} />
      </ReactFlowModule.ReactFlow>
    </div>
  );
} 