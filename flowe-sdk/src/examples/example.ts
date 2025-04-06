import { f } from "../flowe/index.js";

// This is a mock example file to show how to use Flowe in a real code example
// See README.md on how to run this in development

// Helper function to wait for x ms
const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function that uses Flowe to track logging operations
async function exampleLog(message: string, data: any): Promise<void> {
  const logId = f.start("logging", { message, data });
  console.log(`[LOG] ${message}:`, data);
  await wait(500); // Simulate some processing time
  f.end(logId, { success: true, timestamp: new Date().toISOString() });
}

async function aiAgentWithTools() {
  // By default the sdk doesn't send info (for production)
  f.setEnabled(true);
  
  // Let's create a more readable flow id rather than the random string by default
  f.renameFlow("paris-weather-activity-flow");
  console.log("Set flow ID:", f.getActiveFlowId());
  
  // Start the AI agent (initial process) - will use the flow ID we set above
  const query = "What's an activity to do in Paris for the weather?";
  const agentId = f.start("aiAgent", { query });
  
  // Extract city name from query (first branch)
  const cityExtractorId = f.start("cityExtractor", { query }, agentId);
  
  // Simulate asynchronous processing
  await wait(1500);
  
  const cityResult = { city: "Paris" };
  f.end(cityExtractorId, cityResult);
  console.log("City extractor finished");
  
  // Run geocoding tool as a separate branch from city extractor
  const geoToolId = f.start("geocodingTool", { location: cityResult.city }, agentId);
  
  // Call logging function for geocoding
  await exampleLog("Geocoding started", { location: cityResult.city });
  
  // Simulate longer processing time for geocoding
  await wait(3000);
  
  const geoResult = { latitude: 48.8566, longitude: 2.3522 };
  f.end(geoToolId, geoResult);
  console.log("Geocoding tool finished");

  // Run weather tool using the coordinates
  const weatherToolId = f.start("weatherTool", { 
    coordinates: { lat: geoResult.latitude, lng: geoResult.longitude } 
  }, geoToolId);
  
  // Call logging function for weather
  await exampleLog("Weather check started", { 
    coordinates: { lat: geoResult.latitude, lng: geoResult.longitude } 
  });
  
  // Simulate API delay for weather data
  await wait(2000);
  
  const weatherResult = { temperature: 22, unit: "Celsius" };
  f.end(weatherToolId, weatherResult);
  console.log("Weather tool finished");

  // Activity recommender with MULTIPLE PARENTS (cityExtractor and weatherTool)
  // This demonstrates multi-parent structure - it depends on both city name and weather
  const activityRecommenderId = f.start("activityRecommender", { 
    city: cityResult.city, 
    temperature: weatherResult.temperature 
  }, [cityExtractorId ?? '', weatherToolId ?? '']);
  
  // Longer delay for the AI to simulate real world wait
  await wait(4000);
  
  const activityResult = { 
    recommendation: "Visit the Eiffel Tower and enjoy a picnic in Champ de Mars" 
  };
  f.end(activityRecommenderId, activityResult);
  
  // Final result combining all information
  await wait(1000);
  
  return f.end(agentId, {
    city: cityResult.city,
    temperature: weatherResult.temperature,
    unit: weatherResult.unit,
    activity: activityResult.recommendation
  });
}

aiAgentWithTools()
  .then(result => {
    console.log("AI agent flow completed!");
    console.log("\nResult:", result);
  })
  .catch(error => console.error("AI agent error:", error));