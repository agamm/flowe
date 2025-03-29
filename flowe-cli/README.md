### Flowe CLI

1. Start server: `flowe start`


### Development

Next start (skip cli start): `npm run dev`
Run like so: `npm run cli:dev -- --version`

#### Local install (dev)
`npm version patch`
`npm run build && npm unlink -g && npm link && flowe start`

### Port Configuration

The application uses port 27182 by default. This port is hardcoded in:
- Server: `cli/cli.ts` and `package.json` dev script
- SDK: `src/flowe/index.ts`

If you need to change the port, you'll need to update it in these locations.