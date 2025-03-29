"use client";

import { useRef, useEffect } from "react";

// Improved function to generate aesthetically pleasing colors
const getPleasingColor = (): string => {
	// Use HSL color model for better control over saturation and lightness
	const hue = Math.floor(Math.random() * 360); // Full hue range
	const saturation = 25 + Math.floor(Math.random() * 55); // 25-80% saturation (not too gray, not too vibrant)
	const lightness = 45 + Math.floor(Math.random() * 25); // 45-70% lightness (not too dark, not too bright)
	
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const BackgroundAnimation = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		
		const nodes: Array<{
			x: number;
			y: number;
			size: number;
			color: string;
			speedX: number;
			speedY: number;
			connections: number[];
		}> = [];
		
		for (let i = 0; i < 20; i++) {
			nodes.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				size: 2 + Math.random() * 4,
				color: getPleasingColor(),
				speedX: (Math.random() - 0.5) * 0.3,
				speedY: (Math.random() - 0.5) * 0.3,
				connections: []
			});
		}
		
		for (let i = 0; i < nodes.length; i++) {
			const connectionCount = Math.floor(Math.random() * 3) + 1;
			for (let j = 0; j < connectionCount; j++) {
				const targetIndex = Math.floor(Math.random() * nodes.length);
				if (targetIndex !== i && !nodes[i].connections.includes(targetIndex)) {
					nodes[i].connections.push(targetIndex);
				}
			}
		}
		
		const animate = () => {
			if (!ctx || !canvas) return;
			
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				
				for (const connectionIndex of node.connections) {
					const connectedNode = nodes[connectionIndex];
					ctx.beginPath();
					ctx.moveTo(node.x, node.y);
					ctx.lineTo(connectedNode.x, connectedNode.y);
					ctx.strokeStyle = node.color;
					ctx.globalAlpha = 0.2;
					ctx.stroke();
					ctx.globalAlpha = 1;
				}
				
				ctx.beginPath();
				ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
				ctx.fillStyle = node.color;
				ctx.fill();
				
				node.x += node.speedX;
				node.y += node.speedY;
				
				if (node.x < 0 || node.x > canvas.width) node.speedX *= -1;
				if (node.y < 0 || node.y > canvas.height) node.speedY *= -1;
			}
			
			requestAnimationFrame(animate);
		};
		
		const handleResize = () => {
			if (canvas) {
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
			}
		};
		
		window.addEventListener('resize', handleResize);
		const animationId = requestAnimationFrame(animate);
		
		return () => {
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(animationId);
		};
	}, []);
	
	return (
		<canvas 
			ref={canvasRef} 
			className="absolute inset-0 z-0 opacity-30 pointer-events-none"
		/>
	);
};

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-8 relative">
			<BackgroundAnimation />
			<h1 className="text-3xl font-semibold mb-4 z-10">Flowe</h1>
			<p className="text-muted-foreground z-10">Process Flow Visualization</p>
		</div>
	);
}
