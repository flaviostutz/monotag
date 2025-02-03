#!/usr/bin/env node
/* eslint-disable no-console */
/* eslint-disable functional/no-let */

import { run } from './cli';

// eslint-disable-next-line no-void
void (async (): Promise<void> => {
  process.on('uncaughtException', (err) => {
    const errs = `${err}`;
    let i = errs.indexOf('\n');
    if (i === -1) i = errs.length;
    console.log(errs.slice(0, Math.max(0, i)));
    process.exit(3);
  });
  const exitCode = await run(process.argv);
  process.exit(exitCode);
})();
