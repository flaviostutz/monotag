/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable functional/no-let */
/* eslint-disable no-console */
/* eslint-disable no-undefined */
/* eslint-disable complexity */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import yargs, { Argv } from 'yargs';

import { nextTag } from './tag';
import { BasicOptions } from './types/BasicOptions';
import { NextTagOptions } from './types/NextTagOptions';
import { execCmd } from './utils/execCmd';
import { lastPathPart } from './utils/lastPathPart';
import { lastTagForPrefix } from './git';
import { saveResultsToFiles } from './utils/saveResultsToFiles';

const run = async (processArgs: string[]): Promise<number> => {
  // configure yargs
  const yargs2 = yargs(processArgs.slice(2))
    .scriptName('monotag')
    .command(
      'current',
      "Show the latest tag for the path and fail if it's not up to date",
      (y): Argv => addOptions(y, true),
    )
    .command('latest', 'Show the latest tag for the path', (y): Argv => addOptions(y, false))
    .command(
      'tag',
      'Calculate and show next tag, incrementing semver according to detected changes on path',
      (y): Argv => addOptions(y, true),
    )
    .command(
      'version',
      'Calculate and show next version, incrementing semver according to detected changes on path',
      (y): Argv => addOptions(y, true),
    )
    .command(
      'notes',
      'Calculate and show release notes according to detected commits in path',
      (y): Argv => addOptions(y, true),
    )
    .command(
      'tag-git',
      'Calculate next tag and tag it in local git repo',
      (y): Argv => addOptions(y, true),
    )
    .command(
      'tag-push',
      'Calculate next tag, git-tag and git-push it to remote',
      (y): Argv => addOptions(y, true),
    )
    .help()
    .example([
      [
        'monotag tag',
        'Will use current dir as repo and tag prefix name, try to find the latest tag in this repo with this prefix, look for changes since the last tag to HEAD and output a newer version according to conventional commit changes',
      ],
      [
        'monotag notes --from-ref=HEAD~3 --to-ref=HEAD --path services/myservice',
        'Generate release notes according to changes made in the last 3 commits for changes in dir services/myservice of the repo',
      ],
      [
        'monotag tag --path services/myservice',
        'Generate tag "myservice/1.3.0" if previous tag was "myservice/1.2.8" and one commit with comment "feat: adding something new" is found between commits from the latest tag and HEAD',
      ],
    ])
    .epilogue('For more information, check https://github.com/flaviostutz/monotag');

  const args2 = yargs2.parseSync();

  const action = <string>args2._[0];

  const args = expandDefaults(args2);

  return execAction(action, args, yargs2);
};

