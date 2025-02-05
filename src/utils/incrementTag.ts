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
  } else {
    incVersion = curVersion.inc(incType, args.preReleaseIdentifier ?? 'beta');
  }

  // check min
  const minVersionSemver = semver.coerce(args.minVersion);
  if (minVersionSemver && incVersion.compare(minVersionSemver) === -1) {
    return `${tagPrefix}${minVersionSemver}${tagSuffix}`;
  }

  // check max
  const maxVersionSemver = semver.coerce(args.maxVersion);
  if (maxVersionSemver && incVersion.compare(maxVersionSemver) === 1) {
    throw new Error(`Generated tag version ${incVersion} is greater than ${args.maxVersion}`);
  }

  return `${tagPrefix}${incVersion}${tagSuffix}`;
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
  if (preRelease) {
    return 'prerelease';
  }

  // @ts-expect-error this type is not on the @type definition, but present on the library
  return 'release';
};
