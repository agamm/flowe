export interface Process {
	id: string;
	arguments?: Record<string, unknown>;
	output?: Record<string, unknown>;
	timestamp: number;
	createdAt?: number;
	completedAt?: number;
	status: "completed" | "failed" | "pending";
	flowId: string; // ID of the flow this process belongs to
	parentIds?: string[]; // IDs of parent processes
}

// A Flow represents a directed graph of processes
export interface Flow {
	flowId: string;
	processes: Process[];
}

// Helper type for array-like operations in components
export type ProcessArray = Process[];
