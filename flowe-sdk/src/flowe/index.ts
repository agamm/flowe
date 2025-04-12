/**
 * Represents a stack trace frame
 */
export interface StackFrame {
	file: string;
	func: string;
	line: string | number;
}

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
	flowName?: string;
	stackTrace?: StackFrame[];
	autoParent?: boolean;
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
	private activeFlowName?: string;
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
	 * @param flowName The new flow name to use for display
	 * @returns The generated unique flow ID
	 */
	renameFlow(flowName: string): string {
		// Generate a unique flow ID with timestamp to ensure uniqueness between runs
		const uniqueFlowId = `flow-${Date.now().toString(36)}`;
		this.activeFlowId = uniqueFlowId;
		this.activeFlowName = flowName;
		return uniqueFlowId;
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
	 * Gets the full stack trace as an array of structured trace objects
	 * Based on NodeJS best practices for capturing stack traces
	 */
	public getStackTrace(): StackFrame[] {
		const error = new Error();
		if (!error.stack) return [];
		
		return this.parseStackTrace(error.stack);
	}

	public parseStackTrace(stackTrace: string): StackFrame[] {
		const lines = stackTrace.split('\n').slice(1); // Skip the first line which is just "Error"
		
		const stackTraceParsed = lines
			.map(line => {
				// Parse stack trace lines like: "at function (file:line:column)"
				const match = line.trim().match(/at\s+(.*?)\s\((.*?):(\d+):\d+\)/);
				if (!match) return null;
				
				// Either format: "at function (file:line:column)" or "at file:line:column"
				const func = match[1] || '(anonymous)';
				const file = match[2] || '<unknown>';
				const lineNum = match[3] || '<unknown>';
				
				// Remove "async " prefix from function names
				const cleanFunc = func.replace(/^async\s+/, '');
				
				return { file, func: cleanFunc, line: lineNum } as StackFrame;
			});

		// console.log("stackTrace!!", stackTraceParsed);

		return stackTraceParsed
			.filter((item): item is StackFrame => 
				item !== null && 
				!item.file.includes('node:internal') && 
				item.func != 'eval' &&
				// !item.file.includes('node_modules') && // breaks webpack internal stack traces
				!item.func.includes('getStackTrace') // Filter out our own getStackTrace calls
			)
			.reverse(); // Reverse the order to show the innermost function call first
	}

	/**
	 * Finds a potential parent process based on stack trace similarity
	 * @param stackTrace The stack trace to match against
	 * @returns The ID of a matching process, or undefined if none found
	 */
	private findParentByStackTrace(stackTrace: StackFrame[]): string | undefined {
		if (!stackTrace.length) return undefined;
		
		// Transform current stack trace to string (excluding the f.start call)
		const normalizeStack = (stack: StackFrame[]): string => 
			stack.slice(0, -1).map(frame => `${frame.file}:${frame.func}`).join('->');
		
		const currentStackString = normalizeStack(stackTrace);
		
		// Find all potential parent processes with valid stack traces ending in f.start()
		const potentialParents = Array.from(globalFlows.values())
			.filter(process => 
				process.flowId === this.activeFlowId && 
				!process.completed &&
				process.stackTrace?.length &&
				(process.stackTrace[process.stackTrace.length - 1].func.includes('start') || 
				 process.stackTrace[process.stackTrace.length - 2].func.includes('track')) &&
				(process.stackTrace[process.stackTrace.length - 1].func.includes('Flowe.') || 
				 process.stackTrace[process.stackTrace.length - 1].func.includes('f.'))
			);
		if (!potentialParents.length) return undefined;
		
		// Find the best parent (longest stack trace prefix that's not identical to current)
		return potentialParents
			.map(process => ({ 
				id: process.id, 
				stack: normalizeStack(process.stackTrace!)
			}))
			.filter(entry => entry.stack !== currentStackString && currentStackString.startsWith(entry.stack))
			.sort((a, b) => b.stack.length - a.stack.length)[0]?.id;
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
			// Make id unique if it already exists by adding a sequential counter
			let uniqueId = id;
			let counter = 1;
			
			while (globalFlows.has(uniqueId)) {
				uniqueId = `${id}-${counter}`;
				counter++;
			}
			
			// Create a new flow with unique ID if this is first process
			if (!this.activeFlowId) {
				this.renameFlow("Default Flow");
			}
			
			// By this point, activeFlowId should always be defined
			const flowId = this.activeFlowId!;

			// Capture stack trace
			const stackTrace = this.getStackTrace();

			// Determine parent IDs
			let parentIds: string[] = [];
			let autoParent = false;
			
			if (parents) {
				// Use explicitly provided parents
				parentIds = Array.isArray(parents) ? parents : [parents];
			} else {
				// Try to find a parent by stack trace if none is provided
				const potentialParent = this.findParentByStackTrace(stackTrace);
				if (potentialParent) {
					parentIds = [potentialParent];
					autoParent = true; // Mark as automatically assigned
				}
			}

			const newProcess = {
				id: uniqueId,
				createdAt: Date.now(),
				args,
				parentIds,
				autoParent,
				flowId: flowId,
				flowName: this.activeFlowName,
				completed: false,
				stackTrace
			};
			
			globalFlows.set(uniqueId, newProcess);
			
			this.sendToQueue(
				uniqueId,
				{
					id: uniqueId,
					arguments: args as Record<string, unknown>,
					output: { status: "pending" } as Record<string, unknown>,
					timestamp: Date.now(),
					status: "pending",
					flowId: flowId,
					flowName: this.activeFlowName,
					parentIds,
					autoParent,
					stackTrace
				}
			);
			
			this.successfullySentProcesses.add(uniqueId);
			return uniqueId;
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

			// Warn about potential race conditions with auto-linked processes and non-suffixed IDs
			if (flow.autoParent && !id.includes('-')) {
				console.warn(`⚠️ Process ${id} was auto-linked to parent but is being ended with a non-unique ID. Always use the ID returned from f.start() to avoid race conditions.`, flow.stackTrace?.map(frame => `${frame.file.split('/').pop()}:${frame.func}`).join('->'));
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
					flowName: completedFlow.flowName || this.activeFlowName,
					parentIds: completedFlow.parentIds,
					stackTrace: flow.stackTrace
				}
			);

			return completedFlow as CompletedFlowEvent;
		} catch (error) {
			return this.handleError(error, "Failed to end process");
		}
	}

	/**
	 * Wraps a function with automatic tracking, calling start before and end after execution
	 * @param fn The function to wrap with tracking
	 * @param params Optional array of parameters - can be plain values or {paramName: paramValue} objects
	 * @param id Optional custom ID to use instead of function name
	 * @param parents Optional array of parent process IDs
	 * @returns The result of the function execution
	 */
	async track<T>(
		fn: (...args: any) => Promise<T> | T, 
		params?: Array<string | number | boolean | Record<string, any>>,
		id?: string,
		parents?: string[]
	): Promise<T> {
		// Extract function name from string representation or use provided id
		const fnString = fn.toString();
		let functionName = id || "unknown";
		
		// Try to get function name if not provided
		if (!id) {
			// Try to match patterns for function name extraction
			const funcMatch = fnString.match(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
			const boundMatch = fnString.match(/\(\)\s*=>\s*([a-zA-Z0-9_$]+)\(/);
			
			if (funcMatch && funcMatch[1]) {
				functionName = funcMatch[1];
			} else if (boundMatch && boundMatch[1]) {
				functionName = boundMatch[1];
			}
		}

		// Process parameters
		let processParams: Record<string, unknown> = {};
		
		if (params && params.length > 0) {
			// Process each parameter
			params.forEach((param, index) => {
				if (param !== null && typeof param === 'object') {
					// It's an object with key-value pairs
					// Each key is a parameter name, and its value is the parameter value
					Object.entries(param).forEach(([key, value]) => {
						processParams[key] = value;
					});
				} else {
					// Unnamed parameter, use index as key
					processParams[`param${index + 1}`] = param;
				}
			});
		}
		
		// Start tracking the function with processed parameters
		const processId = this.start(functionName, processParams, parents);
		
		try {
			// Execute the function
			const result = await fn();
			
			// End tracking with the result
			this.end(processId, result);
			
			return result;
		} catch (error) {
			// End tracking with the error
			this.end(processId, { error: error instanceof Error ? error.message : String(error) });
			throw error;
		}
	}

}

export const f = new Flowe();

/**
 * Factory function to create a new Flowe instance
 * @param options Configuration options for Flowe
 * @returns A new Flowe instance
 */
export function createFlowe(options?: FloweOptions): Flowe {
	return new Flowe(options);
}

// Make f the default export with proper typing
export default f;
