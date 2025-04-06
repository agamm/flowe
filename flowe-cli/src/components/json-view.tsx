"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Clock, Download } from "lucide-react";
import React, { useState } from "react";
import { StackFrame } from "@/types/types";

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

function isXml(str: string): boolean {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(str, 'text/xml');
		// If parsing succeeded and there's no parsererror element, it's valid XML
		return !doc.querySelector('parsererror');
	} catch {
		return false;
	}
}

function prettifyXml(sourceXml: string): string {
	try {
		const xmlDoc = new DOMParser().parseFromString(sourceXml, 'application/xml');
		const xsltDoc = new DOMParser().parseFromString([
			// describes how we want to modify the XML - indent everything
			'<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">',
			'  <xsl:strip-space elements="*"/>',
			'  <xsl:template match="para[content-style][not(text())]">',
			'    <xsl:value-of select="normalize-space(.)"/>',
			'  </xsl:template>',
			'  <xsl:template match="node()|@*">',
			'    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>',
			'  </xsl:template>',
			'  <xsl:output indent="yes"/>',
			'</xsl:stylesheet>',
		].join('\n'), 'application/xml');

		const xsltProcessor = new XSLTProcessor();    
		xsltProcessor.importStylesheet(xsltDoc);
		const resultDoc = xsltProcessor.transformToDocument(xmlDoc);
		const resultXml = new XMLSerializer().serializeToString(resultDoc);
		return resultXml;
	} catch {
		// If formatting fails, return the original XML
		return sourceXml;
	}
}

function formatValue(value: unknown): React.ReactNode {
	if (value === null) return <span className="text-gray-500">null</span>;
	if (value === undefined) return <span className="text-gray-500">undefined</span>;
	
	switch (typeof value) {
		case "string":
			// Handle XML strings
			if (isXml(value)) {
				const formattedXml = prettifyXml(value);
				return (
					<pre className="text-green-600 whitespace-pre-wrap overflow-x-auto">
						{formattedXml}
					</pre>
				);
			}
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

function StackTraceView({ frames }: { frames: StackFrame[] | undefined }) {
	if (!frames || frames.length === 0) {
		return <span className="text-gray-500 text-xs">No stack trace available</span>;
	}
	
	return (
		<div className="flex flex-col w-full">
			<div className="flex flex-wrap items-center gap-1 text-xs">
				{frames.map((frame, i) => (
					<React.Fragment key={i}>
						{i > 0 && (
							<span className="text-gray-400">
								&gt;
							</span>
						)}
						<span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 border border-blue-100">
							<span className="font-medium text-blue-700">{frame.func}</span>
							<span className="mx-1 text-gray-400">(</span>
							<span className="font-mono text-gray-700">{frame.file.split('/').pop()}</span>
							<span className="text-gray-400">:</span>
							<span className="text-gray-600">{frame.line}</span>
							<span className="text-gray-400">)</span>
						</span>
					</React.Fragment>
				))}
			</div>
		</div>
	);
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
							) : key === "stackTrace" && Array.isArray(value) ? (
								<StackTraceView frames={value as StackFrame[]} />
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

	const handleDownload = () => {
		const jsonString = JSON.stringify(data, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${title.replace(/\s+/g, "-").toLowerCase()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<div
			className={cn(
				"rounded-lg border bg-card text-card-foreground",
				className,
			)}
			data-testid="json-view-container"
		>
			<div
				className="flex w-full items-center justify-between border-b px-4 py-3 hover:bg-accent/50"
				data-testid="json-view-header"
			>
				<div 
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<button
						type="button"
						aria-label={isExpanded ? "Collapse" : "Expand"}
					>
						{isExpanded ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
					</button>
					<h3 className="font-medium">{title}</h3>
				</div>
				<div className="flex items-center gap-3">
					{timing && (
						<div className="flex items-center gap-1 text-sm text-muted-foreground">
							<Clock className="h-4 w-4" />
							<span>{formatDuration(timing.start, timing.end)}</span>
						</div>
					)}
					<button
						type="button"
						onClick={handleDownload}
						className="flex items-center text-muted-foreground hover:text-foreground"
						title="Download JSON"
					>
						<Download className="h-4 w-4" />
					</button>
				</div>
			</div>
			{isExpanded && (
				<div className="p-4 font-mono text-sm" data-testid="json-view-content">
					<JsonContent data={data} />
				</div>
			)}
		</div>
	);
}


