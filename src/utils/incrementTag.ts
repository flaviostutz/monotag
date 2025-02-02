import semver, { ReleaseType } from 'semver';

import { SemverLevel } from '../types/SemverLevel';

import { tagParts } from './tagParts';
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
  const tagSuffix = args.tagSuffix ? args.tagSuffix : '';
  const tparts = tagParts(args.fullTagName);
  if (!tparts) {
    throw new Error(`Tag '${args.fullTagName}' is not valid`);
  }
  const versionFromTag = getVersionFromTag(args.fullTagName, args.tagPrefix, args.tagSuffix);
  const curVersion = semver.coerce(versionFromTag, { loose: true, includePrerelease: true });
  if (!curVersion) {
    throw new Error(`Version could not be extracted from tag. tag=${args.fullTagName}`);
  }

  // define the increment type
  const incType = getIncType(args.type, args.preRelease ?? false);

  // perform release because this is not an increment
  // (just remove pre-release suffix from version. e.g: 1.0.0-beta.1 -> 1.0.0)
  // if (!incType) {
  //   return `${tparts[2] ? tparts[2] : ''}${curVersion.major}.${curVersion.minor}.${
  //     curVersion.patch
  //   }${tagSuffix}`;
  // }

  // increment version
  const incVersion = curVersion.inc(incType, args.preReleaseIdentifier ?? 'beta');

  // check min
  const minVersionSemver = semver.coerce(args.minVersion);
  if (minVersionSemver && incVersion.compare(minVersionSemver) === -1) {
    return `${tparts[2] ? tparts[2] : ''}${minVersionSemver}${tagSuffix}`;
  }

  // check max
  const maxVersionSemver = semver.coerce(args.maxVersion);
  if (maxVersionSemver && incVersion.compare(maxVersionSemver) === 1) {
    throw new Error(`Generated tag version ${incVersion} is greater than ${args.maxVersion}`);
  }

  return `${tparts[2] ? tparts[2] : ''}${incVersion}${tagSuffix}`;
};

const getIncType = (type: SemverLevel, preRelease: boolean): ReleaseType => {
  if (type === SemverLevel.MAJOR) {
    if (preRelease) {
      return 'premajor';
    }
    return 'major';
  } else if (type === SemverLevel.MINOR) {
    if (preRelease) {
      return 'preminor';
    }
    return 'minor';
  } else if (type === SemverLevel.PATCH) {
    if (preRelease) {
      return 'prepatch';
    }
    return 'patch';
  }
  if (preRelease) {
    return 'prerelease';
  }

  // @ts-ignore this type is not on the @type definition, but present on the library
  return 'release';
};
