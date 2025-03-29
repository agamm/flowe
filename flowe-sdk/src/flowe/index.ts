/**
 * Represents a process within a flow
 */
export interface FlowEvent {
	id: string;
	createdAt: number;
	completedAt?: number;
	args: unknown;
	output?: unknown;
	parentIds?: string[];
	completed?: boolean;
	flowId: string;
}

/**
 * Response structure when ending a flow
 */
export interface CompletedFlowEvent extends FlowEvent {
	output: unknown;
	completedAt: number;
	completed: true;
}

/**
 * Arguments for starting a new process
 */
export interface StartProcessArgs {
	id: string;
	args: unknown;
	parents?: string | string[];
}

/**
 * Arguments for ending a process
 */
export interface EndProcessArgs {
	id: string;
	output: unknown;
}

/**
 * Configuration options for Flowe
 */
export interface FloweOptions {
	/**
	 * The endpoint URL to send flow data to
	 * @default "http://localhost:27182/api/flow"
	 */
	ingestEndpoint?: string;
	
	/**
	 * Whether to suppress all errors (no throwing)
	 * @default true
	 */
	suppressErrors?: boolean;
	
	/**
	 * Whether to log errors to console
	 * @default true
	 */
	logErrors?: boolean;

	/**
	 * Whether to enable flow processing
	 * When false, start() and end() are no-ops that return mock IDs
	 * @default false
	 */
	enabled?: boolean;
	
	/**
	 * Maximum number of retry attempts for sending data
	 * @default 3
	 */
	maxRetries?: number;
}

// Global shared map of flow events across all Flowe instances
const globalFlows = new Map<string, FlowEvent>();

import { Queue, QueueItem } from './queue.js';

export class Flowe {
	private ingestEndpoint = "http://localhost:27182/api/flow";
	private activeFlowId?: string;
	private suppressErrors = true;
	private logErrors = true;
	private enabled = false;
	private maxRetries = 3;
	private queue: Queue;
	private successfullySentProcesses = new Set<string>();

	constructor(options?: FloweOptions) {
		if (options) {
			if (options.ingestEndpoint) {
				this.ingestEndpoint = options.ingestEndpoint;
			}
			
			if (options.suppressErrors !== undefined) {
				this.suppressErrors = options.suppressErrors;
			}
			
			if (options.logErrors !== undefined) {
				this.logErrors = options.logErrors;
			}

			if (options.enabled !== undefined) {
				this.enabled = options.enabled;
			}
			
			if (options.maxRetries !== undefined) {
				this.maxRetries = options.maxRetries;
			}
		}

		this.queue = new Queue({
			endpoint: this.ingestEndpoint,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			maxRetries: this.maxRetries,
			logErrors: this.logErrors
		});
	}

	/**
	 * Set whether flow processing is enabled
	 * @param enabled If true, flows will be processed; if false, start/end will be no-ops
	 */
	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * Check if flow processing is enabled
	 * @returns Whether flow processing is enabled
	 */
	isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Set whether errors should be suppressed
	 * @param suppress If true, errors will not be thrown
	 */
	setSuppressErrors(suppress: boolean): void {
		this.suppressErrors = suppress;
	}

	/**
	 * Set whether errors should be logged to console
	 * @param log If true, errors will be logged to console
	 */
	setLogErrors(log: boolean): void {
		this.logErrors = log;
	}

	/**
	 * Internal helper to handle errors consistently
		* this is mainly used in catch blocks to make 
		* sure that errors don't throw in production.
	 * @param error The error to handle
	 * @param context Optional context message for the error
	 * @returns undefined, to make it easy to return from catch blocks
	 */
	private handleError(error: unknown, context: string = ""): undefined {
		if (!this.logErrors) return undefined;
		
		if (context) {
			console.error(`${context}:`, error);
		} else {
			console.error(error);
		}
		
		if (!this.suppressErrors) {
			throw error instanceof Error ? error : new Error(String(error));
		}
		
		return undefined;
	}

