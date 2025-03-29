"use client";


export function useTimeAgo(timestamp: number | string) {
	const date =
		typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
	const now = Date.now();
	const diff = now - date;

	const minutes = Math.floor(diff / 1000 / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ago`;
	if (hours > 0) return `${hours}h ago`;
	if (minutes > 0) return `${minutes}m ago`;
	return "just now";
}
