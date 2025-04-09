import { f } from "../flowe/index.js";

// Helper function to wait for x ms
const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Runs the first process
 */
async function runProcess1() {
  // Start Process 1
  const process1Id = f.start("process1", { message: "Starting first process" });
  console.log("Process 1 started");
  
  // Wait for 1 second
  await wait(1000);
  
  // End Process 1
  f.end(process1Id, { status: "completed", message: "First process completed" });
  console.log("Process 1 completed");
  
  return process1Id;
}

/**
 * Runs the second process with a parent process
 */
async function runProcess2(parentId: string) {
  // Start Process 2 with Process 1 as parent
  const process2Id = f.start("process2", { message: "Starting second process" }, parentId);
  console.log("Process 2 started with parent:", parentId);
  
  // Wait for 1 second
  await wait(1000);
  
  // End Process 2
  const result = f.end(process2Id, { status: "completed", message: "Second process completed" });
  console.log("Process 2 completed");
  
  return result;
}

/**
 * Simple example demonstrating parent-child process relationship:
 * Process 1 -> Process 2
 */
async function simpleProcessFlow() {
  // By default the sdk doesn't send info (for production)
  f.setEnabled(true);
  
  const process1Id = await runProcess1();
  // Handle the case where process1Id might be undefined
  if (!process1Id) {
    console.warn("Process 1 did not return a valid ID");
    return undefined;
  }
  
  const result = await runProcess2(process1Id);
  
  return result;
}

simpleProcessFlow()
  .then(result => {
    console.log("Simple process flow completed!");
    console.log("\nResult:", result);
  })
  .catch(error => console.error("Process flow error:", error));