	/**
	 * Rename the active flow or set the flow ID before starting
	 * @param flowId The new flow ID to use
	 * @returns The flow ID
	 */
	renameFlow(flowId: string): string {
		this.activeFlowId = flowId;
		return flowId;
	}

	/**
	 * Set the ingest endpoint URL
	 * @param url The URL to send flow data to
	 */
	setIngestEndpoint(url: string): void {
		this.ingestEndpoint = url;
		// Recreate queue with new endpoint
		this.queue = new Queue({
			endpoint: this.ingestEndpoint,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			maxRetries: this.maxRetries,
			logErrors: this.logErrors
		});
	}

	/**
	 * Get the current active flow ID
	 * @returns The active flow ID or undefined if none is active
	 */
	getActiveFlowId(): string | undefined {
		return this.activeFlowId;
	}

	/**
	 * Start a new process in the flow
	 * @param id Process type identifier
	 * @param args Process arguments
	 * @param parents Parent process ID or array of parent process IDs
	 * @returns The unique process ID or undefined if operation failed and suppressErrors is true
	 */
	start(id: string, args: unknown, parents?: string | string[]): string | undefined {
		if (!this.enabled) {
			console.warn("⚠️ Flowe SDK is disabled. To send data to the server, call f.setEnabled(true) first.");
			return id;
		}

		try {
			if (globalFlows.has(id)) {
				throw new Error(`Process with id ${id} already exists`);
			}

			// Use active flowId or create a default "flow" if none exists
			const processFlowId = this.activeFlowId || "flow";
			
			// Set as active if no active flow yet
			if (!this.activeFlowId) {
				this.renameFlow(processFlowId);
			}

			const parentIds = parents 
				? (Array.isArray(parents) ? parents : [parents]) 
				: [];

			const newProcess = {
				id,
				createdAt: Date.now(),
				args,
				parentIds,
				flowId: processFlowId,
				completed: false
			};
			
			globalFlows.set(id, newProcess);
			
			this.sendToQueue(
				id,
				{
					id,
					arguments: args as Record<string, unknown>,
					output: { status: "pending" } as Record<string, unknown>,
					timestamp: Date.now(),
					status: "pending",
					flowId: processFlowId,
					parentIds
				}
			);
			
			this.successfullySentProcesses.add(id);
			return id;
		} catch (error) {
			return this.handleError(error, "Failed to start process");
		}
	}

	private sendToQueue(id: string, payload: any): void {
		if (!this.enabled || this.queue.failed) return;

		const queueItem: QueueItem = {
			id,
			payload
		};

		this.queue.enqueue(queueItem);
	}

	/**
	 * End a process and record its output
	 * @param id The process ID to end
	 * @param output The process output
	 * @returns The completed flow event or undefined if operation failed and suppressErrors is true
	 */
	end(id: string | undefined, output: unknown): CompletedFlowEvent | undefined {
		if (!this.enabled) {
			console.warn("⚠️ Flowe SDK is disabled. To send data to the server, call f.setEnabled(true) first.");
			return;
		}

		if (!id) {
			return;
		}

		// Check if the start process was successfully sent
		if (!this.successfullySentProcesses.has(id)) {
			console.warn(`⚠️ Cannot end process ${id} because start() was not successfully sent.`);
			return;
		}

		try {
			const flow = globalFlows.get(id);
			if (!flow) {
				throw new Error(`No flow found with id ${id}`);
			}

			const parentIds = flow.parentIds || [];
			const completedAt = Date.now();
			const completedFlow = { 
				...flow, 
				output, 
				completedAt,
				parentIds,
				completed: true as const 
			};
			globalFlows.set(id, completedFlow);

			this.sendToQueue(
				completedFlow.id,
				{
					id: completedFlow.id,
					arguments: completedFlow.args as Record<string, unknown>,
					output: output as Record<string, unknown>,
					timestamp: completedAt,
					status: "completed",
					flowId: completedFlow.flowId,
					parentIds: completedFlow.parentIds
				}
			);

			return completedFlow as CompletedFlowEvent;
		} catch (error) {
			return this.handleError(error, "Failed to end process");
		}
	}

}

export const f = new Flowe();

// Make f the default export with proper typing
export default f;
