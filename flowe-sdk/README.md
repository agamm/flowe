# Flowe SDK

JavaScript/TypeScript SDK for instrumenting code and tracking process flows.


## Basic Usage

```typescript
import { f } from 'flowe';

// Enable the SDK
f.setEnabled(true);

const func = (a) => {
  console.log("Doing work on:", a)
}

// Using the track method to automatically instrument functions
const result = await f.track(
  async () => a("123"),
  [{ a: '123' }],  // Parameters (optional)
  'custom-process-name',      // Custom ID (optional)
  ['parent-process-id']       // Parent process IDs (optional)
);

// Using start/end for manual instrumentation
const flowId = f.start('process-name', { input: 'data' });

// Do some work...

// End the flow
f.end(flowId, { result: 'success' });
```

## Configuration Options

```typescript
import { Flowe } from 'flowe';

const f = new Flowe({
  ingestEndpoint: "http://localhost:27182/api/flow", // Custom endpoint URL
  suppressErrors: true,  // Prevent SDK from throwing errors
  logErrors: true,       // Log errors to console
  enabled: true,         // Enable flow processing
  maxRetries: 3          // Max retry attempts for sending data
});
```

## API Reference

### Methods

- `f.start(id, args, parents?)` - Start a process
- `f.end(id, output)` - End a process with output
- `f.track(fn, params?, id?, parents?)` - Automatically wrap a function with start/end calls
- `f.setEnabled(boolean)` - Enable/disable flow processing
- `f.setIngestEndpoint(url)` - Change the server endpoint
- `f.renameFlow(flowId)` - Rename the active flow (used in the sidebar name)

### Queue System

The SDK includes a queue system that:
- Ensures requests are sent to the server in order
- Automatically retries failed requests
- Provides configurable retry behavior
- Maintains data consistency with the server - if one process fails the whole flow fails

## Development

```bash
# Build the SDK
npm run build

# Run the example
npm run example

# Run tests
npm test

# Run with test coverage
npm run test:coverage

# Performance testing
npm run performance
```

## Server Connection

The SDK connects to a Flowe server at `http://localhost:27182` by default. Start the server with the Flowe CLI before using the SDK.