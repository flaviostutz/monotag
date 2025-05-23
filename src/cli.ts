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
import { gitConfigUser, isCleanWorkingTree, lastTagForPrefix, listVersionsForPrefix } from './git';
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
      'tag-git',
      'Calculate next tag and tag it in local git repo',
      (y): Argv => addOptions(y, true),
    )
    .command(
      'tag-push',
      'Calculate next tag, git-tag and git-push it to remote',
      (y): Argv => addOptions(y, true),
    )
    .command('list', 'List all tags in the monorepo', (y): Argv => addOptions(y, false))
    .help()
    .example([
      [
        'monotag tag',
        'Will use current dir as repo and tag prefix name, try to find the latest tag in this repo with this prefix, look for changes since the last tag to HEAD and output a newer version according to conventional commit changes',
      ],
      [
        'monotag tag --from-ref=HEAD~3 --to-ref=HEAD --path services/myservice',
        'Generate release notes according to changes made in the last 3 commits for changes in dir services/myservice of the repo',
      ],
      [
        'monotag tag --path services/myservice',
        'Generate tag "myservice/1.3.0" if previous tag was "myservice/1.2.8" and one commit with comment "feat: adding something new" is found between commits from the latest tag and HEAD',
      ],
    ])
    .epilogue('For more information, check https://github.com/flaviostutz/monotag');

  const args = yargs2.parseSync();

  const action = <string>args._[0];

  const expandedArgs = expandOpts(args);

  if (args.verbose) {
    console.log(`>> Current dir: ${process.cwd()}`);
    console.log(`>> args (input): ${JSON.stringify(args)}`);
  }

  return execAction(action, expandedArgs, yargs2);
};

