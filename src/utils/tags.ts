/* eslint-disable no-undefined */
// playground: https://regex101.com/r/DGM8GD/1
const fullSemverRegex =
  // eslint-disable-next-line max-len
  /^(((\d|[1-9]\d*)\.(\d|[1-9]\d*)\.(\d|[1-9]\d*)))(?:-([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?(?:\+([\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*))?$/;

const semverRegex = /((\d|[1-9]\d)*\.(\d|[1-9]\d)*\.(\d|[1-9]\d)*)/;

/**
 * Get tag parts in an array from full tag name.
 * Returns null if it doesn't seem to be a semver tag
 * ex.: "test/0.0.4-rc1.2+build-1234"
 * Parts:
 *  0: test/0.0.4-rc1.2+build-1234
 *  1: test/0.0.4
 *  2: test/
 *  3: 0.0.4
 *  4: 0
 *  5: 0
 *  6: 4
 *  7: rc1.2
 *  8: build-1234
 */
export const tagParts = (fullTagName: string): Array<string> | undefined => {
  // we added the "split" step to simplify regex because
  // it was slow for big prefixes
  // throw new Error();
  const version = semverRegex.exec(fullTagName);
  if (!version) {
    return undefined;
  }
  const parts = fullTagName.split(version[0]);
  const prefix = parts[0];
  const rparts = fullSemverRegex.exec(`${version[0]}${parts[1]}`);
  if (!rparts) {
    return undefined;
  }
  return [
    `${prefix}${rparts[0]}`,
    `${prefix}${rparts[1]}`,
    prefix,
    rparts[2],
    rparts[3],
    rparts[4],
    rparts[5],
    rparts[6],
    rparts[7],
    rparts[8],
  ];
};

export const getVersionFromTag = (
  tagName: string,
  tagPrefix?: string,
  tagSuffix?: string,
): string => {
  // remove the tagPrefix only if appearing in the beginning of the tagName string using regex
  const versionPart = tagName
    .replace(new RegExp(`^${tagPrefix ?? ''}`), '')
    .replace(new RegExp(`${tagSuffix ?? ''}$`), '');

  // let version = tagName.replace(tagPrefix, '').replace(tagSuffix, '');
  const versionMatch = /(\d+\.\d+\.\d+.*)/.exec(versionPart);
  if (versionMatch) {
    return versionMatch[0];
  }
  return versionPart;
};
