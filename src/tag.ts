/* eslint-disable no-undefined */
/* eslint-disable no-param-reassign */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-console */
import { filterCommits, lastTagForPrefix, summarizeCommits, tagExistsInRepo } from './git';
import { formatReleaseNotes } from './notes';
import { NextTagOptions } from './types/NextTagOptions';
import { SemverLevel } from './types/SemverLevel';
import { TagNotes } from './types/TagNotes';
import { getDateFromCommit } from './utils/getDateFromCommit';
import { getVersionFromTag } from './utils/getVersionFromTag';
import { incrementTag } from './utils/incrementTag';
import { lookForCommitsInPreviousTags } from './utils/lookForCommitsInPreviousTags';
import { notesForLatestTag } from './utils/notesForLatestTag';

/**
 * Checks latest tag for a certain prefix, checks a range of commit and calculates
 * the next tag according to the type of change according to conventional commits, so
 * that semver level will be derived if the commit was a feat, fix, chore, BREAKING CHANGE etc.
 * @param {NextTagOptions} opts
 * @param {boolean} verbose
 * @returns {TagNotes}
 */
// eslint-disable-next-line complexity
const nextTag = async (opts: NextTagOptions): Promise<TagNotes | undefined> => {
  if (!opts.fromRef) {
    throw new Error("'fromRef' is required. Use 'auto' so it will use the latest tag");
  }
  if (!opts.toRef) {
    throw new Error("'toRef' is required");
  }

  // current tag
  const latestTag = await lastTagForPrefix({
    repoDir: opts.repoDir,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
  });

  if (opts.verbose) {
    console.log(`Using latest tag '${latestTag}' for '${opts.tagPrefix}'`);
  }

  if (opts.verbose && !latestTag) {
    console.log(`No existing tag found with for prefix "${opts.tagPrefix}"`);
  }

  // search for changes
  if (opts.fromRef === 'auto') {
    opts.fromRef = latestTag ?? '';
  }

  if (opts.verbose) {
    console.log(
      `Analysing commit range ${opts.fromRef}...${opts.toRef} and filtering path "${opts.path}"`,
    );
  }

  const commits = await filterCommits(opts);

  // no changes detected
  // define new tag by using the latest tag as a reference
  if (commits.length === 0) {
    if (opts.verbose) {
      console.log('No changes detected in commit range');
    }
    if (!latestTag) {
      return undefined;
    }

    const releaseNotes = await notesForLatestTag(opts);

    const tagName = incrementTag({
      fullTagName: latestTag,
      type: SemverLevel.NONE,
      ...opts,
    });

    return {
      tagName,
      version: getVersionFromTag(latestTag, opts.tagPrefix, opts.tagSuffix),
      releaseNotes: releaseNotes ?? '',
      changesDetected: 0,
      existingTag: tagExistsInRepo(opts.repoDir, tagName),
    };
  }

  if (opts.verbose) {
    console.log(`${commits.length} commits found`);
  }

  const commitsSummary = summarizeCommits(commits);

  const currentTag = latestTag ?? `${opts.tagPrefix}0.0.0${opts.tagSuffix}`;
  const tagName = incrementTag({
    fullTagName: currentTag,
    type: opts.semverLevel ?? commitsSummary.level,
    ...opts,
  });

  // look for a previous tag that actually has commits to compose the release notes
  // sometimes multiple tags are applied to the same commitid (e.g: 1.0.0-beta and 1.0.0)
  // which doesn't generate a release note. In this case we need to go back in history and find the latest commit that touched the path
  const commitsForNotes = await lookForCommitsInPreviousTags(opts, 0);
  const relevantCommitsSummary = summarizeCommits(commitsForNotes);
  const versionDate = getDateFromCommit(commits[0].date);
  const releaseNotes = formatReleaseNotes({
    commitsSummary: relevantCommitsSummary,
    tagName,
    versionDate,
    onlyConvCommit: opts.onlyConvCommit,
  });

  return {
    tagName,
    version: getVersionFromTag(tagName, opts.tagPrefix, opts.tagSuffix),
    releaseNotes,
    changesDetected: commits.length,
    existingTag: tagExistsInRepo(opts.repoDir, tagName),
  };
};

export { nextTag };
