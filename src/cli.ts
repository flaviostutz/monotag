import yargs, { Argv } from 'yargs';

import { releaseNotes } from './notes';
import { nextTag } from './tag';
import { BasicOptions } from './types/BasicOptions';
import { NextTagOptions } from './types/NextTagOptions';
import { execCmd } from './utils/execCmd';
import { lastPathPart } from './utils/lastPathPart';

const addOptions = (y: any): Argv => {
  const rargs = y
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging',
      default: false,
    })
    .option('path', {
      alias: 'd',
      type: 'string',
      description:
        "File path inside repo to consider when analysing changes. Commits that don't touch files in this path will be ignored. Defaults to current dir.",
      default: 'auto',
    })
    .option('prefix', {
      alias: 'p',
      type: 'string',
      description:
        'tag prefix added to generated tags. If not defined will be derived from last path part',
      default: 'auto',
    })
    .option('from-ref', {
      alias: 'f',
      type: 'string',
      description:
        'Starting point ref for analysing changes in commits. Defaults to auto, which will be last version with this same tag prefix',
      default: 'auto',
    })
    .option('to-ref', {
      alias: 't',
      type: 'string',
      description: 'Ending point ref for analysing changes in commits. Defaults to HEAD',
      default: 'HEAD',
    })
    .option('semver-level', {
      alias: 'l',
      type: 'number',
      description:
        'Increase tag in specific semver level (1,2,3). If not defined, detect automatically based on semantic commit',
      default: 0,
    })
    .option('conv-commit', {
      alias: 'c',
      type: 'boolean',
      description: 'Use only conventional commit styled commits during release notes creation',
      default: false,
    })
    .option('repo-dir', {
      alias: 'g',
      type: 'string',
      description: 'Git repo dir to run command on. Defaults to current process dir',
      default: process.cwd(),
    });
  return rargs;
};

const run = async (processArgs: string[]): Promise<number> => {
  const args = yargs
    .command(
      'tag',
      'Calculate and show next tag, incrementing semver according to detected changes on path',
      (y): Argv => {
        const opts = addOptions(y);
        return opts;
      },
    )
    .command(
      'notes',
      'Calculate and show release notes according to detected commits in path',
      (y): Argv => {
        const opts = addOptions(y);
        return opts;
      },
    )
    .command('tag-git', 'Calculate next tag and tag it in local git repo', (y): Argv => {
      const opts = addOptions(y);
      return opts;
    })
    .command('tag-push', 'Calculate next tag, git-tag and git-push it to remote', (y): Argv => {
      const opts = addOptions(y);
      return opts;
    })
    .parseSync(processArgs);

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
  };

  let tagPrefix = <string>args.prefix;
  // default tag prefix is relative to path inside repo
  if (tagPrefix === 'auto') {
    tagPrefix = lastPathPart(basicOpts.path);
    if (tagPrefix.length > 0) {
      tagPrefix += '/';
    }
  }

  const nextTagOpts: NextTagOptions = {
    ...basicOpts,
    ...{
      tagPrefix,
      semverLevel: <number>args['semver-level'],
    },
  };

  return execAction(<string>args._[0], nextTagOpts, verbose);
};

const execAction = async (
  action: string,
  nextTagOpts: NextTagOptions,
  verbose: boolean,
): Promise<number> => {
  try {
    if (verbose) {
      console.log(`Running "${action}" with ${JSON.stringify(nextTagOpts)}"`);
    }

    if (action === 'tag') {
      const nt = await nextTag(nextTagOpts, verbose);
      console.log(nt.tagName);
      if (nt.releaseNotes) {
        console.log('===============');
        console.log(nt.releaseNotes);
      }
      return 0;
    }

    if (action === 'notes') {
      const nt = await releaseNotes(nextTagOpts);
      console.log(nt);
      return 0;
    }

    if (action === 'tag-git') {
      if (verbose) console.log('Calculating next tag');
      const nt = await nextTag(nextTagOpts, verbose);
      if (nt.changesDetected > 0) {
        console.log(`Creating tag ${nt.tagName}`);
        execCmd(nextTagOpts.repoDir, `git tag ${nt.tagName} -m "${nt.releaseNotes}"`, verbose);
        console.log('Tag created successfully');
        return 0;
      }
      console.log(`Skipping tag creation. No changes detected. Latest tag=${nt.tagName}`);
      return 2;
    }

    if (action === 'tag-push') {
      if (verbose) console.log('Calculating next tag');
      const nt = await nextTag(nextTagOpts, verbose);
      if (nt.changesDetected > 0) {
        console.log(`Creating tag ${nt.tagName}`);
        execCmd(nextTagOpts.repoDir, `git tag ${nt.tagName} -m "${nt.releaseNotes}"`, verbose);
        console.log('Pushing tag to remote origin');
        execCmd(nextTagOpts.repoDir, `git push origin ${nt.tagName}`, verbose);
        console.log('Tag created and pushed to origin successfully');
        return 0;
      }
      console.log(`Skipping tag creation. No changes detected. Latest tag=${nt.tagName}`);
      return 2;
    }

    console.log(`Action "${action}" is invalid. Use --help for more hints.`);
    return 1;
  } catch (err) {
    console.log(err);
    return 3;
  }
};

export { run };
