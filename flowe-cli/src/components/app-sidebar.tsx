"use client";

import { SearchForm } from "@/components/search-form";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { useFlows } from "@/hooks/use-flows";
import { Circle, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Flow } from "@/types/types";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FlowItemProps {
	flow: Flow;
	isActive: boolean;
}

function FlowItem({ flow, isActive }: FlowItemProps) {
	const rootProcess = flow.processes[0];
	const timeAgo = useTimeAgo(rootProcess.timestamp);
	const processCount = flow.processes.length;
	// Check if any process is pending - if none are pending, the flow is completed
	const isAnyPending = flow.processes.some(p => p.status === "pending");
	const status = isAnyPending ? "pending" : "completed";
	
	const url = `/flows/${flow.flowId}`;
	
	// Get display name: prefer flow's name, then process arguments.name, then flow ID prefix
	const displayName = flow.flowName || 
		(typeof rootProcess.arguments === 'object' && 
		rootProcess.arguments && 
		'name' in rootProcess.arguments && 
		typeof rootProcess.arguments.name === 'string' 
			? rootProcess.arguments.name 
			: `Flow ${flow.flowId.split('-')[0]}`);
	
	return (
		<SidebarMenuItem>
			<SidebarMenuButton asChild isActive={isActive}>
				<Link href={url} className="flex items-center gap-2">
					<Circle
						className={
							status === "completed"
								? "fill-green-500 text-green-500"
								: "fill-blue-500 text-blue-500 animate-pulse"
						}
						size={8}
					/>
					<div className="flex flex-col">
						<span className="text-sm font-medium">
							{displayName}
						</span>
						<span className="text-xs text-muted-foreground">
							{processCount} processes • {timeAgo}
						</span>
					</div>
				</Link>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}

export function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const { flows, isLoading, error } = useFlows();
	const [autoSelectNewFlows, setAutoSelectNewFlows] = useState(true);
	
	// Auto-select new flows when needed
	useEffect(() => {
		// Skip if auto-select is disabled, no flows, or still loading
		if (!autoSelectNewFlows || !flows?.length || isLoading) return;
		
		// Get the newest flow by timestamp
		const newestFlow = [...flows].sort((a, b) => {
			const aTime = a.processes[0]?.timestamp || 0;
			const bTime = b.processes[0]?.timestamp || 0;
			return bTime - aTime; // Newest first
		})[0];
		
		// Get current flow ID from URL
		const currentFlowId = pathname.startsWith('/flows/') 
			? pathname.split('/')[2]
			: null;
		
		// Find out if we should navigate to the newest flow
		let shouldNavigate = false;
		
		// Case 1: Not on a flow page (home page or elsewhere)
		if (!currentFlowId) {
			shouldNavigate = true;
		} 
		// Case 2: Current flow doesn't exist anymore
		else if (!flows.some(f => f.flowId === currentFlowId)) {
			shouldNavigate = true;
		}
		// Case 3: A new flow arrived that's significantly newer than current
		else if (currentFlowId !== newestFlow.flowId) {
			const currentFlow = flows.find(f => f.flowId === currentFlowId);
			// Check if newest flow is at least 2 seconds newer than current flow
			const currentTime = currentFlow?.processes[0]?.timestamp || 0;
			const newestTime = newestFlow.processes[0]?.timestamp || 0;
			if (newestTime - currentTime > 2000) {
				shouldNavigate = true;
			}
		}

		// Navigate if needed
		if (shouldNavigate) {
			router.replace(`/flows/${newestFlow.flowId}`);
		}
	}, [flows, pathname, router, autoSelectNewFlows, isLoading]);

	return (
		<Sidebar>
			<SidebarHeader>
				<div className="flex items-center justify-between px-4 py-2">
					<Link href="/" className="text-lg font-semibold">Flowe</Link>
					{isLoading && (
						<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
					)}
				</div>
				<SearchForm />
			</SidebarHeader>
			<SidebarContent>
				<div className="px-4 py-2 flex items-center gap-1.5 border-b text-xs">
					<Switch 
						checked={autoSelectNewFlows} 
						onCheckedChange={setAutoSelectNewFlows}
						id="auto-select"
						aria-label="Auto-select new flows"
					/>
					<Label htmlFor="auto-select" className="cursor-pointer">
						Auto-select
					</Label>
				</div>
				
				<SidebarGroup>
					<SidebarGroupLabel>Recent Flows</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{isLoading ? (
								<div className="flex items-center justify-center py-4">
									<Loader2 className="h-4 w-4 animate-spin" />
								</div>
							) : error ? (
								<div className="px-4 py-2 text-sm text-red-500">
									Failed to load flows
								</div>
							) : flows.length === 0 ? (
								<div className="px-4 py-2 text-sm text-muted-foreground">
									No flows yet
								</div>
							) : (
								flows.map((flow: Flow) => (
									<FlowItem 
										key={flow.flowId}
										flow={flow}
										isActive={pathname === `/flows/${flow.flowId}`}
									/>
								))
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
