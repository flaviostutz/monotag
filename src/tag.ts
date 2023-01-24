import conventionalCommitsParser from 'conventional-commits-parser';

import { filterCommits, lastTagForPrefix } from './git';
import { formatReleaseNotes } from './notes';
import { Commit } from './types/Commit';
import { CommitsSummary } from './types/CommitsSummary';
import { NextTagOptions } from './types/NextTagOptions';
import { SemverLevel } from './types/SemverLevel';
import { TagNotes } from './types/TagNotes';
import { incrementTag } from './utils/incrementTag';

const nextTag = async (opts: NextTagOptions): Promise<TagNotes> => {
  if (!opts.path) {
    throw new Error("'path' is required");
  }
  if (!opts.fromRef) {
    throw new Error("'fromRef' is required. Use 'auto' for getting last tag automatically");
  }
  if (!opts.toRef) {
    throw new Error("'toRef' is required");
  }

  // if tagPrefix is not set, defaults to last path part
  let { tagPrefix } = opts;
  if (!tagPrefix) {
    const pathParts = opts.path.split('/');
    tagPrefix = `${pathParts[pathParts.length - 1]}`;
    if (tagPrefix.length > 0) {
      tagPrefix += '/';
    }
  }

  // current tag
  const latestTag = await lastTagForPrefix(opts.repoDir, tagPrefix);

  // detected changes
  if (opts.fromRef === 'auto') {
    opts.fromRef = latestTag ?? '';
  }
  const commits = await filterCommits(opts);
  if (commits.length === 0) {
    throw new Error(`No commits found touching path '${opts.path}'`);
  }

  // ignore first commit found because we don't want to include changes
  // found in from the reference commit, only changes after it
  // if (opts.fromRef !== '') {
  //   commits.shift();
  // }

  const commitsSummary = summarizeCommits(commits);

  const currentTag = latestTag ?? `${tagPrefix}0.0.0`;
  const tagName = incrementTag(currentTag, commitsSummary.level);

  const releaseNotes = formatReleaseNotes(commitsSummary, opts.markdownNotes ?? false);

  return <TagNotes>{
    tagName,
    releaseNotes,
  };
};

const summarizeCommits = (commits: Commit[]): CommitsSummary => {
  const sum = <CommitsSummary>{
    features: <string[]>[],
    fixes: <string[]>[],
    notes: <string[]>[],
    maintenance: <string[]>[],
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
      summary.features.push(noteItem(convLog));
      if (summary.level > SemverLevel.MINOR) summary.level = SemverLevel.MINOR;

      // fix
    } else if (convLog.type === 'fix') {
      summary.fixes.push(noteItem(convLog));
      if (summary.level > SemverLevel.PATCH) summary.level = SemverLevel.PATCH;

      // chore
    } else if (convLog.type === 'chore') {
      summary.maintenance.push(noteItem(convLog));
      if (summary.level > SemverLevel.PATCH) summary.level = SemverLevel.PATCH;
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

const noteItem = (convLog: conventionalCommitsParser.Commit): string => {
  if (convLog.scope) {
    return `${convLog.scope}: ${convLog.subject}`;
  }
  return `${convLog.subject}`;
};

export { nextTag };
