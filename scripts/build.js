#!/usr/bin/env node

import { execSync } from 'child_process';
import { mkdirSync, existsSync, readdirSync, copyFileSync, writeFileSync, rmSync, statSync, cpSync } from 'fs';
import { join, resolve } from 'path';

const rootDir = resolve(process.cwd());
const distDir = join(rootDir, 'dist');
const sdkDistDir = join(distDir, 'sdk');

console.log('Building Flowe monorepo...');

// Clean and create dist directories
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });
mkdirSync(sdkDistDir, { recursive: true });

// Build SDK
console.log('Building SDK...');
process.chdir(join(rootDir, 'flowe-sdk'));
execSync('npm run build', { stdio: 'inherit' });

// Build CLI
console.log('Building CLI...');
process.chdir(join(rootDir, 'flowe-cli'));
execSync('npm run build', { stdio: 'inherit' });

// Copy SDK files to dist/sdk
const sdkSrcDir = join(rootDir, 'flowe-sdk', 'dist');
if (existsSync(sdkSrcDir)) {
  // Check for the actual output structure - TypeScript typically outputs directly to dist
  // without preserving the src/flowe directory structure
  const altFloweIndexFile = join(sdkSrcDir, 'index.js');
  
  if (existsSync(join(sdkSrcDir, 'flowe'))) {
    // If TypeScript preserved the 'flowe' subdirectory
    console.log('Copying SDK flowe directory to dist/sdk...');
    cpSync(join(sdkSrcDir, 'flowe'), sdkDistDir, { recursive: true });
  } else if (existsSync(join(sdkSrcDir, 'src', 'flowe'))) {
    // If TypeScript preserved the src/flowe structure
    console.log('Copying SDK src/flowe directory to dist/sdk...');
    cpSync(join(sdkSrcDir, 'src', 'flowe'), sdkDistDir, { recursive: true });
  } else if (existsSync(altFloweIndexFile)) {
    // If TypeScript output directly to dist
    console.log('Copying SDK files from dist to dist/sdk...');
    readdirSync(sdkSrcDir).forEach(file => {
      const sourcePath = join(sdkSrcDir, file);
      if (!statSync(sourcePath).isDirectory()) {
        copyFileSync(sourcePath, join(sdkDistDir, file));
      } else if (file !== 'node_modules') {
        // Copy any directories that aren't node_modules
        cpSync(sourcePath, join(sdkDistDir, file), { recursive: true });
      }
    });
  } else {
    console.error('Could not find compiled SDK files!');
    console.log('Contents of SDK dist directory:');
    listDirectoryContents(sdkSrcDir);
    process.exit(1);
  }
  
  // Verify queue file was copied
  const queueFile = join(sdkDistDir, 'queue.js');
  if (existsSync(queueFile)) {
    console.log('✅ Queue implementation successfully included in build');
  } else {
    console.error('❌ Queue implementation not found in build output!');
    console.log('Files in dist/sdk:');
    listDirectoryContents(sdkDistDir);
    
    // Try to locate the queue file in the build output
    findFile(sdkSrcDir, 'queue.js');
  }
} else {
  console.error('SDK build directory not found!');
  process.exit(1);
}

// Helper function to list directory contents
function listDirectoryContents(dir) {
  try {
    const items = readdirSync(dir, { withFileTypes: true });
    items.forEach(item => {
      if (item.isDirectory()) {
        console.log(`📁 ${item.name}/`);
      } else {
        console.log(`📄 ${item.name}`);
      }
    });
  } catch (error) {
    console.error(`Error listing directory ${dir}:`, error);
  }
}

// Helper function to find a file recursively
function findFile(dir, filename) {
  try {
    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const path = join(dir, file.name);
      if (file.isDirectory()) {
        findFile(path, filename);
      } else if (file.name === filename) {
        console.log(`Found ${filename} at: ${path}`);
      }
    }
  } catch (error) {
    console.error(`Error searching for ${filename}:`, error);
  }
}

// Copy CLI files to dist
const cliDistDir = join(rootDir, 'flowe-cli', 'dist');
if (existsSync(cliDistDir)) {
  readdirSync(cliDistDir).forEach(file => {
    const sourcePath = join(cliDistDir, file);
    if (!statSync(sourcePath).isDirectory() && file !== 'sdk') {
      copyFileSync(sourcePath, join(distDir, file));
    }
  });
} else {
  console.error('CLI build directory not found!');
  process.exit(1);
}

// Copy .next directory from flowe-cli to dist/.next
const nextDir = join(rootDir, 'flowe-cli', '.next');
const distNextDir = join(distDir, '.next');
if (existsSync(distNextDir)) {
  rmSync(distNextDir, { recursive: true, force: true });
}
if (existsSync(nextDir)) {
  console.log('Copying .next directory to dist/.next...');
  cpSync(nextDir, distNextDir, { recursive: true });
} else {
  console.error('Next.js build directory not found!');
  process.exit(1);
}

// Create SDK wrapper files
const wrapperContent = `// This file is auto-generated. Do not edit manually.
import { createFlowe, f } from './sdk/index.js';
import { Queue } from './sdk/queue.js';

export { createFlowe, f, Queue };
export default f;
`;
writeFileSync(join(distDir, 'sdk.js'), wrapperContent);

const typeDefinitions = `// This file is auto-generated. Do not edit manually.
import { createFlowe, f, Flowe, FloweOptions } from './sdk/index.js';
import { Queue, QueueItem } from './sdk/queue.js';

export { createFlowe, f, Flowe, Queue };
export type { FloweOptions, QueueItem };
export default f;
`;
writeFileSync(join(distDir, 'sdk.d.ts'), typeDefinitions);

// Make CLI executable
execSync(`chmod +x ${join(distDir, 'cli.js')}`);

console.log('Build completed successfully!');