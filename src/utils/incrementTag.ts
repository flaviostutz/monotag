import { SemverLevel } from '../types/SemverLevel';

import { tagParts } from './tagParts';

/**
 * Increment tag in certain semantic levels
 * @param fullTagName Full tag name with prefix, version and suffix, if exists.
 *                      Ex.: myservice/15.1.3-beta
 * @param type One of MAJOR, MINOR or PATCH (SemverLevel enum)
 * @param tagSuffix String to be added to the resulting tag name
 * @returns Incremented tag version with prefix, new version and suffix.
 *          Ex.: myservice/16.0.0
 */
export const incrementTag = (
  fullTagName: string,
  type: SemverLevel,
  tagSuffix: string = '',
): string => {
  const tparts = tagParts(fullTagName);
  if (!tparts) {
    throw new Error(`Tag '${fullTagName}' is not valid`);
  }
  const newVersion = [parseInt(tparts[4], 10), parseInt(tparts[5], 10), parseInt(tparts[6], 10)];
  if (type === SemverLevel.MAJOR) {
    newVersion[0] += 1;
    newVersion[1] = 0;
    newVersion[2] = 0;
  } else if (type === SemverLevel.MINOR) {
    newVersion[1] += 1;
    newVersion[2] = 0;
  } else {
    newVersion[2] += 1;
  }
  return `${tparts[2] ? tparts[2] : ''}${newVersion[0]}.${newVersion[1]}.${
    newVersion[2]
  }${tagSuffix}`;
};
