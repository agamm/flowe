import { f } from "../flowe/index.js";

// This example demonstrates auto-linking of child processes to appropriate parents
// even when they go through intermediate functions like dummyParent

// Helper function to wait for x ms
const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function that uses Flowe to track logging operations
async function exampleLog(message: string, data: any): Promise<void> {
  const id = f.start("logging", { message, data });
  console.log(`[LOG] ${message}:`, data);
  await wait(300); // Simulate some processing time
  f.end(id, { success: true, timestamp: new Date().toISOString() });
}

// Intermediate function that doesn't directly call f.start
async function dummyParent(parentName: string): Promise<void> {
  // This function calls exampleLog which calls f.start
  await exampleLog(`Dummy parent called by ${parentName}`, { parent: parentName });
}

// Subprocess for handling parallel calls for parent A
async function subProcessAParallel(parentId: string): Promise<void> {
  const subId = f.start("parallelSubProcessA", { description: "Parallel calls for parent A" }, parentId);
  console.log("Parent A parallel subprocess started");
  
  // Call dummyParent 3 times in parallel
  await Promise.all([
    dummyParent("parentA-call1"),
    dummyParent("parentA-call2"),
    dummyParent("parentA-call3")
  ]);
  
  f.end(subId, { completed: true });
  console.log("Parent A parallel subprocess completed");
}

// Subprocess for handling parallel calls for parent B
async function subProcessBParallel(parentId: string): Promise<void> {
  const subId = f.start("parallelSubProcessB", { description: "Parallel calls for parent B" }, parentId);
  console.log("Parent B parallel subprocess started");
  
  // Call dummyParent 3 times in parallel
  await Promise.all([
    dummyParent("parentB-call1"),
    dummyParent("parentB-call2"),
    dummyParent("parentB-call3")
  ]);
  
  f.end(subId, { completed: true });
  console.log("Parent B parallel subprocess completed");
}

// First parent process
async function parentProcessA(): Promise<string> {
  const parentAId = f.start("parentA", { description: "First parent process" });
  console.log("Parent A started");
  
  // Run the parallel subprocess
  await subProcessAParallel(parentAId || "");
  
  
  await wait(500);
  f.end(parentAId, { completed: true });
  console.log("Parent A completed");
  
  return parentAId || "parentA-default"; // Return default if undefined
}

// Second parent process
async function parentProcessB(): Promise<string> {
  const parentBId = f.start("parentB", { description: "Second parent process" });
  console.log("Parent B started");
  
  // Run the parallel subprocess
  await subProcessBParallel(parentBId || "");
  
  
  await wait(700);
  f.end(parentBId, { completed: true });
  console.log("Parent B completed");
  
  return parentBId || "parentB-default"; // Return default if undefined
}

// Run the race example to demonstrate auto-linking
async function runRaceExample(): Promise<void> {
  // Enable the Flowe SDK for this example
  f.setEnabled(true);
  f.renameFlow("parent-auto-linking-race");
  
  console.log("Starting race example...");
  console.log("Flow ID:", f.getActiveFlowId());
  
  // Start both parent processes concurrently
  const [parentAId, parentBId] = await Promise.all([
    parentProcessA(),
    parentProcessB()
  ]);
  
  console.log("\nRace completed!");
  console.log("Parent A ID:", parentAId);
  console.log("Parent B ID:", parentBId);
  console.log("\nCheck the Flowe UI to see auto-linking results");
  console.log("The logging processes from dummyParent should be auto-linked to their correct parents");
}

// Run the example
runRaceExample().catch(err => console.error("Error in race example:", err)); 