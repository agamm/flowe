# Flowe

Flowe is a developer tool for visualizing and debugging program flows. Track, visualize, and debug complex workflows across your application with minimal overhead.

## Features

- **Easy Instrumentation**: Lightweight SDK integrates with any JavaScript/TypeScript codebase
- **Real-time Visualization**: See your application flows in a clean UI
- **Debug with Context**: Examine process inputs and outputs to identify issues

## Installation

```bash
# Install globally
npm install -g flowe # Installs both the CLI server and SDK

# Install SDK in your project
```

## Usage

1. Start the Flowe server:
```bash
flowe start
```

2. Instrument your code with the SDK:
```typescript
import { f } from 'flowe';

// Enable flow tracking
f.setEnabled(true);

// Start a flow process
const flowId = f.start('process-name', { input: 'data' });

// Do work...

// End the flow with result
f.end(flowId, { result: 'success' });
```

3. View your flows at http://localhost:27182

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