const execAction = async (
  action: string,
  opts: CliNextTagOptions,
  yargs2: Argv,
): Promise<number> => {
  if (opts.verbose) {
    console.log(`>> Running "${action}" with ${JSON.stringify(opts)}"`);
  }

  if (!action) {
    console.log(await yargs2.getHelp());
    return 1;
  }

  // CURRENT ACTION
  if (action === 'current') {
    const latestTag = lastTagForPrefix({
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

    // check if there are uncommited changes in the working tree
    const cleanWorkingTree = isCleanWorkingTree(opts.repoDir, opts.verbose);
    if (!cleanWorkingTree) {
      console.log(
        'There are uncommited changes in the working tree, so the latest tag is not up to date',
      );
      return 6;
    }

    const ntNext = nextTag({ ...opts, preRelease: false });
    if (!ntNext) throw new Error('A new tag or the latest tag should have been returned');
    if (opts.verbose) {
      console.log(`Next tag would be ${ntNext.tagName}`);
    }

    const ntNextPre = nextTag({
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
        `The latest tag is not up to date. Latest tag is '${latestTag}', but next tag would be '${ntNext.tagName}' or '${ntNextPre.tagName}' (prerelease)`,
      );
      return 5;
    }

    console.log(latestTag);

    // latest tag is not a pre-release
    if (ntNext.tagName === latestTag) {
      saveResultsToFiles(ntNext, opts);
      return 0;
    }

    // latest tag is a pre-release
    saveResultsToFiles(ntNextPre, opts);
    return 0;
  }

  // LATEST ACTION
  if (action === 'latest') {
    const latestTag = lastTagForPrefix({
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

  // TAG* ACTIONS
  if (action.startsWith('tag')) {
    // calculate and show tag
    const nt = nextTag(opts);
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
      execCmd(opts.repoDir, `git add $(git rev-parse --show-toplevel)`, opts.verbose);
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
        console.log("Pushing changes to remote 'origin'");
        execCmd(opts.repoDir, `git push origin`, opts.verbose);
        console.log("Pushing tag to remote 'origin'");
        execCmd(opts.repoDir, `git push origin ${nt.tagName}`, opts.verbose);
        console.log('Tag pushed to origin successfully');
      }
      return 0;
    }
  }

  // LIST ACTION
  if (action === 'list') {
    const tags = listVersionsForPrefix(opts.repoDir, opts.tagPrefix, opts.verbose);
    if (tags.length === 0) {
      console.log('No tags found in repository');
      return 1;
    }
    tags.map((tag: string) => console.log(tag));
    return 0;
  }

  console.log(await yargs2.getHelp());
  return 1;
};

// LIST ACTION
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expandOpts = (opts: any): CliNextTagOptions => {
  const verbose = defaultValueBoolean(opts.verbose, false);

  // find the root path of the repo
  let repoDir = <string>opts['repo-dir'];
  if (!repoDir) {
    repoDir = process.cwd();
  }
  const absRepoDir = execCmd(repoDir, 'git rev-parse --show-toplevel', verbose).trim();

  // detect current dir reference to repo
  const pathRepoList = defaultValueListString(<string>opts.path, ['auto']);
  if (!pathRepoList) throw new Error('path must be defined');

  const pathsRepo = expandPathWithDefaults(pathRepoList, absRepoDir, process.cwd());
  if (verbose) {
    console.log(`Repo dir is "${absRepoDir}"`);
    console.log(`Analysing changes in "${pathsRepo.join(',')}"`);
  }

  const basicOpts: BasicOptions = {
    repoDir: absRepoDir,
    paths: pathsRepo,
    fromRef: <string>opts['from-ref'],
    toRef: <string>opts['to-ref'],
    onlyConvCommit: defaultValueBoolean(opts['conv-commit'], true),
    verbose,
  };

  let tagPrefix = opts.prefix;

  const semverLevel = defaultValueString(opts['semver-level'], 'auto') as
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
    // use first path as tag prefix
    tagPrefix = lastPathPart(basicOpts.paths.length > 0 ? basicOpts.paths[0] : '');
    if (tagPrefix.length > 0) {
      tagPrefix += opts.separator;
    }
  }

  const bumpAction = defaultValueString(opts['bump-action'], 'none') as 'latest' | 'zero' | 'none';
  if (!bumpAction || !['latest', 'zero', 'none'].includes(bumpAction)) {
    throw new Error(`Invalid bump action "${bumpAction}". Must be "latest", "zero" or "none"`);
  }

  // add full path to bump files
  const bumpFiles = defaultValueListString(opts['bump-files'], ['package.json'])?.map((file) =>
    path.join(repoDir, file),
  );

  return {
    ...basicOpts,
    tagPrefix,
    tagSuffix: opts.suffix,
    semverLevel,
    bumpAction,
    bumpFiles,
    preRelease: defaultValueBoolean(opts.prerelease, false),
    preReleaseIdentifier: defaultValueString(opts['prerelease-identifier'], undefined),
    preReleaseAlwaysIncrement: defaultValueBoolean(opts['prerelease-increment'], false),
    versionFile: defaultValueString(opts['version-file'], undefined),
    notesFile: defaultValueString(opts['notes-file'], undefined),
    tagFile: defaultValueString(opts['tag-file'], undefined),
    changelogFile: defaultValueString(opts['changelog-file'], undefined),
    minVersion: defaultValueString(opts['min-version'], undefined),
    maxVersion: defaultValueString(opts['max-version'], undefined),
    gitUsername: defaultValueString(opts['git-username'], undefined),
    gitEmail: defaultValueString(opts['git-email'], undefined),
    notesDisableLinks: defaultValueBoolean(opts['no-links'], false),
    notesBaseCommitUrl: defaultValueString(opts['url-commit'], undefined),
    notesBasePRUrl: defaultValueString(opts['url-pr'], undefined),
    notesBaseIssueUrl: defaultValueString(opts['url-issue'], undefined),
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
        "File path inside repo to consider when analysing changes. Can be a list separated by ','. Commits that don't touch files in this path will be ignored. Defaults to current dir. Supports glob patterns. E.g.: services/service1,shared/**,package-lock.json",
      default: '.',
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
        'Tag prefix to look for latest versions and to use on generated tags. If not defined will be derived from last path part (of the first path defined)',
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
      describe: 'Changelog file that will be appended with new version/release notes',
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
    y1.option('no-links', {
      alias: 'nl',
      type: 'boolean',
      describe: `Disable rendering links in release notes for issues, prs and commits`,
      default: false,
    });
    y1.option('url-commit', {
      alias: 'uc',
      type: 'string',
      describe: `Base commit URL used to generate links to commits in release notes. Defaults to git origin when possible. E.g.: http://mygit.com/myrepo/commit/`,
      default: undefined,
    });
    y1.option('url-pr', {
      alias: 'up',
      type: 'string',
      describe: `Base pr URL used to generate links to pr in release notes. Defaults to git origin when possible. E.g.: http://mygit.com/myrepo/prs/`,
      default: undefined,
    });
    y1.option('url-issue', {
      alias: 'ui',
      type: 'string',
      describe: `Base issue URL used to generate links to issues in release notes. Defaults to git origin when possible. E.g.: http://mygit.com/myrepo/issues/`,
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

export const expandPathWithDefaults = (
  paths: string[],
  absRepoDir: string,
  currentDir: string,
): string[] => {
  const dpaths = paths.map((p: string) => {
    let pathRepo = p;

    // automatically detect path inside repo dir according to current dir
    if (!pathRepo || pathRepo === '.' || pathRepo === './') {
      if (currentDir.includes(absRepoDir)) {
        pathRepo = currentDir.replace(absRepoDir, '');
      } else {
        // defaults to repo root
        pathRepo = '';
      }

      // support relative paths to current dir
    } else if (pathRepo.startsWith('..')) {
      const absPathRepo = path.resolve(currentDir, pathRepo);
      if (absPathRepo.includes(absRepoDir)) {
        pathRepo = absPathRepo.replace(absRepoDir, '');
      } else {
        throw new Error(`Path "${pathRepo}" is not inside repo dir "${absRepoDir}"`);
      }
    }

    // path is relative to repo dir
    // support paths starting with /
    if (pathRepo.startsWith('/')) {
      pathRepo = pathRepo.slice(1);
    }
    return pathRepo;
  });
  return dpaths;
};

export { run };
