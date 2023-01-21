import yargs, { Argv } from 'yargs';

// import yargs from 'yargs/yargs';
// import { hideBin } from 'yargs/helpers';

const addOptions = (y: any): Argv => {
  const rargs = y.option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
    default: false,
  });
  return rargs;
};

const args = yargs
  .command('first', 'description', (y): Argv => {
    const opts = addOptions(y);
    return opts;
  })
  .command('second', 'description2', (y): Argv => {
    const opts = addOptions(y);
    return opts;
  })
  .parseSync();

console.log(`>>> ${JSON.stringify(args)}`);
console.log(args._);
console.log(args.verbose);
