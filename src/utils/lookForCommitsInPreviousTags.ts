/* eslint-disable no-undefined */
/* eslint-disable no-await-in-loop */
/* eslint-disable functional/no-let */
import { filterCommits, lastTagForPrefix } from '../git';
import { Commit } from '../types/Commit';
import { NextTagOptions } from '../types/NextTagOptions';

export const lookForCommitsInPreviousTags = async (
  opts: NextTagOptions,
  nth: number,
): Promise<Commit[]> => {
  const latestTag =
    // if nth is 0, it means we want the HEAD commit (without tags)
    nth === 0
      ? opts.toRef
      : await lastTagForPrefix({
          repoDir: opts.repoDir,
          tagPrefix: opts.tagPrefix,
          tagSuffix: opts.tagSuffix,
          verbose: opts.verbose,
        });

  // go back in history to find a previous tag that actually
  // has commits with the latest
  // sometimes multiple tags are applied to the same commitid (e.g: 1.0.0-beta and 1.0.0)
  let commits: Commit[] = [];
  for (let i = nth; i < 10; i += 1) {
    const previousTag = await lastTagForPrefix({
      repoDir: opts.repoDir,
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      verbose: opts.verbose,
      nth: i,
    });

    commits = await filterCommits({
      ...opts,
      fromRef: previousTag,
      toRef: latestTag,
    });

    if (commits.length > 0) {
      break;
    }
  }
  return commits;
};
