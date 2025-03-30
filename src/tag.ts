/* eslint-disable no-undefined */
/* eslint-disable no-param-reassign */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-console */
import semver, { ReleaseType } from 'semver';

import {
  findCommitsTouchingPath,
  lastTagForPrefix,
  resolveCommitIdForRef,
  resolveCommitIdForTag,
  tagExistsInRepo,
} from './git';
import { notesForTag } from './notes';
import { NextTagOptions } from './types/options';
import { SemverLevelNone, TagNotes } from './types/commits';
import { summarizeCommits } from './commits';
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
export const nextTag = (opts: NextTagOptions): TagNotes | undefined => {
  if (opts.verbose) {
    console.log(`>> nextTag`);
  }
  if (!opts.fromRef) {
    throw new Error("'fromRef' is required. Use 'auto' so it will use the latest tag");
  }
  if (!opts.toRef) {
    throw new Error("'toRef' is required");
  }

  // current tag
  const latestTag = lastTagForPrefix({
    repoDir: opts.repoDir,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
    fromRef: opts.fromRef === 'auto' ? undefined : opts.fromRef,
    toRef: opts.toRef,
  });

  if (opts.verbose) {
    if (!latestTag) {
      console.log(`\n>> No existing tag found with for prefix "${opts.tagPrefix}"`);
    } else {
      console.log(`\n>> Using latest tag '${latestTag}' for '${opts.tagPrefix}'`);
    }
  }

  // search for changes
  const latestTagCommitId = latestTag ? resolveCommitIdForTag(opts.repoDir, latestTag) : undefined;
  const fromRefFindCommits = opts.fromRef === 'auto' ? latestTagCommitId : opts.fromRef;

  if (opts.verbose) {
    console.log(
      `Analysing commit range ${fromRefFindCommits ?? ''}...${opts.toRef} and filtering paths "${opts.paths.join(',')}"`,
    );
  }
  const commits = findCommitsTouchingPath({
    repoDir: opts.repoDir,
    fromRef: fromRefFindCommits,
    toRef: opts.toRef,
    paths: opts.paths,
    verbose: opts.verbose,
    onlyConvCommit: opts.onlyConvCommit,
  });

  // remove commit related to fromRef (or latest tag) itself,
  // but don't remove if it's the first commit in history
  // (it has no previous tag, so this commit is also part of the changes)
  if (commits.length > 0 && fromRefFindCommits) {
    const fromRefCommitId = resolveCommitIdForRef(opts.repoDir, fromRefFindCommits, opts.verbose);
    // remove first commit if it's related to the latestTag
    if (fromRefCommitId === commits[0].id) {
      commits.shift();
    }
  }

  if (opts.verbose) {
    console.log(`\n>> Commit changes detected: ${commits.length}\n\n`);
  }

  // no changes detected since last tag
  if (commits.length === 0) {
    if (opts.verbose) {
      console.log('\n>> No changes detected in commit range\n\n');
    }

    if (!latestTag) {
      return undefined;
    }

    // reconstruct existing latest tag
    const tagName = incrementTag({
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      minVersion: opts.minVersion,
      maxVersion: opts.maxVersion,
      preRelease: opts.preRelease,
      preReleaseIdentifier: opts.preReleaseIdentifier,
      preReleaseAlwaysIncrement: opts.preReleaseAlwaysIncrement,
      fullTagName: latestTag,
      type: 'none',
    });

    const releaseNotes = notesForTag({
      repoDir: opts.repoDir,
      tagName,
      toRef: latestTagCommitId,
      paths: opts.paths,
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      verbose: opts.verbose,
      onlyConvCommit: opts.onlyConvCommit,
      notesDisableLinks: opts.notesDisableLinks,
      notesBaseCommitUrl: opts.notesBaseCommitUrl,
      notesBasePRUrl: opts.notesBasePRUrl,
      notesBaseIssueUrl: opts.notesBaseIssueUrl,
      ignorePreReleases: true,
    });

    return {
      tagName,
      version: getVersionFromTag(tagName, opts.tagPrefix, opts.tagSuffix),
      releaseNotes,
      changesDetected: commits,
      existingTag: tagExistsInRepo(opts.repoDir, tagName, opts.verbose),
    };
  }

  // changes detected. create new tag based on new commits

  if (opts.verbose) {
    console.log(`Change detected. ${commits.length} commits found`);
  }

  const commitsSummary = summarizeCommits(commits);

  const currentTag = latestTag ?? `${opts.tagPrefix}0.0.0${opts.tagSuffix}`;

  const tagName = incrementTag({
    maxVersion: opts.maxVersion,
    minVersion: opts.minVersion,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    preRelease: opts.preRelease,
    preReleaseIdentifier: opts.preReleaseIdentifier,
    preReleaseAlwaysIncrement: opts.preReleaseAlwaysIncrement,
    fullTagName: currentTag,
    type:
      !opts.semverLevel || opts.semverLevel === 'auto'
        ? commitsSummary.level
        : (opts.semverLevel ?? 'none'),
  });

  const releaseNotes = notesForTag({
    repoDir: opts.repoDir,
    tagName,
    toRef: opts.toRef,
    paths: opts.paths,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
    onlyConvCommit: opts.onlyConvCommit,
    notesDisableLinks: opts.notesDisableLinks,
    notesBaseCommitUrl: opts.notesBaseCommitUrl,
    notesBasePRUrl: opts.notesBasePRUrl,
    notesBaseIssueUrl: opts.notesBaseIssueUrl,
    ignorePreReleases: true,
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
  type: SemverLevelNone;
  tagPrefix?: string;
  tagSuffix?: string;
  minVersion?: string;
  maxVersion?: string;
  preRelease?: boolean;
  preReleaseIdentifier?: string;
  preReleaseAlwaysIncrement?: boolean;
}): string => {
  if (!['major', 'minor', 'patch', 'none'].includes(args.type)) {
    throw new Error(`Invalid type: ${args.type}`);
  }
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
    args.type === 'none' &&
    args.preRelease
  ) {
    incVersion = curVersion;
  } else {
    // be aware of some inconsistencies of how inc() works in regard
    // to pre-release -> major/minor/patch increments
    // it seems likely to be a bug (or I didn't understand well the semantics)
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

export const getIncType = (type: SemverLevelNone, preRelease: boolean): ReleaseType => {
  if (type === 'major' || type === 'minor' || type === 'patch') {
    return `${preRelease ? 'pre' : ''}${type}`;
  }

  // type is 'none'
  if (preRelease) {
    return 'prerelease';
  }

  // @ts-expect-error this type is not on the @type definition, but present on the library
  return 'release';
};
