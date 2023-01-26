// start

import { run } from './cli';

// eslint-disable-next-line no-void
void (async (): Promise<void> => {
  const exitCode = await run(process.argv);
  process.exit(exitCode);
})();
