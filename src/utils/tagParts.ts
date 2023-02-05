// playground: https://regex101.com/r/DGM8GD/1
const fullSemverRegex =
  // eslint-disable-next-line max-len
  /^((([0-9]|[1-9][0-9]*)\.([0-9]|[1-9][0-9]*)\.([0-9]|[1-9][0-9]*)))(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

const semverRegex = /(([0-9]|[1-9][0-9])*\.([0-9]|[1-9][0-9])*\.([0-9]|[1-9][0-9])*)/;

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
export const tagParts = (fullTagName: string): Array<string> | null => {
  // we added the "split" step to simplify regex because
  // it was slow for big prefixes
  // throw new Error();
  const version = semverRegex.exec(fullTagName);
  if (!version) {
    return null;
  }
  const parts = fullTagName.split(version[0]);
  const prefix = parts[0];
  const rparts = fullSemverRegex.exec(`${version[0]}${parts[1]}`);
  if (!rparts) {
    return null;
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
