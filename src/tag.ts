import { filterCommits, lastTagForPrefix, summarizeCommits } from './git';
import { formatReleaseNotes } from './notes';
import { NextTagOptions } from './types/NextTagOptions';
import { TagNotes } from './types/TagNotes';
import { incrementTag } from './utils/incrementTag';

/**
 * Checks latest tag for a certain prefix, checks a range of commit and calculates
 * the next tag according to the type of change according to conventional commits, so
 * that semver level will be derived if the commit was a feat, fix, chore, BREAKING CHANGE etc.
 * @param {NextTagOptions} opts
 * @param {boolean} verbose
 * @returns {TagNotes}
 */
const nextTag = async (opts: NextTagOptions): Promise<TagNotes | null> => {
  if (!opts.fromRef) {
    throw new Error("'fromRef' is required. Use 'auto' so it will use the latest tag");
  }
  if (!opts.toRef) {
    throw new Error("'toRef' is required");
  }

  // current tag
  const latestTag = await lastTagForPrefix(opts.repoDir, opts.tagPrefix, opts.verbose);

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
  if (commits.length === 0) {
    if (opts.verbose) {
      console.log('No changes detected in commit range');
    }
    if (!latestTag) {
      return null;
    }
    // nothing changed in the commit range
    return <TagNotes>{
      tagName: latestTag,
      changesDetected: 0,
    };
  }

  if (opts.verbose) {
    console.log(`${commits.length} relevant commits found`);
  }

  const commitsSummary = summarizeCommits(commits);

  const currentTag = latestTag ?? `${opts.tagPrefix}0.0.0`;
  const tagName = incrementTag(currentTag, opts.semverLevel ?? commitsSummary.level);

  const releaseNotes = formatReleaseNotes(commitsSummary, opts.onlyConvCommit, tagName);

  return <TagNotes>{
    tagName,
    releaseNotes,
    changesDetected: commits.length,
  };
};

export { nextTag };
