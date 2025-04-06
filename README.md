# Flowe
![NPM Last Update](https://img.shields.io/npm/last-update/flowe)

<img width="591" alt="image" src="https://github.com/user-attachments/assets/9c8c5bf0-9cfd-4364-ba9f-cab1bc8a9da3" />

Flowe is a developer tool for visualizing and debugging program flows. Track, visualize, and debug complex workflows across your application with minimal overhead.

## Features

- **Easy Instrumentation**: Lightweight SDK integrates with any JavaScript/TypeScript codebase
- **Real-time Visualization**: See your application flows in a clean UI
- **Debug with Context**: Examine process inputs and outputs to identify issues
- **Automatic Parent Detection**: Automatically connect related processes via stack trace analysis
- **Multi-Parent Support**: Processes can have multiple parent processes for complex workflows

## Installation

```bash
# Install globally
npm install -g flowe # Installs both the CLI server and SDK

# Install SDK in your project
npm install flowe
```

## Usage

1. Start the Flowe server:
```bash
flowe start
```

2. Instrument your code with the SDK:
```typescript
import { f } from 'flowe';

// Enable flow tracking (disabled by default)
f.setEnabled(true);

// Optional: Give your flow a readable name (shown on the sidebar)
f.renameFlow("my-application-flow");

// Start a flow process
f.start('process-name', { input: 'data' });

// Do work...
f.start('sub-process', {foo: 'bar'}, 'process-name'); // process-name is the parent, can be also an array if multiple parents
...
f.end('sub-process'); // you can always reference a flow with a string or the return variable from .start()

// End the flow with result
f.end('process-name', { result: 'success' });
```

3. View your flows at http://localhost:27182

## Advanced Example

Here's a more realistic example showing automatic parent detection:

```typescript
import { f } from 'flowe';

f.setEnabled(true);
f.renameFlow("weather-lookup-flow");

// Main function that will be the parent process
async function getWeatherReport(city) {
  // Start the main process
  f.start("getWeather", { city });
  
  // Call another function that starts its own process
  const forecast = await fetchWeather(city);
  
  // Process and return results
  const report = {
    city,
    forecast,
    generated: new Date().toISOString()
  };
  
  f.end("getWeather", report);
  return report;
}

async function fetchWeather(city) {
  // No parent specified, but will automatically link to getWeather
  // because fetchWeather is called from getWeatherReport's stack
  f.start("weatherAPI", { city });
  
  // Even nested function calls maintain the stack context
  logActivity(`Fetching weather for ${city}`);
  
  // In a real app, this would be an API call
  const forecast = { temperature: 72, conditions: "Sunny" };
  
  f.end("weatherAPI", forecast);
  return forecast;
}

function logActivity(message) {
  // Again, no parent specified but will be linked to weatherAPI
  // because of the stack trace context
  f.start("logging", { message });
  console.log(message);
  f.end("logging", { success: true });
}

// Run the example
getWeatherReport("New York")
  .then(report => console.log("Weather report complete:", report));
```

This example demonstrates:
- The `weatherAPI` process automatically links to `getWeather` via stack trace
- The `logging` process automatically links to `weatherAPI` via stack trace
- No explicit parent IDs are needed - the relationships are detected automatically
- Process connections are visualized with special styling to indicate automatic linking

## Documentation

- [SDK Documentation](./flowe-sdk/README.md)
- [CLI Documentation](./flowe-cli/README.md)

## Testing

```bash
# Install dependencies
npm install
npx playwright install

# Run E2E tests
npm run e2e:ui
```

<!-- Todo: merge README.md from both sub repo. -->
