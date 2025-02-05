import semver, { ReleaseType } from 'semver';

import { SemverLevel } from '../types/SemverLevel';

import { getVersionFromTag } from './getVersionFromTag';

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
