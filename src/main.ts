#!/usr/bin/env node

// eslint-disable-next-line node/shebang
import * as fs from 'fs';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
    default: false,
  })
  .option('base-dir', {
    alias: 'r',
    type: 'string',
    description: 'Monorepo base dir',
    default: '.',
  })
  .option('config', {
    alias: 'c',
    type: 'string',
    description: "Config file. Defaults to '.monolint.json'",
    default: '.monolint.json',
  })
  .option('fix', {
    alias: 'f',
    type: 'boolean',
    description: "Try to fix failed checks automatically by changing files. Defaults to 'false'",
    default: false,
  })
  .parseSync();

if (!argv.verbose) {
  // console.debug = () => {};
}

if (!fs.existsSync(argv.baseDir)) {
  console.log(`Monorepo basedir ${argv.baseDir} not found`);
  process.exit(1);
}

try {
  // show results
  if (argv.verbose) {
    const baseConfig = loadBaseConfig(argv.baseDir, argv.config);
    const modules = discoverModules(argv.baseDir, baseConfig, argv.config);
    console.log(`Found ${modules.length} modules: ${modules.map((mm) => mm.path).toString()}`);
  }
  
} catch (err) {
  const err1 = err as Error;
  if (!argv.verbose && err1.message) {
    console.log(`Error: ${err1.message}`);
  } else {
    throw err;
  }
}
