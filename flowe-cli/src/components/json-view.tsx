"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import React, { useState } from "react";

interface JsonViewProps {
	data: unknown;
	title: string;
	timing?: {
		start: string;
		end?: string;
	};
	className?: string;
}

function formatDuration(start: string, end?: string): string {
	const startTime = new Date(start).getTime();
	const endTime = end ? new Date(end).getTime() : Date.now();
	const duration = endTime - startTime;

	if (duration < 1000) return `${duration}ms`;
	if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`;
	return `${(duration / 60000).toFixed(2)}m`;
}

function formatValue(value: unknown): React.ReactNode {
	if (value === null) return <span className="text-gray-500">null</span>;
	if (value === undefined) return <span className="text-gray-500">undefined</span>;
	
	switch (typeof value) {
		case "string":
			// Handle ISO date strings specially
			if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
				return <span className="text-green-600">&quot;{new Date(value).toLocaleString()}&quot;</span>;
			}
			return <span className="text-green-600">&quot;{value}&quot;</span>;
		case "number":
			return <span className="text-blue-600">{value}</span>;
		case "boolean":
			return <span className="text-purple-600">{value.toString()}</span>;
		default:
			return <span>{JSON.stringify(value)}</span>;
	}
}

function JsonContent({ data }: { data: unknown }) {
	const [isExpanded, setIsExpanded] = useState(true);

	if (typeof data !== "object" || data === null) {
		return formatValue(data);
	}

	return (
		<div className="space-y-1">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="inline-flex items-center hover:text-blue-600"
			>
				{isExpanded ? (
					<ChevronDown className="h-4 w-4" />
				) : (
					<ChevronRight className="h-4 w-4" />
				)}
			</button>
			{isExpanded && (
				<div className="space-y-1 pl-4">
					{Object.entries(data).map(([key, value]) => (
						<div key={key} className="flex gap-2">
							<span className="text-violet-600">{key}:</span>
							{key === "parentIds" && Array.isArray(value) ? (
								<div className="flex flex-wrap gap-1">
									{value.length === 0 ? (
										<span className="text-gray-500">[]</span>
									) : (
										value.map((id, index) => (
											<span 
												key={index} 
												className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs"
											>
												{id}
											</span>
										))
									)}
								</div>
							) : key === "id" && typeof value === "string" ? (
								<span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
									{value}
								</span>
							) : key === "status" && typeof value === "string" ? (
								<span className={`px-2 py-0.5 rounded-full text-xs ${
									value === "completed" 
										? "bg-green-100 text-green-800" 
										: value === "pending" 
											? "bg-blue-100 text-blue-800"
											: "bg-gray-100 text-gray-800"
								}`}>
									{value}
								</span>
							) : key === "duration" && typeof value === "string" ? (
								<span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
									{value}
								</span>
							) : key === "timestamp" && typeof value === "string" ? (
								<span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
									{value}
								</span>
							) : (
								<JsonContent data={value} />
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export function JsonView({ data, title, timing, className }: JsonViewProps) {
	const [isExpanded, setIsExpanded] = useState(true);

	return (
		<div
			className={cn(
				"rounded-lg border bg-card text-card-foreground",
				className,
			)}
			data-testid="json-view-container"
		>
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex w-full items-center justify-between border-b px-4 py-3 hover:bg-accent/50"
				data-testid="json-view-header"
			>
				<div className="flex items-center gap-2">
					{isExpanded ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
					<h3 className="font-medium">{title}</h3>
				</div>
				{timing && (
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						<Clock className="h-4 w-4" />
						<span>{formatDuration(timing.start, timing.end)}</span>
					</div>
				)}
			</button>
			{isExpanded && (
				<div className="p-4 font-mono text-sm" data-testid="json-view-content">
					<JsonContent data={data} />
				</div>
			)}
		</div>
	);
}
