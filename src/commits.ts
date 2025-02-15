/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable functional/immutable-data */
import conventionalCommitsParser from 'conventional-commits-parser';

import { Commit, CommitsSummary } from './types/commits';
import { SemverLevel } from './types/version';

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
    level: SemverLevel.NONE,
    authors: <string[]>[],
    references: <string[]>[],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commits
    // parse each commit
    .map((clog): CommitDetails => {
      // remove ! from type because the parser doesn't support it
      // (but it's valid for conventional commit)
      const convLog = conventionalCommitsParser.sync(clog.message.replace('!:', ':'));

      // identify breaking changes (cannot be done after mapping because '!:' is not supported by the parser)
      const breakingChange =
        convLog.notes.some((note) => note.title.includes('BREAKING CHANGE')) ||
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
        if (summary.level > SemverLevel.MINOR) summary.level = SemverLevel.MINOR;

        // fix
      } else if (parsedLog.type === 'fix') {
        pushItem(summary.fixes, convLog);
        if (summary.level > SemverLevel.PATCH) summary.level = SemverLevel.PATCH;

        // chore
      } else if (parsedLog.type === 'chore') {
        pushItem(summary.maintenance, convLog);
        if (summary.level > SemverLevel.PATCH) summary.level = SemverLevel.PATCH;

        // non conventional commits
      } else {
        summary.nonConventional.push(parsedLog.header.trim());
      }

      // breaking changes -> major level
      if (breakingChange && summary.level > SemverLevel.MAJOR) {
        summary.level = SemverLevel.MAJOR;
      }

      // notes
      for (const note of parsedLog.notes) {
        summary.notes.push(`${note.title}: ${note.text}`);
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
  pushTo.push(`${commitDetails.parsedLog.subject.trim()}`);
};
