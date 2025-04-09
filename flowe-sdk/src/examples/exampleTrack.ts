import { f } from "../flowe/index.js";

const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function runProcess1(param: string) {
  console.log(`Process 1 started - ${param}`);
  await wait(1000);
  
  // Process2 is tracked inside Process1
  // Using the {paramName: paramValue} format
  const process2Result = await f.track(
    () => runProcess2("Param 2"), 
    [{ param: "Param 2" }]
  );
  console.log("Process 2 result:", process2Result);
  
  return { status: "completed", message: "Both processes completed", param };
}

async function runProcess2(param: string) {
  console.log(`Process 2 started - ${param}`);
  await wait(1000);
    
  return { status: "completed", message: "Second process completed", param };
}

async function errorProcess(reason: string) {
  console.log(`Error process started - ${reason}`);
  await wait(500);
  
  throw new Error(`This process failed intentionally: ${reason}`);
}

async function simpleProcessFlow() {
  console.log("Starting flow process with named parameters");
  f.setEnabled(true);
  
  // Using a variable with the {paramName: paramValue} format
  const param = "Param 1";
  const process1Result = await f.track(
    () => runProcess1(param), 
    [{ param: param }]
  );
  console.log("Process 1 result:", process1Result);
  
  // Error handling example with named parameter
  try {
    const errorReason = "Testing error handling";
    await f.track(
      () => errorProcess(errorReason), 
      [{ reason: errorReason }]
    );
  } catch (err: unknown) {
    console.log("Error caught:", err instanceof Error ? err.message : String(err));
  }
  
  // Multiple parameters in a single object
  await f.track(
    async () => {
      console.log("Function with multiple parameters");
      await wait(500);
      return "done";
    },
    [{ 
      name: "multiParam", 
      count: 123, 
      isActive: true 
    }]
  );
  
  // You can also pass unnamed parameters
  await f.track(
    async () => {
      console.log("Simple function with unnamed parameters");
      await wait(500);
      return "done";
    },
    ["first param", 123, true]
  );
}

simpleProcessFlow()
  .then(() => {
    console.log("Simple process flow completed!");
  })
  .catch(error => console.error("Process flow error:", error));