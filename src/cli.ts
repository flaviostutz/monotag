import yargs, { argv, Argv } from 'yargs';

import { releaseNotes } from './notes';
import { nextTag } from './tag';
import { BasicOptions } from './types/BasicOptions';
import { NextTagOptions } from './types/NextTagOptions';
import { execCmd } from './utils/execCmd';
import { lastPathPart } from './utils/lastPathPart';

const run = async (processArgs: string[]): Promise<number> => {
  // configure yargs
  const yargs2 = yargs(processArgs.slice(2))
    .scriptName('monotag')
    .command(
      'tag',
      'Calculate and show next tag, incrementing semver according to detected changes on path',
      (y): Argv => addOptions(y, false),
    )
    .command(
      'notes',
      'Calculate and show release notes according to detected commits in path',
      (y): Argv =>
        addOptions(y, true).option('show-notes', {
          alias: 'k',
          type: 'string',
          describe: 'Show release notes along with the newer version',
          default: true,
        }),
    )
    .command(
      'tag-git',
      'Calculate next tag and tag it in local git repo',
      (y): Argv => addOptions(y, false),
    )
    .command(
      'tag-push',
      'Calculate next tag, git-tag and git-push it to remote',
      (y): Argv => addOptions(y, false),
    )
    .help();

  const args2 = yargs2.parseSync();

  const action = <string>args2._[0];

  return execAction(action, expandDefaults(args2), <boolean>args2['show-notes'], yargs2);
};

const execAction = async (
  action: string,
  opts: NextTagOptions,
  showNotes: boolean,
  yargs2: Argv,
): Promise<number> => {
  try {
    if (opts.verbose) {
      console.log(`Running "${action}" with ${JSON.stringify(opts)}"`);
    }

    if (action === 'tag') {
      const nt = await nextTag(opts);
      console.log(nt.tagName);
      if (showNotes && nt.releaseNotes) {
        console.log('===============');
        console.log(nt.releaseNotes);
      }
      return 0;
    }

    if (action === 'notes') {
      const nt = await releaseNotes(opts);
      console.log(nt);
      return 0;
    }

    if (action === 'tag-git') {
      if (opts.verbose) console.log('Calculating next tag');
      const nt = await nextTag(opts);
      if (nt.changesDetected > 0) {
        console.log(`Creating tag ${nt.tagName}`);
        execCmd(opts.repoDir, `git tag ${nt.tagName} -m "${nt.releaseNotes}"`, opts.verbose);
        console.log('Tag created successfully');
        return 0;
      }
      console.log(`Skipping tag creation. No changes detected. Latest tag=${nt.tagName}`);
      return 2;
    }

    if (action === 'tag-push') {
      if (opts.verbose) console.log('Calculating next tag');
      const nt = await nextTag(opts);
      if (nt.changesDetected > 0) {
        console.log(`Creating tag ${nt.tagName}`);
        execCmd(opts.repoDir, `git tag ${nt.tagName} -m "${nt.releaseNotes}"`, opts.verbose);
        console.log('Pushing tag to remote origin');
        execCmd(opts.repoDir, `git push origin ${nt.tagName}`, opts.verbose);
        console.log('Tag created and pushed to origin successfully');
        return 0;
      }
      console.log(`Skipping tag creation. No changes detected. Latest tag=${nt.tagName}`);
      return 2;
    }

    yargs2.showHelp();
    return 1;
  } catch (err) {
    console.log(err);
    return 3;
  }
};

const expandDefaults = (args: any): NextTagOptions => {
  const verbose = <boolean>args.verbose;
  // detect current dir reference to repo
  let path = <string>args.path;
  if (path === 'auto') {
    const gitRootDir = execCmd(process.cwd(), 'git rev-parse --show-toplevel');
    const currentDir = execCmd(process.cwd(), 'pwd');
    if (currentDir.includes(gitRootDir)) {
      path = currentDir.replace(gitRootDir, '');
    } else {
      path = '';
    }
    if (verbose) {
      console.log(`Using repo path "${path}"`);
    }
  }
  const basicOpts: BasicOptions = {
    repoDir: <string>args['repo-dir'],
    path,
    fromRef: <string>args['from-ref'],
    toRef: <string>args['to-ref'],
    onlyConvCommit: <boolean>args['conv-commit'],
    verbose,
  };
  let tagPrefix = args.prefix;
  // default tag prefix is relative to path inside repo
  if (tagPrefix === 'auto') {
    tagPrefix = lastPathPart(basicOpts.path);
    if (tagPrefix.length > 0) {
      tagPrefix += '/';
    }
  }
  return <NextTagOptions>{
    ...basicOpts,
    ...{
      tagPrefix,
      semverLevel: <number>args['semver-level'],
    },
  };
};

const addOptions = (y: Argv, onlyNotes: boolean): any => {
  const y1 = y
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      describe: 'Run with verbose logging',
      default: false,
    })
    .option('path', {
      alias: 'd',
      type: 'string',
      describe:
        "File path inside repo to consider when analysing changes. Commits that don't touch files in this path will be ignored. Defaults to current dir.",
      default: 'auto',
    })
    .option('from-ref', {
      alias: 'f',
      type: 'string',
      describe:
        'Starting point ref for analysing changes in commits. Defaults to auto, which will be last version with this same tag prefix',
      default: 'auto',
    })
    .option('to-ref', {
      alias: 't',
      type: 'string',
      describe: 'Ending point ref for analysing changes in commits. Defaults to HEAD',
      default: 'HEAD',
    })
    .option('conv-commit', {
      alias: 'c',
      type: 'boolean',
      describe: 'Use only conventional commit styled commits during release notes creation',
      default: false,
    })
    .option('repo-dir', {
      alias: 'g',
      type: 'string',
      describe: 'Git repo dir to run command on. Defaults to current process dir',
      default: process.cwd(),
    });

  if (!onlyNotes) {
    y1.option('semver-level', {
      alias: 'l',
      type: 'number',
      describe:
        'Increase tag in specific semver level (1,2,3). If not defined, detect automatically based on semantic commit',
      default: 0,
    }).option('prefix', {
      alias: 'p',
      type: 'string',
      describe:
        'Tag prefix added to generated tags. If not defined will be derived from last path part',
      default: 'auto',
    });
  }

  return y1;
};

export { run };
