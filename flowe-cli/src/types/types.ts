/**
 * Represents a stack trace frame from the SDK
 */
export interface StackFrame {
	file: string;
	func: string;
	line: number;
}

export interface Process {
	id: string;
	arguments?: Record<string, unknown>;
	output?: Record<string, unknown>;
	timestamp: number;
	createdAt?: number;
	completedAt?: number;
	status: "completed" | "failed" | "pending";
	flowId: string; // ID of the flow this process belongs to
	flowName?: string; // Display name of the flow
	parentIds?: string[]; // IDs of parent processes
	stackTrace?: StackFrame[]; // Stack trace at process creation time
}

// A Flow represents a directed graph of processes
export interface Flow {
	flowId: string;
	flowName?: string;
	processes: Process[];
}

// Helper type for array-like operations in components
export type ProcessArray = Process[];
