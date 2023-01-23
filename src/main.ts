import yargs, { Argv } from 'yargs';

import { filterCommits } from './git';
import { lastTagForPrefix } from './tag';
import { SemverLevel } from './types/SemverLevel';

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
        "File path inside repo to consider when analysing changes. Commits that don't touch files in this path will be ignored",
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
      description:
        'Ending point ref for analysing changes in commits. Defaults to auto, which will be HEAD',
      default: 'auto',
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

const run = async (): Promise<void> => {
  const args = yargs
    .command(
      'next',
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
    .command(
      'tag-packagejson',
      'Calculate and change packagejson version with the semver part of the tag (the “1.2.3” part, without tag prefix)',
      (y): Argv => {
        const opts = addOptions(y);
        return opts;
      },
    )
    .parseSync();

  const verbose = <boolean>args.verbose;
  let path = <string>args.path;
  let prefix = <string>args.prefix;
  let fromRef = <string>args['from-ref'];
  let toRef = <string>args['to-ref'];
  let semverLevel = <number>args['semver-level'];
  const convCommit = <boolean>args['conv-commit'];
  const repoDir = <string>args['repo-dir'];

  if (!path) {
    path = '';
  }

  // TODO detect place inside repo and use as default path/default prefix

  if (prefix === 'auto') {
    prefix = '';
  }

  if (fromRef === 'auto') {
    const lastTag = await lastTagForPrefix(repoDir, prefix);
    if (lastTag) {
      fromRef = lastTag;
    } else {
      // FIXME verify how behaves
      fromRef = '';
    }
  }

  if (toRef === 'auto') {
    toRef = '';
  }

  if (!semverLevel) {
    semverLevel = SemverLevel.PATCH;
  }

  if (verbose) {
    console.log(
      `Running with path=${path}; prefix=${prefix}; fromRef=${fromRef}; toRef=${toRef}; semverLevel=${semverLevel}; convCommits=${convCommit}; repoDir=${repoDir}`,
    );
  }
};

// start
// eslint-disable-next-line no-void
void (async (): Promise<void> => {
  await run();
})();
