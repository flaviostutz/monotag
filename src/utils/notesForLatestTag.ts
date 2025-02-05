/* eslint-disable no-undefined */
/* eslint-disable no-await-in-loop */
/* eslint-disable functional/no-let */
import { lastTagForPrefix } from '../git';
import { formatReleaseNotes } from '../notes';
import { NextTagOptions } from '../types/NextTagOptions';

import { getDateFromCommit } from './getDateFromCommit';
import { lookForCommitsInPreviousTags } from './lookForCommitsInPreviousTags';
import { summarizeCommits } from './summarizeCommits';

export const notesForLatestTag = async (opts: NextTagOptions): Promise<string | undefined> => {
  const latestTag = await lastTagForPrefix({
    repoDir: opts.repoDir,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
  });

  if (!latestTag) {
    return undefined;
  }

  // look for a previous tag that actually has commits
  // to compose the release notes
  const commits = await lookForCommitsInPreviousTags(opts, 1);
  if (commits.length === 0) {
    return undefined;
  }

  const commitsSummary = summarizeCommits(commits);

  const versionDate = getDateFromCommit(commits[0].date);

  const releaseNotes = formatReleaseNotes({
    commitsSummary,
    tagName: latestTag,
    versionDate,
    onlyConvCommit: opts.onlyConvCommit,
  });

  return releaseNotes;
};
