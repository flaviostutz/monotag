/* eslint-disable no-undefined */
/* eslint-disable no-param-reassign */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-console */
import semver, { ReleaseType } from 'semver';

import { filterCommits, lastTagForPrefix, tagExistsInRepo } from './git';
import { notesForLatestTag, renderReleaseNotes } from './notes';
import { NextTagOptions } from './types/NextTagOptions';
import { TagNotes } from './types/TagNotes';
import { getDateFromCommit, summarizeCommits } from './commits';
import { SemverLevel } from './types/SemverLevel';
import { getVersionFromTag } from './utils/tags';

/**
 * Checks latest tag for a certain prefix, checks a range of commit and calculates
 * the next tag according to the type of change according to conventional commits, so
 * that semver level will be derived if the commit was a feat, fix, chore, BREAKING CHANGE etc.
 * @param {NextTagOptions} opts
 * @param {boolean} verbose
 * @returns {TagNotes}
 */
// eslint-disable-next-line complexity
export const nextTag = async (opts: NextTagOptions): Promise<TagNotes | undefined> => {
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
      changesDetected: commits,
      existingTag: tagExistsInRepo(opts.repoDir, tagName, opts.verbose),
    };
  }

  // changes detected. create new tag based on new commits

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
  // const commitsForNotes = await lookForCommitsInPreviousTags(opts, 0);
  // const relevantCommitsSummary = summarizeCommits(commitsForNotes);
  const versionDate = getDateFromCommit(commits[0].date);
  const releaseNotes = renderReleaseNotes({
    commitsSummary,
    tagName,
    versionDate,
    onlyConvCommit: opts.onlyConvCommit,
  });

  return {
    tagName,
    version: getVersionFromTag(tagName, opts.tagPrefix, opts.tagSuffix),
    releaseNotes,
    changesDetected: commits,
    existingTag: tagExistsInRepo(opts.repoDir, tagName, opts.verbose),
  };
};

/**
 * Increment tag in certain semantic levels
 * @param fullTagName Full tag name with prefix, version and suffix, if exists.
 *                      Ex.: myservice/15.1.3-beta
 * @param type One of MAJOR, MINOR or PATCH (SemverLevel enum)
 * @param tagPrefix Prefix to be added to the generated version. e.g.: myservice/
 * @param tagSuffix String to be added to the resulting tag name. e.g.: +win64
 * @param minVersion Minimum version to be returned. If the generated version is lower,
 * this value will be used
 * @param maxVersion Maximum version to be returned. If the generated version is higher,
 * an error will be thrown
 * @param preRelease If true, the version will be pre-released. e.g: 1.0.0-beta.1
 * @param preReleaseIdentifier Identifier for pre-release. e.g: beta
 * @returns Incremented tag version with prefix, new version and suffix.
 *          Ex.: myservice/16.0.0
 */
export const incrementTag = (args: {
  fullTagName: string;
  type: SemverLevel;
  tagPrefix?: string;
  tagSuffix?: string;
  minVersion?: string;
  maxVersion?: string;
  preRelease?: boolean;
  preReleaseIdentifier?: string;
  preReleaseAlwaysIncrement?: boolean;
}): string => {
  const tagPrefix = args.tagPrefix ?? '';
  const tagSuffix = args.tagSuffix ?? '';

  const versionFromTag = getVersionFromTag(args.fullTagName, args.tagPrefix, args.tagSuffix);
  const curVersion = semver.coerce(versionFromTag, { loose: true, includePrerelease: true });
  if (!curVersion) {
    throw new Error(`Version could not be extracted from tag. tag=${args.fullTagName}`);
  }

  // define the increment type
  const incType = getIncType(args.type, args.preRelease ?? false);

  // increment version
  // eslint-disable-next-line functional/no-let
  let incVersion = curVersion;

  // "release" doesn't work with non-prerelease versions, so skip it
  // @ts-expect-error this type is not on the @type definition, but present on the library
  if (curVersion.prerelease.length === 0 && incType === 'release') {
    incVersion = curVersion;

    // "pre-prerelease" shouldn't be incremented when there is no change detected
    // the normal behaviour is for semver to increment the prerelease number every time it is called
    // for a pre-release version, and we want to avoid it sometimes
  } else if (
    !args.preReleaseAlwaysIncrement &&
    curVersion.prerelease.length > 0 &&
    args.type === SemverLevel.NONE &&
    args.preRelease
  ) {
    incVersion = curVersion;
  } else {
    // be aware of some inconsistencies of how inc() works in regard
    // to pre-release -> major/minor/patch increments
    // it seems likely to be a bug
    // https://github.com/npm/node-semver/issues/751
    incVersion = curVersion.inc(incType, args.preReleaseIdentifier ?? 'beta');
  }

  const fversion = versionMinMax(
    incVersion,
    args.tagPrefix,
    args.tagSuffix,
    args.minVersion,
    args.maxVersion,
  );
  if (!fversion) {
    throw new Error("Coudln't generate a valid version");
  }

  return `${tagPrefix}${fversion}${tagSuffix}`;
};

const versionMinMax = (
  incVersion: semver.SemVer,
  tagPrefix?: string,
  tagSuffix?: string,
  minVersion?: string,
  maxVersion?: string,
): semver.SemVer | null => {
  // check min
  if (minVersion) {
    const minVersionSemver = semver.coerce(minVersion);
    if (minVersionSemver === null) {
      throw new Error(`Invalid minVersion: ${minVersion}`);
    }
    if (minVersion && semver.lt(incVersion, minVersionSemver)) {
      return semver.coerce(`${tagPrefix}${minVersionSemver.format()}${tagSuffix}`);
    }
  }

  // check max
  if (maxVersion) {
    const maxVersionSemver = semver.coerce(maxVersion);
    if (maxVersionSemver === null) {
      throw new Error(`Invalid maxVersion: ${maxVersion}`);
    }
    if (maxVersion && semver.gt(incVersion, maxVersionSemver)) {
      throw new Error(`Generated tag version ${incVersion} is greater than ${maxVersionSemver}`);
    }
  }

  return incVersion;
};

const getIncType = (type: SemverLevel, preRelease: boolean): ReleaseType => {
  if (type === SemverLevel.MAJOR) {
    if (preRelease) {
      return 'premajor';
    }
    return 'major';
  }
  if (type === SemverLevel.MINOR) {
    if (preRelease) {
      return 'preminor';
    }
    return 'minor';
  }
  if (type === SemverLevel.PATCH) {
    if (preRelease) {
      return 'prepatch';
    }
    return 'patch';
  }

  // SemverLevel is NONE
  if (preRelease) {
    return 'prerelease';
  }

  // @ts-expect-error this type is not on the @type definition, but present on the library
  return 'release';
};