const execAction = async (action: string, opts: NextTagOptions, yargs2: Argv): Promise<number> => {
  if (opts.verbose) {
    console.log(`Running "${action}" with ${JSON.stringify(opts)}"`);
  }

  if (!action) {
    console.log(await yargs2.getHelp());
    return 1;
  }

  // CURRENT ACTION
  if (action === 'current') {
    const latestTag = await lastTagForPrefix(
      opts.repoDir,
      opts.tagPrefix,
      opts.tagSuffix,
      opts.verbose,
    );
    if (!latestTag) {
      console.log(`No tag found for prefix '${opts.tagPrefix}'`);
      return 1;
    }

    const ntNext = await nextTag(opts);
    if (!ntNext) throw new Error('A new tag or the latest tag should have been returned');

    if (ntNext.tagName !== latestTag) {
      console.log(
        `The latest tag is not up to date. Latest tag is '${latestTag}'. Next tag would be '${ntNext.tagName}'`,
      );
      return 5;
    }

    console.log(latestTag);
    saveResultsToFiles(ntNext, opts);

    return 0;
  }

  // LATEST ACTION
  if (action === 'latest') {
    const latestTag = await lastTagForPrefix(
      opts.repoDir,
      opts.tagPrefix,
      opts.tagSuffix,
      opts.verbose,
    );
    if (!latestTag) {
      console.log(`No tag found for prefix '${opts.tagPrefix}'`);
      return 1;
    }

    console.log(latestTag);

    return 0;
  }

  // NOTES ACTION
  if (action === 'notes') {
    // calculate and show tag
    const nt = await nextTag(opts);
    if (nt === undefined) {
      console.log('No changes detected and no previous tag found');
      return 4;
    }
    if (nt.releaseNotes) {
      console.log(nt.releaseNotes);
    } else {
      console.log('No changes detected');
    }
    saveResultsToFiles(nt, opts);
    return 0;
  }

  // VERSION ACTION
  if (action === 'version') {
    // calculate and show version
    const nt = await nextTag(opts);
    if (nt === undefined) {
      console.log('No changes detected and no previous tag found');
      return 4;
    }
    console.log(nt.version);
    saveResultsToFiles(nt, opts);
    return 0;
  }

  // TAG* ACTIONS
  if (action.startsWith('tag')) {
    // calculate and show tag
    const nt = await nextTag(opts);
    if (nt === undefined) {
      console.log('No changes detected and no previous tag found');
      return 4;
    }
    console.log(nt.tagName);

    saveResultsToFiles(nt, opts);

    if (action === 'tag') {
      return 0;
    }

    if (action === 'tag-git' || action === 'tag-push') {
      console.log(`Creating tag ${nt.tagName}`);

      if (!nt.releaseNotes) {
        throw new Error('No release notes found');
      }
      // create temp notes file to be used during git tag creation
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monotag-'));
      const tmpNotesFile = path.join(tmpDir, 'notes.txt');
      fs.writeFileSync(tmpNotesFile, nt.releaseNotes, { encoding: 'utf8' });

      // tag commit with release notes
      execCmd(opts.repoDir, `git tag ${nt.tagName} -a -F ${tmpNotesFile}`, opts.verbose);

      fs.rmSync(tmpDir, { recursive: true });
      console.log('Tag created successfully');

      if (action === 'tag-push') {
        console.log("Pushing tag to remote 'origin'");
        execCmd(opts.repoDir, `git push origin ${nt.tagName}`, opts.verbose);
        console.log('Tag pushed to origin successfully');
      }
      return 0;
    }
  }

  console.log(await yargs2.getHelp());
  return 1;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expandDefaults = (args: any): NextTagOptions => {
  const verbose = defaultValueBoolean(args.verbose, false);

  let repoDir = <string>args['repo-dir'];
  if (!repoDir) {
    repoDir = execCmd(process.cwd(), 'git rev-parse --show-toplevel', verbose);
  }
  repoDir = repoDir.trim();

  // detect current dir reference to repo
  let pathRepo = <string>args.path;
  if (pathRepo === 'auto') {
    const currentDir = process.cwd();
    if (currentDir.includes(repoDir)) {
      pathRepo = currentDir.replace(repoDir, '');
    } else {
      pathRepo = '';
    }
    if (verbose) {
      console.log(`Using path inside repo "${pathRepo}"`);
    }
  }
  if (pathRepo && pathRepo.startsWith('/')) {
    pathRepo = pathRepo.slice(1);
  }
  const basicOpts: BasicOptions = {
    repoDir,
    path: pathRepo,
    fromRef: <string>args['from-ref'],
    toRef: <string>args['to-ref'],
    onlyConvCommit: defaultValueBoolean(args['conv-commit'], true),
    verbose,
  };

  let tagPrefix = args.prefix;

  // default tag prefix is relative to path inside repo
  if (tagPrefix === 'auto') {
    tagPrefix = lastPathPart(basicOpts.path);
    if (tagPrefix.length > 0) {
      tagPrefix += args.separator;
    }
  }

  return {
    ...basicOpts,
    tagPrefix,
    tagSuffix: args.suffix,
    semverLevel: <number>args['semver-level'],
    preRelease: defaultValueBoolean(args.prerelease, false),
    preReleaseIdentifier: defaultValueString(args['pre-identifier'], undefined),
    versionFile: defaultValueString(args['version-file'], undefined),
    notesFile: defaultValueString(args['notes-file'], undefined),
    tagFile: defaultValueString(args['tag-file'], undefined),
    changelogFile: defaultValueString(args['changelog-file'], undefined),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addOptions = (y: Argv, saveToFile?: boolean): any => {
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
      default: '',
    })
    .option('semver-level', {
      alias: 'l',
      type: 'number',
      describe:
        'Increase tag in specific semver level (1,2,3). If not defined, detect automatically based on semantic commit',
      default: undefined,
    })
    .option('prefix', {
      alias: 'p',
      type: 'string',
      describe:
        'Tag prefix to look for latest versions and to use on generated tags. If not defined will be derived from last path part',
      default: 'auto',
    })
    .option('separator', {
      alias: 'j',
      type: 'string',
      describe:
        'When prefix is "auto", append this separator to last working dir path to define the tag prefix to use. e.g.: dir "services/myservice" with separator "/v" leads to tag prefix "myservice/v"',
      default: '/',
    })
    .option('suffix', {
      alias: 's',
      type: 'string',
      describe: 'Tag suffix to be added to generated tags',
      default: '',
    })
    .option('prerelease', {
      alias: 'pre',
      type: 'boolean',
      describe: 'Create tags as pre-release versions. E.g.: 2.1.0-beta.0',
      default: false,
    })
    .option('pre-identifier', {
      alias: 'pid',
      type: 'string',
      describe: 'Pre-release identifier. E.g.: beta',
      default: 'beta',
    });

  if (saveToFile) {
    y1.option('tag-file', {
      alias: 'ft',
      type: 'string',
      describe: 'File to save the release tag',
      default: undefined,
    });
    y1.option('version-file', {
      alias: 'fv',
      type: 'string',
      describe: 'File to save version',
      default: undefined,
    });
    y1.option('notes-file', {
      alias: 'fn',
      type: 'string',
      describe: 'File to save the notes with a changelog',
      default: undefined,
    });
    y1.option('changelog-file', {
      alias: 'fc',
      type: 'string',
      describe:
        'Changelog file that will be appended with new version/release notes. Disabled for prerelease versions',
      default: undefined,
    });
  }

  return y1;
};

const defaultValueBoolean = (value: unknown | undefined, defValue: boolean): boolean => {
  // eslint-disable-next-line no-negated-condition
  return value !== undefined ? `${value}` === 'true' : defValue;
};

const defaultValueString = (
  value: unknown | undefined,
  defValue: string | undefined,
): string | undefined => {
  // eslint-disable-next-line no-negated-condition
  return value !== undefined ? `${value}` : defValue;
};

export { run };
