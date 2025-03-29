# Flowe SDK

## Usage

```typescript
import { f } from 'flowe-sdk';

// Start a flow
const flowId = f.start('process-name', { input: 'data' });

// Do some work...

// End the flow
f.end(flowId, { result: 'success' });
```


## Exmaple dev usage
1. Start the flowe server either by installing globaly or in `flowe-cli` run `npm run dev`
2. Run the example `npm run build && npm run example`
3. Visit http://localhost:27182 to view your flow runs.
