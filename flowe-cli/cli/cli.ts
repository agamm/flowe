#!/usr/bin/env node

import { Command } from "commander";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import next from "next";

// Default port that's unlikely to conflict with other services
const DEFAULT_PORT = 27182;

// Get the directory where the CLI is installed
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

const program = new Command();

// Read version from package.json
let packageJson;
try {
	// Try to read from packageRoot/package.json
	const packageJsonPath = path.join(packageRoot, "package.json");
	packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
} catch {
	// Fallback to a default version if we can't read package.json
	console.warn("Fatal: Could not read package.json.");
	process.exit(1);
}

program.name("flowe").description("Flowe CLI").version(packageJson.version);

program
	.command("start")
	.description("Start the Next.js server")
	.option("-p, --port <port>", "Port to run the server on", DEFAULT_PORT.toString())
	.option(
		"-H, --hostname <hostname>",
		"Hostname to run the server on",
		"localhost",
	)
	.action(async (options) => {
		const port = Number.parseInt(options.port, 10);
		const hostname = options.hostname;
		
		console.log(`Starting server on http://${hostname}:${port}`);
		
		// Look for .next directory in the same directory as the CLI script
		const nextDir = path.join(__dirname, ".next");
		
		// Verify it's a valid Flowe Next.js build
		if (!fs.existsSync(nextDir) || !fs.existsSync(path.join(nextDir, 'BUILD_ID'))) {
			console.error(`Error: Could not find a valid Flowe Next.js build in ${nextDir}`);
			console.error(`Please install flowe from GitHub or build it manually:`);
			console.error(`  npm install -g agam/flowe`);
			process.exit(1);
		}
		
		console.log(`Using Next.js build from: ${nextDir}`);
		
		try {
			// Initialize the Next.js app with the correct distDir
			const app = next({
				dev: false,
				dir: __dirname,
				conf: { 
					output: 'standalone',
					distDir: '.next'
				}
			});

			// Prepare the server
			const handler = app.getRequestHandler();
			await app.prepare();

			// Create server and listen
			const { createServer } = await import('http');
			const server = createServer(async (req, res) => {
				try {
					await handler(req, res);
				} catch (err) {
					console.error('Error handling request:', err);
					res.statusCode = 500;
					res.end('Internal Server Error');
				}
			});

			server.listen(port, hostname, () => {
				console.log(`> Ready on http://${hostname}:${port}`);
			});
		} catch (error: unknown) {
			console.error("Error starting server:", error instanceof Error ? error.message : String(error));
			process.exit(1);
		}
	});

program.parse(process.argv); 