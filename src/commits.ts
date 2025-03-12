/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable functional/immutable-data */
import conventionalCommitsParser from 'conventional-commits-parser';

import { Commit, CommitsSummary, SemverLevelNone } from './types/commits';

export const getDateFromCommit = (dateWithTime: string): string => {
  return /(\d{4}-\d{2}-\d{2})/.exec(dateWithTime)?.[0] ?? '';
};

type CommitDetails = {
  parsedLog: conventionalCommitsParser.Commit;
  commit: Commit;
  breakingChange: boolean;
};

/**
 * Summarize commit according to semantic versioning
 * @param {Commit[]} commits Collection of commits
 * @returns {CommitsSummary} Summary
 */
export const summarizeCommits = (commits: Commit[]): CommitsSummary => {
  const sum: CommitsSummary = {
    features: <string[]>[],
    fixes: <string[]>[],
    maintenance: <string[]>[],
    nonConventional: <string[]>[],
    notes: <string[]>[],
    level: 'none',
    authors: <string[]>[],
    references: <string[]>[],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commits
    // parse each commit
    .map((clog): CommitDetails => {
      // remove ! from type because the parser doesn't support it (but it's valid for conventional commit)
      const clogMessage = clog.message.replace('!:', ':');

      // move prefix to the end of commit log, exposing conv commit to the beginning of the log
      const clogMessageMovedPrefix = movePrefixFromCommitLog(clogMessage);

      const convLog = conventionalCommitsParser.sync(clogMessageMovedPrefix);

      // identify breaking changes (cannot be done after mapping because '!:' is not supported by the parser)
      const breakingChange =
        convLog.body?.includes('BREAKING CHANGES') ||
        convLog.notes.some((note) => note.title.includes('BREAKING CHANGES')) ||
        clog.message.includes('!:');

      if (breakingChange) {
        convLog.subject = `**Breaking:** ${convLog.subject}`;
      }

      return { parsedLog: convLog, breakingChange, commit: clog };
    })
    // order by breaking changes, scope, subject
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    .sort((ca, cb): number => {
      if (ca.breakingChange === cb.breakingChange) {
        if (ca.parsedLog.scope === cb.parsedLog.scope) {
          return (ca.parsedLog.subject ?? '').localeCompare(cb.parsedLog.subject ?? '');
        }
        return -(ca.parsedLog.scope ?? '').localeCompare(cb.parsedLog.scope ?? '');
      }
      if (ca.breakingChange) {
        return -1;
      }
      return 1;
    })
    .reduce((summary, convLog): CommitsSummary => {
      const { parsedLog, breakingChange } = convLog;

      if (!parsedLog.header) {
        return summary;
      }

      // feat
      if (parsedLog.type === 'feat') {
        pushItem(summary.features, convLog);
        if (semverGreaterThan('minor', summary.level)) {
          summary.level = 'minor';
        }

        // fix
      } else if (parsedLog.type === 'fix') {
        pushItem(summary.fixes, convLog);
        if (semverGreaterThan('patch', summary.level)) {
          summary.level = 'patch';
        }

        // chore
      } else if (parsedLog.type === 'chore') {
        pushItem(summary.maintenance, convLog);
        if (semverGreaterThan('patch', summary.level)) {
          summary.level = 'patch';
        }

        // non conventional commits
      } else {
        summary.nonConventional.push(parsedLog.header.trim());
        if (semverGreaterThan('patch', summary.level)) {
          summary.level = 'patch';
        }
      }

      // breaking changes -> major level
      if (breakingChange) {
        summary.level = 'major';
      }

      // notes
      for (const note of parsedLog.notes) {
        summary.notes.push(`${note.title}: ${note.text}`);
      }
      if (parsedLog.body) {
        summary.notes.push(parsedLog.body);
      }

      // references
      for (const reference of parsedLog.references) {
        summary.references.push(`${reference.action ?? ''} ${reference.raw ?? ''}`.trim());
      }

      return summary;
    }, sum);

  // authors
  const authors = commits
    .map((com): string => {
      return com.author;
    })
    // order authors alphabetically
    .sort((a, b): number => {
      return a.localeCompare(b);
    });

  // remove duplicate authors
  sum.authors = authors.filter((value, index, self): boolean => {
    return self.indexOf(value) === index;
  });

  return sum;
};

export const semverGreaterThan = (semverA: SemverLevelNone, semverB: SemverLevelNone): boolean => {
  if (semverA === semverB) {
    return false;
  }
  if (semverB === 'none') {
    return true;
  }
  if (semverA === 'major') {
    return true;
  }
  if (semverA === 'minor') {
    return semverB === 'patch';
  }
  return false;
};

const pushItem = (pushTo: string[], commitDetails: CommitDetails): void => {
  if (!commitDetails.parsedLog.subject) {
    return;
  }
  if (commitDetails.parsedLog.scope) {
    pushTo.push(
      `${commitDetails.parsedLog.scope}: ${commitDetails.parsedLog.subject.trim()} [${commitDetails.commit.id.slice(0, 7)}]`,
    );
    return;
  }
  pushTo.push(`${commitDetails.parsedLog.subject.trim()} [${commitDetails.commit.id.slice(0, 7)}]`);
};

/**
 * Try to identify and move prefixes to the end of the commit log so we leave the conventional
 * commit message at the beginning
 * @param commitLog
 * @returns
 */
export const movePrefixFromCommitLog = (commitLog: string): string => {
  // if log is multi-line, skip this
  if (commitLog.includes('\n')) {
    return commitLog;
  }

  const suffixRe = /([a-z]{1,10}\(*[\w-]*\)*!*:.*)/;

  // try to identify suffix that has conv commit etc
  const suffix = suffixRe.exec(commitLog);

  // this is not a conventional commit
  if (!suffix) {
    return commitLog;
  }

  // get prefix from commit log
  const prefix = commitLog.replace(suffixRe, '');
  // keep only some letters and numbers in prefix
  const prefixClean = prefix.replaceAll(/[^\s\w-#]+/g, '').trim();

  // move prefix to the end of the commit log, if exists
  return `${suffix[0]}${prefixClean ? ` (${prefixClean})` : ''}`;
};
