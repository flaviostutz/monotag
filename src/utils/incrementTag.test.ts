/* eslint-disable functional/no-let */
import { SemverLevel } from '../types/SemverLevel';

import { incrementTag } from './incrementTag';

describe('when using tag incrementer', () => {
  it('should increment major and zero other parts', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.MAJOR,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/1.0.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/15.0.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '',
    });
    expect(rr).toBe('25.0.0');
  });

  it('should increment major and zero other parts -', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix-0.1.0-beta+build999',
      type: SemverLevel.MAJOR,
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-1.0.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix-14.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-15.0.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '',
    });
    expect(rr).toBe('25.0.0');
  });

  it('should increment minor and zero other parts 1', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.MINOR,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: SemverLevel.MINOR,
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.MINOR,
      tagSuffix: '',
    });
    expect(rr).toBe('24.23.0');
  });

  it('should increment patch and zero other parts', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.PATCH,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: SemverLevel.PATCH,
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/14.22.5-beta');
    rr = incrementTag({ fullTagName: '24.22.5-beta+build999', type: SemverLevel.PATCH });
    expect(rr).toBe('24.22.5');
  });
  it('should increment patch and zero other parts 2', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix-0.1.0-beta+build999',
      type: SemverLevel.PATCH,
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix-14.22.5-beta+build999',
      type: SemverLevel.PATCH,
      tagSuffix: '-win64',
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-14.22.5-win64');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.PATCH,
      tagSuffix: '',
    });
    expect(rr).toBe('24.22.5');
  });
  it('should respect minVersion when incrementing', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '',
      tagPrefix: 'my-service-prefix/',
      minVersion: '2.0.0',
    });
    expect(rr).toBe('my-service-prefix/2.0.0');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.PATCH,
      minVersion: '24.22.10',
    });
    expect(rr).toBe('24.22.10');
  });

  it('should throw error if incremented version exceeds maxVersion', async () => {
    const rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-abraca+build999',
      type: SemverLevel.MINOR,
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
      maxVersion: '14.23.1',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    expect(() => {
      incrementTag({
        fullTagName: 'my-service-prefix/0.1.0-beta+build999',
        type: SemverLevel.MAJOR,
        maxVersion: '0.5.0',
      });
    }).toThrow('Generated tag version 1.0.0 is greater than 0.5.0');
    expect(() => {
      incrementTag({
        fullTagName: 'my-service-prefix/14.22.5-beta+build999',
        type: SemverLevel.MINOR,
        tagSuffix: '-beta',
        maxVersion: '14.22.6',
      });
    }).toThrow('Generated tag version 14.23.0 is greater than 14.22.6');
    expect(() => {
      incrementTag({
        fullTagName: '24.22.5-beta+build999',
        type: SemverLevel.PATCH,
        maxVersion: '24.22.4',
      });
    }).toThrow('Generated tag version 24.22.5 is greater than 24.22.4');
  });
  it('should create pre-release versions', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.PATCH,
      preRelease: true,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.1-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5',
      type: SemverLevel.MINOR,
      preRelease: true,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5',
      type: SemverLevel.MAJOR,
      preRelease: true,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/1.0.0-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5-beta',
      type: SemverLevel.NONE,
      preRelease: false,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.5');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5-beta',
      type: SemverLevel.NONE,
      preRelease: false,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.5');
  });
  it('should increment patch between pre-release and release', async () => {
    // should keep same version when pre-release without changes
    // and not configured to always increment
    let rr = incrementTag({
      fullTagName: '24.22.5-beta.0',
      type: SemverLevel.NONE,
      preRelease: true,
      preReleaseAlwaysIncrement: false,
    });
    expect(rr).toBe('24.22.5-beta.0');

    // should increment pre-release when no changes detected
    // but configured to always increment
    rr = incrementTag({
      fullTagName: '24.22.5-beta.0',
      type: SemverLevel.NONE,
      preRelease: true,
      preReleaseAlwaysIncrement: true,
    });
    expect(rr).toBe('24.22.5-beta.1');

    // should increment patch when pre-release with changes
    rr = incrementTag({ fullTagName: '24.22.5-beta.0', type: SemverLevel.PATCH, preRelease: true });
    expect(rr).toBe('24.22.6-beta.0');

    // should release by removing pre-release when no change detected
    rr = incrementTag({
      fullTagName: '24.22.5-beta.0',
      type: SemverLevel.NONE,
      preRelease: false,
    });
    expect(rr).toBe('24.22.5');

    // should increment minor between release and pre-release version
    rr = incrementTag({
      fullTagName: '24.22.5',
      type: SemverLevel.MINOR,
      preRelease: true,
    });
    expect(rr).toBe('24.23.0-beta.0');

    // should increment minor between pre-release and release version
    // when there is a change
    rr = incrementTag({
      fullTagName: '0.2.1-beta.3',
      type: SemverLevel.MINOR,
      preRelease: false,
    });
    expect(rr).toBe('0.3.0');
  });
  it('inconsistencies in semver lib', async () => {
    // be aware of some inconsistencies of how inc() works in regard
    // to pre-release -> major/minor/patch increments
    // it seems likely to be a bug
    // https://github.com/npm/node-semver/issues/751
    // TODO [2026-01-30]: check if the library bug has been fixed
    // should increment patch between pre-release and release version
    // when there is a change
    const rr = incrementTag({
      fullTagName: '0.1.5-beta.0',
      type: SemverLevel.PATCH,
      preRelease: false,
    });
    // actually we expected to be 0.1.6, but the library is not working as expected
    expect(rr).toBe('0.1.5'); // wrong answer, but current behaviour

    /**
     * ACTUAL BEHAVIOUR OF SEMVER
     *
     * > semver.inc('7.0.0-pre.0', 'major')
     * '7.0.0' -> expected '8.0.0'
     * > semver.inc('7.0.0-pre.0', 'minor')
     * '7.0.0' -> expected '7.1.0'
     * > semver.inc('7.0.0-pre.0', 'patch')
     * '7.0.0' -> expected '7.0.1'
     *
     * > semver.inc('6.1.0-pre.0', 'major')
     * '7.0.0' -> expected '7.0.0' OK
     * > semver.inc('6.1.0-pre.0', 'minor')
     * '6.1.0' -> expected '6.2.0'
     * > semver.inc('6.1.0-pre.0', 'patch')
     * '6.1.0' -> expected '6.1.1'
     *
     * > semver.inc('6.0.5-pre.0', 'major')
     * '7.0.0' -> expected '7.0.0' OK
     * > semver.inc('6.0.5-pre.0', 'minor')
     * '6.1.0' -> expected '6.1.0' OK
     * > semver.inc('6.0.5-pre.0', 'patch')
     * '6.0.5' -> expected '6.0.5' OK
     */
  });
});
