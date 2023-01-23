// playground: https://regex101.com/r/DGM8GD/1
const fullSemverRegex =
  // eslint-disable-next-line max-len
  /^(([a-zA-Z0-9_\\/-]*[a-zA-Z_\\/-]+)*(([0-9]|[1-9][0-9]*)\.([0-9]|[1-9][0-9]*)\.([0-9]|[1-9][0-9]*)))(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

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
  return fullSemverRegex.exec(fullTagName);
};
