import yargs, { Argv } from 'yargs';

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
      (y): Argv =>
        addOptions(y, false).option('show-notes', {
          alias: 'k',
          type: 'string',
          describe: 'Show release notes along with the newer version',
          default: true,
        }),
    )
    .command(
      'notes',
      'Calculate and show release notes according to detected commits in path',
      (y): Argv => addOptions(y, true),
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

  return execAction(action, expandDefaults(args2), <boolean>args2['show-notes'], yargs2);
};

const execAction = async (
  action: string,
  opts: NextTagOptions,
  showNotes: boolean,
  yargs2: Argv,
): Promise<number> => {
  if (opts.verbose) {
    console.log(`Running "${action}" with ${JSON.stringify(opts)}"`);
  }

  if (action === 'tag') {
    const nt = await nextTag(opts);
    if (nt == null) {
      console.log('No changes detected and no previous tag found');
      return 4;
    }
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
    if (nt == null) {
      console.log('Skipping tag creation. No changes detected and no previous tag found');
      return 2;
    }
    console.log(`Creating tag ${nt.tagName}`);

    // transform notes into a single line
    let notes = '';
    if (nt.releaseNotes) {
      notes = nt.releaseNotes.split('\n').reduce((prev: string, cur: string): string => {
        if (cur.trim().length === 0) return prev;
        return `${prev} -m "${cur}"`;
      }, '');
    }

    execCmd(opts.repoDir, `git tag ${nt.tagName} ${notes}`, opts.verbose);
    console.log('Tag created successfully');
    return 0;
  }

  if (action === 'tag-push') {
    return tagPush(opts);
  }

  console.log(await yargs2.getHelp());
  return 1;
};

const tagPush = async (opts: NextTagOptions): Promise<number> => {
  if (opts.verbose) console.log('Calculating next tag');
  const nt = await nextTag(opts);
  if (nt && nt.changesDetected > 0) {
    console.log(`Creating tag ${nt.tagName}`);
    execCmd(opts.repoDir, `git tag ${nt.tagName} -m "${nt.releaseNotes}"`, opts.verbose);
    console.log('Pushing tag to remote origin');
    execCmd(opts.repoDir, `git push origin ${nt.tagName}`, opts.verbose);
    console.log('Tag created and pushed to origin successfully');
    return 0;
  }
  if (nt == null) {
    console.log('No changes detected and no previous tag found');
    return 4;
  }
  console.log(`Skipping tag creation. No changes detected. Latest tag=${nt.tagName}`);
  return 2;
};

const expandDefaults = (args: any): NextTagOptions => {
  const verbose = <boolean>args.verbose;
  // detect current dir reference to repo
  let path = <string>args.path;
  if (path === 'auto') {
    const gitRootDir = execCmd(process.cwd(), 'git rev-parse --show-toplevel', verbose);
    const currentDir = execCmd(process.cwd(), 'pwd', verbose);
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
      tagSuffix: args.suffix,
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
    })
      .option('prefix', {
        alias: 'p',
        type: 'string',
        describe:
          'Tag prefix to look for latest versions and to use on generated tags. If not defined will be derived from last path part',
        default: 'auto',
      })
      .option('suffix', {
        alias: 's',
        type: 'string',
        describe: 'Tag suffix to be added to generated tags',
        default: '',
      });
  }

  return y1;
};

export { run };
