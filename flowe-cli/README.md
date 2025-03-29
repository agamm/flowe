# Flowe CLI

Command-line tool for running the Flowe server.


## Commands

```bash
# Start the Flowe server
flowe start

# Start with custom port (default: 27182)
flowe start -p 3000

# Start with custom host (default: localhost)
flowe start -H 0.0.0.0

# Show version
flowe --version
```

## Development

```bash
# Start the Next.js development server
npm run dev

# Run CLI in development mode
npm run cli:dev -- start

# Check CLI version
npm run cli:dev -- --version
```

## Testing Local Installation

```bash
# Build and install locally
npm version patch
npm run build && npm unlink -g && npm link

# Run local installation
flowe start
```

## Testing
`npm run test`

## Port Configuration

The application uses port 27182 by default. This port is defined in:
- CLI: `cli/cli.ts`
- Server: `package.json` dev script
- SDK: `flowe-sdk/src/flowe/index.ts`

If you need to change the port, update it in all these locations or open a PR for `--port` ;)