import conventionalCommitsParser from 'conventional-commits-parser';

import { BasicOptions } from './types/BasicOptions';
import { Commit } from './types/Commit';
import { CommitsSummary } from './types/CommitsSummary';
import { SemverLevel } from './types/SemverLevel';
import { execCmd } from './utils/execCmd';
import { tagParts } from './utils/tagParts';

/**
 * Looks for commits that touched a certain path
 * @param opts {BasicOptions} parameters for commits filtering
 * @returns {Commit[]} List of commits
 */
const filterCommits = async (opts: BasicOptions): Promise<Commit[]> => {
  if (!opts.repoDir) {
    throw new Error("'repoDir' must be defined");
  }
  if (!opts.toRef) {
    throw new Error('toRef is required');
  }

  let refs = opts.toRef;
  if (opts.fromRef) {
    refs = `${opts.fromRef}..${opts.toRef}`;
  }

  // check if command is successfull
  execCmd(opts.repoDir, `git log ${refs} --pretty=format:"%H"`, opts.verbose);

  const out = execCmd(
    opts.repoDir,
    `git log ${refs} --pretty=format:"%H" | xargs -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
    false,
  );

  const commits = out
    .trim()
    .split('COMMIT')
    .map((celem: string): Commit | null => {
      if (celem.trim().length === 0) {
        return null;
      }
      const fields = celem.trim().split(';');
      const com: Commit = {
        id: fields[1],
        author: fields[2],
        date: fields[3],
        message: fields[4],
        files: fields[5].trim().split('\n'),
      };
      return com;
    })
    .filter((cm: Commit | null): boolean => {
      if (cm === null) {
        return false;
      }
      // only keep commits that have touched any file inside "path"
      return cm.files.some((fn: string): boolean => {
        return fn.startsWith(opts.path);
      });
    });

  return <Commit[]>commits.reverse();
};

/**
 * Get last tag in repository for a certain prefix according to semantic versioning
 * Ex.: Existing tags 'myservice/1.1.2', 'myservice/1.4.2' and 'yourservice/3.4.1'
 *      If you query for tag prefix 'myservice/', it will return 'myservice/1.4.2'
 * @param {string} repoDir directory of the git repo
 * @param {string} tagPrefix tag prefix for looking for last tag and for generating the next tag
 * @returns {string} The tag with the same prefix that has the greatest semantic version
 */
const lastTagForPrefix = async (
  repoDir: string,
  tagPrefix: string,
  verbose?: boolean,
): Promise<string | null> => {
  // list tags by semver in descending order
  const tags = execCmd(
    repoDir,
    `git tag --list '${tagPrefix}*' --sort=-v:refname | head -n 30`,
    verbose,
  ).split('\n');

  for (let i = 0; i < tags.length; i += 1) {
    const tag = tags[i];
    const tparts = tagParts(tag);
    if (!tparts) {
      continue;
    }
    if (tagPrefix) {
      if (tparts[2] === tagPrefix) {
        return tag;
        // return tparts[1];
      }
    } else if (!tparts[2]) {
      return tag;
    }
  }
  // tag with prefix not found
  return null;
};

/**
 * Summarize commit according to semantic versioning
 * @param {Commit[]} commits Collection of commits
 * @returns {CommitsSummary} Summary
 */
const summarizeCommits = (commits: Commit[]): CommitsSummary => {
  const sum = <CommitsSummary>{
    features: <string[]>[],
    fixes: <string[]>[],
    maintenance: <string[]>[],
    nonConventional: <string[]>[],
    notes: <string[]>[],
    level: SemverLevel.PATCH,
    authors: <string[]>[],
    references: <string[]>[],
  };
  commits.reduce((summary, clog): any => {
    // remove ! from type because the parser doesn't support it
    // (but it's valid for conventional commit)
    const convLog = conventionalCommitsParser.sync(clog.message.replace('!', ''));
    if (!convLog.header) {
      return summary;
    }

    // feat
    if (convLog.type === 'feat') {
      pushItem(summary.features, convLog);
      if (summary.level > SemverLevel.MINOR) summary.level = SemverLevel.MINOR;

      // fix
    } else if (convLog.type === 'fix') {
      pushItem(summary.fixes, convLog);
      if (summary.level > SemverLevel.PATCH) summary.level = SemverLevel.PATCH;

      // chore
    } else if (convLog.type === 'chore') {
      pushItem(summary.maintenance, convLog);
      if (summary.level > SemverLevel.PATCH) summary.level = SemverLevel.PATCH;

      // non conventional commits
    } else {
      summary.nonConventional.push(convLog.header.trim());
    }

    // breaking changes/major level
    if (clog.message.includes('!:')) {
      if (summary.level > SemverLevel.MAJOR) summary.level = SemverLevel.MAJOR;
    } else if (convLog.notes.some((note) => note.title.includes('BREAKING CHANGE'))) {
      if (summary.level > SemverLevel.MAJOR) summary.level = SemverLevel.MAJOR;
    }

    // notes
    convLog.notes.forEach((note) => {
      summary.notes.push(`${note.title}: ${note.text}`);
    });

    // references
    convLog.references.forEach((reference) => {
      summary.references.push(`${reference.action} ${reference.raw}`);
    });

    return summary;
  }, sum);

  // authors
  commits.forEach((com) => {
    sum.authors.push(com.author);
  });

  return sum;
};

const pushItem = (pushTo: string[], convLog: conventionalCommitsParser.Commit): void => {
  if (!convLog.subject) {
    return;
  }
  if (convLog.scope) {
    pushTo.push(`${convLog.scope}: ${convLog.subject.trim()}`);
    return;
  }
  pushTo.push(`${convLog.subject.trim()}`);
};

export { filterCommits, lastTagForPrefix, summarizeCommits };
