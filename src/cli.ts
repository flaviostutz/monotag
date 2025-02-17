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
import { execCmd } from './utils/os';
import { gitConfigUser, lastTagForPrefix } from './git';
import { saveResultsToFiles } from './files';
import { BasicOptions, CliNextTagOptions } from './types/options';

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

const execAction = async (
  action: string,
  opts: CliNextTagOptions,
  yargs2: Argv,
): Promise<number> => {
  if (opts.verbose) {
    console.log(`Running "${action}" with ${JSON.stringify(opts)}"`);
  }

  if (!action) {
    console.log(await yargs2.getHelp());
    return 1;
  }

  // CURRENT ACTION
  if (action === 'current') {
    const latestTag = await lastTagForPrefix({
      repoDir: opts.repoDir,
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      verbose: opts.verbose,
    });
    if (!latestTag) {
      console.log(`No tag found for prefix '${opts.tagPrefix}'`);
      return 1;
    }
    if (opts.verbose) {
      console.log(`Latest tag is ${latestTag}`);
    }

    const ntNext = await nextTag({ ...opts, preRelease: false });
    if (!ntNext) throw new Error('A new tag or the latest tag should have been returned');
    if (opts.verbose) {
      console.log(`Next tag would be ${ntNext.tagName}`);
    }

    const ntNextPre = await nextTag({
      ...opts,
      preRelease: true,
      // avoid increasing pre-release version if no changes are detected
      // so we can compare the latest tag with the next tag
      preReleaseAlwaysIncrement: false,
    });
    if (!ntNextPre) throw new Error('A new tag or the latest tag (pre) should have been returned');
    if (opts.verbose) {
      console.log(`Next tag (pre) would be ${ntNextPre.tagName}`);
    }

    // either the next tag for pre-release or the next tag for final should match the latest tag
    if (ntNext.tagName !== latestTag && ntNextPre.tagName !== latestTag) {
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
    const latestTag = await lastTagForPrefix({
      repoDir: opts.repoDir,
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      verbose: opts.verbose,
    });
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
    console.log(nt.releaseNotes);
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

    // display tag, version and notes
    console.log(nt.tagName);
    console.log(nt.version);
    console.log(nt.releaseNotes);

    saveResultsToFiles(nt, opts);

    if (action === 'tag') {
      return 0;
    }

    if (action === 'tag-git' || action === 'tag-push') {
      if (nt.existingTag) {
        console.log('Tag already exists in repo');
        return 0;
      }

      if (opts.verbose) {
        console.log(`Adding and commiting all files changed in repo during release`);
      }
      execCmd(opts.repoDir, `git add .`, opts.verbose);
      // eslint-disable-next-line functional/no-try-statements
      try {
        gitConfigUser(opts.repoDir, opts.gitUsername, opts.gitEmail, opts.verbose);
        execCmd(opts.repoDir, `git commit -m "chore(release): ${nt.tagName}"`, opts.verbose);
      } catch {
        console.log('No changes to commit');
      }

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

      if (action === 'tag-push' && !nt.existingTag) {
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
const expandDefaults = (args: any): CliNextTagOptions => {
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

  const semverLevel = defaultValueString(args['semver-level'], 'auto') as
    | 'major'
    | 'minor'
    | 'patch'
    | 'auto';
  if (!semverLevel || !['major', 'minor', 'patch', 'auto'].includes(semverLevel)) {
    throw new Error(
      `Invalid semver level "${semverLevel}". Must be "major", "minor", "patch" or "auto"`,
    );
  }

  // default tag prefix is relative to path inside repo
  if (tagPrefix === 'auto') {
    tagPrefix = lastPathPart(basicOpts.path);
    if (tagPrefix.length > 0) {
      tagPrefix += args.separator;
    }
  }

  const bumpAction = defaultValueString(args['bump-action'], 'none') as 'latest' | 'zero' | 'none';
  if (!bumpAction || !['latest', 'zero', 'none'].includes(bumpAction)) {
    throw new Error(`Invalid bump action "${bumpAction}". Must be "latest", "zero" or "none"`);
  }

  // add full path to bump files
  const bumpFiles = defaultValueListString(args['bump-files'], ['package.json'])?.map((file) =>
    path.join(repoDir, file),
  );

  return {
    ...basicOpts,
    tagPrefix,
    tagSuffix: args.suffix,
    semverLevel,
    bumpAction,
    bumpFiles,
    preRelease: defaultValueBoolean(args.prerelease, false),
    preReleaseIdentifier: defaultValueString(args['prerelease-identifier'], undefined),
    preReleaseAlwaysIncrement: defaultValueBoolean(args['prerelease-increment'], false),
    versionFile: defaultValueString(args['version-file'], undefined),
    notesFile: defaultValueString(args['notes-file'], undefined),
    tagFile: defaultValueString(args['tag-file'], undefined),
    changelogFile: defaultValueString(args['changelog-file'], undefined),
    minVersion: defaultValueString(args['min-version'], undefined),
    maxVersion: defaultValueString(args['max-version'], undefined),
    gitUsername: defaultValueString(args['git-username'], undefined),
    gitEmail: defaultValueString(args['git-email'], undefined),
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
      type: 'string',
      describe:
        'Level to increment tag. One of "major", "minor", "patch" or "auto". "auto" will increment according to semantic commit messages',
      default: 'auto',
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
    .option('prerelease-identifier', {
      alias: 'pid',
      type: 'string',
      describe: 'Pre-release identifier. E.g.: beta',
      default: 'beta',
    })
    .option('prerelease-increment', {
      alias: 'pai',
      type: 'boolean',
      describe: 'Increment pre-release number even if no changes are detected',
      default: false,
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
    y1.option('min-version', {
      alias: 'lv',
      type: 'string',
      describe:
        'Minimum version to be considered when calculating next version. If calculated version is lower, this value will be used instead',
      default: undefined,
    });
    y1.option('max-version', {
      alias: 'uv',
      type: 'string',
      describe:
        'Maximum version to be considered when calculating next version. If calculated version is higher, the process will fail',
      default: undefined,
    });
    y1.option('bump-action', {
      alias: 'ba',
      type: 'string',
      describe:
        'Bump action. Can be "latest" (bump to latest tag), "zero" (set version to 0.0.0) or "none',
      default: 'none',
    });
    y1.option('bump-files', {
      alias: 'bf',
      type: 'string',
      describe: 'Comma separated list of file names to bump version',
      default: 'package.json',
    });
    y1.option('git-username', {
      alias: 'gu',
      type: 'string',
      describe: 'Git username config when commiting and tagging resources',
      default: undefined,
    });
    y1.option('git-email', {
      alias: 'ge',
      type: 'string',
      describe: 'Git email config when commiting and tagging resources',
      default: undefined,
    });
  }

  // example call with all the options possible
  // monotag tag --path services/myservice --from-ref=HEAD~3 --to-ref=HEAD --prefix=myservice/ --suffix=+win64 --semver-level=patch --prerelease --prerelease-identifier=beta --prerelease-increment --verbose --tag-file=tag.txt --version-file=version.txt --notes-file=notes.txt --changelog-file=CHANGELOG.md --min-version=1.0.0 --max-version=2.0.0 --bump-action=latest --bump-files=package.json --git-username=flaviostutz --git-email=flaviostutz@gmail.com

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

const defaultValueListString = (
  value: unknown | undefined,
  defValue: string[] | undefined,
): string[] | undefined => {
  // eslint-disable-next-line no-negated-condition
  return value !== undefined ? `${value}`.split(',').map((str) => str.trim()) : defValue;
};

const lastPathPart = (fullpath: string): string => {
  const pathParts = fullpath.split('/');
  const part = pathParts.at(-1);
  if (!part) {
    return fullpath;
  }
  return part;
};

export { run };
