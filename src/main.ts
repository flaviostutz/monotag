#!/usr/bin/env node

// eslint-disable-next-line node/shebang
import { run } from './cli';

// eslint-disable-next-line no-void
void (async (): Promise<void> => {
  const exitCode = await run(process.argv);
  process.exit(exitCode);
})();
