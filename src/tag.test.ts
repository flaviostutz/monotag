/* eslint-disable functional/no-let */
/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */

import { randomBytes } from 'node:crypto';

import { incrementTag, nextTag } from './tag';
import { createSampleRepo } from './utils/tests';

describe('when generating next tag with notes', () => {
  const repoDir = `./testcases/nexttag-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(() => {
    createSampleRepo(repoDir);
  });
  it('should increment major on root path/prefix because something has a breaking change in history', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: [''],
      tagPrefix: '',
    });
    expect(nt?.releaseNotes).toContain('## 346.0.0 (');
    expect(nt?.releaseNotes).toContain('* 8 ');
    expect(nt?.releaseNotes).toContain('* user-ui: 9 ');
    expect(nt?.releaseNotes).toContain('anyscope: 10 ');
    expect(nt?.releaseNotes).toContain('* tests: 11 ');
    expect(nt?.releaseNotes).toContain('* 12 ');
    expect(nt?.releaseNotes).toContain('* 13 ');
    expect(nt?.releaseNotes).toContain('* 14 ');
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('346.0.0');
  });
  it('should return latest if nothing changed', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD~16',
      paths: [''],
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('345.2123.143');
  });
  it('return changes since the latest tag in root', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: [''],
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('346.0.0');
    // this is a commit that is part of the previous tag, so shouldn't be included
    expect(nt.releaseNotes).not.toContain('adding test1 file to root');
    expect(nt.releaseNotes).toContain('2 prefix1 updating test1 file');
    expect(nt.releaseNotes?.split('\n').length).toBe(32);
  });
  it('rebuild indepomtent tag if latest on root', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'HEAD~16', // first commit
      toRef: 'HEAD~16', // first commit
      paths: [''],
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('345.2123.143');
    expect(nt.releaseNotes).toContain('adding test1 file to root');
    expect(nt.releaseNotes?.split('\n').length).toBe(10);
  });
  it('calculate next major increment in prefixed tag', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix2'],
      tagPrefix: 'prefix2/',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix2/21.0.0');
    expect(nt.releaseNotes).not.toContain('adding test1 file to root');
    expect(nt.releaseNotes).toContain('12 prefix2 adding');
    expect(nt.releaseNotes).toContain('14 prefix1 prefix2 adding test4');
    expect(nt.releaseNotes).toContain('10 prefix2 updating test1');
    expect(nt.releaseNotes).toContain('13 prefix2 updating test1 and test2 files');
    expect(nt.releaseNotes?.split('\n').length).toBe(20);
  });
  it('return idempotent tag for existing up-to-date tag', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix3'],
      tagPrefix: 'prefix3/',
      preRelease: true,
      preReleaseIdentifier: 'alpha',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-alpha');
    expect(nt.releaseNotes).not.toContain('adding test1 file to root');
    expect(nt.releaseNotes).toContain('88 prefix3 adding test1 file');
    expect(nt.releaseNotes?.split('\n').length).toBe(10);
  });
  it('return idempotent tag for existing up-to-date tag with more than one tag on repo log', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD~9',
      paths: ['prefix2'],
      tagPrefix: 'prefix2/',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix2/10.10.0');
    expect(nt.releaseNotes).not.toContain('adding test1 file to root');
    expect(nt.releaseNotes).toContain('prefix2/10.10.0');
    expect(nt.releaseNotes?.split('\n').length).toBe(10);
  });
  it('this passes on dev machine, but fails on gh actions (fixed already)', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD~16',
      paths: [''],
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('345.2123.143');
  });
  it('should fail if no commits found touching path', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['inexistentModule'],
      tagPrefix: 'inexistentModule/',
    });
    expect(nt).toBeUndefined();
  });
  it('should return next version if minor changes found in path after last tag', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.existingTag).toBeFalsy();
    expect(nt.tagName).toBe('prefix1/3.5.0');
    expect(nt.releaseNotes?.includes('## Features')).toBeTruthy();
    expect(
      nt.releaseNotes?.includes('updating test1 and test2 files for module prefix1'),
    ).toBeTruthy();
    expect(nt.releaseNotes?.includes('### Bug Fixes')).toBeTruthy();
    expect(nt.releaseNotes?.includes('adding test4 for both prefix1 and prefix2')).toBeTruthy();
  });
  it('should return latest only with different suffix if nothing changed', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
      tagSuffix: '-alphaaaaa',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0-alphaaaaa');
  });
  it('should return latest for custom tagPrefix', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix9'],
      tagPrefix: 'prefix9/v',
      tagSuffix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.existingTag).toBeTruthy();
    expect(nt.tagName).toBe('prefix9/v1.0.3');
  });
  it('should return next version with suffix', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
      tagSuffix: '-beta-gama',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0-beta-gama');
  });
  it('should return next version if major changes found in path after last tag', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix2'],
      tagPrefix: 'prefix2/',
      notesDisableLinks: true,
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix2/21.0.0');

    // get date now in format YYYY-MM-DD, adding 0 if needed
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const versionDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

    expect(nt.existingTag).toBeFalsy();
    expect(nt.releaseNotes?.trim().replaceAll(/\[.*]/g, '[COMMITID]'))
      .toBe(`## prefix2/21.0.0 (${versionDate})

### Features

* **Breaking:** 12 prefix2 adding test3 file for module prefix2 [COMMITID]
* 14 prefix1 prefix2 adding test4 for both prefix1 and prefix2 [COMMITID]

### Bug Fixes

* anyscope: 10 prefix2 updating test1 and test2 files again for module prefix2 [COMMITID]

### Maintenance

* 13 prefix2 updating test1 and test2 files for module prefix2 closes #45 [COMMITID]

### Info

* Refs: closes #45
* Authors: Flávio Stutz <flaviostutz@gmail.com>`);
  });
  it('should simply return latest tag if no new commits found after latest tag in path', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix3'],
      tagPrefix: 'prefix3/',
      tagSuffix: '-alpha',
    });
    if (!nt) throw new Error('Shoulnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-alpha');
    expect(nt.existingTag).toBeTruthy();
    expect(nt.releaseNotes).toContain('## prefix3/1.0.0');
    expect(nt.releaseNotes).toContain('* test: 88 prefix3 adding test1 file');
  });
  it('should return latest tag version with new suffix if no new commits found after latest tag in path', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix3'],
      tagPrefix: 'prefix3/',
      tagSuffix: '-rc1.0-all',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-rc1.0-all');
    expect(nt.existingTag).toBeFalsy();
    expect(nt.releaseNotes).toContain('## prefix3/1.0.0 (');
    expect(nt.releaseNotes).toContain('* test: 88 prefix3 adding test1 file');
  });

  it('should create pre-release correctly', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
      preRelease: true,
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0-beta.0');
    expect(nt.version).toBe('3.5.0-beta.0');
  });
  it('should create release correctly', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
      preRelease: false,
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0');
    expect(nt.version).toBe('3.5.0');
  });
  it('create tag that touches multiple paths using the first tag in array as tag prefix reference', () => {
    const nt = nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      paths: ['prefix2', 'prefix1'],
      tagPrefix: 'p2p1/',
      preRelease: false,
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.version).toBe('1.0.0');
    expect(nt.tagName).toBe('p2p1/1.0.0');
    expect(nt.releaseNotes).toContain('## p2p1/1.0.0');
    expect(nt.releaseNotes).toContain('2 prefix1 updating test1 file');
    expect(nt.releaseNotes).toContain('6 prefix2 updating test1 file');
    expect(nt.releaseNotes).not.toContain('* test: 88 prefix3 adding test1 file');
  });
});

describe('when using tag incrementer', () => {
  it('should increment major and zero other parts', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: 'major',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/1.0.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: 'major',
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/15.0.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: 'major',
      tagSuffix: '',
    });
    expect(rr).toBe('25.0.0');
  });

  it('should increment major and zero other parts -', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix-0.1.0-beta+build999',
      type: 'major',
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-1.0.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix-14.22.5-beta+build999',
      type: 'major',
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-15.0.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: 'major',
      tagSuffix: '',
    });
    expect(rr).toBe('25.0.0');
  });

  it('should increment minor and zero other parts 1', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: 'minor',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: 'minor',
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: 'minor',
      tagSuffix: '',
    });
    expect(rr).toBe('24.23.0');
  });

  it('should increment patch and zero other parts', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: 'patch',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: 'patch',
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/14.22.5-beta');
    rr = incrementTag({ fullTagName: '24.22.5-beta+build999', type: 'patch' });
    expect(rr).toBe('24.22.5');
  });
  it('should increment patch and zero other parts 2', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix-0.1.0-beta+build999',
      type: 'patch',
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix-14.22.5-beta+build999',
      type: 'patch',
      tagSuffix: '-win64',
      tagPrefix: 'my-service-prefix-',
    });
    expect(rr).toBe('my-service-prefix-14.22.5-win64');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: 'patch',
      tagSuffix: '',
    });
    expect(rr).toBe('24.22.5');
  });
  it('should respect minVersion when incrementing', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: 'major',
      tagSuffix: '',
      tagPrefix: 'my-service-prefix/',
      minVersion: '2.0.0',
    });
    expect(rr).toBe('my-service-prefix/2.0.0');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: 'patch',
      minVersion: '24.22.10',
    });
    expect(rr).toBe('24.22.10');
  });

  it('should throw error if incremented version exceeds maxVersion', () => {
    const rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-abraca+build999',
      type: 'minor',
      tagSuffix: '-beta',
      tagPrefix: 'my-service-prefix/',
      maxVersion: '14.23.1',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    expect(() => {
      incrementTag({
        fullTagName: 'my-service-prefix/0.1.0-beta+build999',
        type: 'major',
        maxVersion: '0.5.0',
      });
    }).toThrow('Generated tag version 1.0.0 is greater than 0.5.0');
    expect(() => {
      incrementTag({
        fullTagName: 'my-service-prefix/14.22.5-beta+build999',
        type: 'minor',
        tagSuffix: '-beta',
        maxVersion: '14.22.6',
      });
    }).toThrow('Generated tag version 14.23.0 is greater than 14.22.6');
    expect(() => {
      incrementTag({
        fullTagName: '24.22.5-beta+build999',
        type: 'patch',
        maxVersion: '24.22.4',
      });
    }).toThrow('Generated tag version 24.22.5 is greater than 24.22.4');
  });
  it('should create pre-release versions', () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: 'patch',
      preRelease: true,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.1-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5',
      type: 'minor',
      preRelease: true,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5',
      type: 'major',
      preRelease: true,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/1.0.0-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5-beta',
      type: 'none',
      preRelease: false,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.5');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5-beta',
      type: 'none',
      preRelease: false,
      tagPrefix: 'my-service-prefix/',
    });
    expect(rr).toBe('my-service-prefix/0.1.5');
  });
  it('should increment patch between pre-release and release', () => {
    // should keep same version when pre-release without changes
    // and not configured to always increment
    let rr = incrementTag({
      fullTagName: '24.22.5-beta.0',
      type: 'none',
      preRelease: true,
      preReleaseAlwaysIncrement: false,
    });
    expect(rr).toBe('24.22.5-beta.0');

    // should increment pre-release when no changes detected
    // but configured to always increment
    rr = incrementTag({
      fullTagName: '24.22.5-beta.0',
      type: 'none',
      preRelease: true,
      preReleaseAlwaysIncrement: true,
    });
    expect(rr).toBe('24.22.5-beta.1');

    // should increment patch when pre-release with changes
    rr = incrementTag({ fullTagName: '24.22.5-beta.0', type: 'patch', preRelease: true });
    expect(rr).toBe('24.22.6-beta.0');

    // should release by removing pre-release when no change detected
    rr = incrementTag({
      fullTagName: '24.22.5-beta.0',
      type: 'none',
      preRelease: false,
    });
    expect(rr).toBe('24.22.5');

    // should increment minor between release and pre-release version
    rr = incrementTag({
      fullTagName: '24.22.5',
      type: 'minor',
      preRelease: true,
    });
    expect(rr).toBe('24.23.0-beta.0');

    // should increment minor between pre-release and release version
    // when there is a change
    rr = incrementTag({
      fullTagName: '0.2.1-beta.3',
      type: 'minor',
      preRelease: false,
    });
    expect(rr).toBe('0.3.0');
  });
  it('inconsistencies in semver lib', () => {
    // be aware of some inconsistencies of how inc() works in regard
    // to pre-release -> major/minor/patch increments
    // it seems likely to be a bug
    // https://github.com/npm/node-semver/issues/751
    // TODO [2026-01-30]: check if the library bug has been fixed
    // should increment patch between pre-release and release version
    // when there is a change
    const rr = incrementTag({
      fullTagName: '0.1.5-beta.0',
      type: 'patch',
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
describe('getIncType (indirectly tested via incrementTag)', () => {
  it('type=major, preRelease=false => 1.0.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'major',
      preRelease: false,
    });
    expect(result).toBe('1.0.0');
  });

  it('type=major, preRelease=true => 1.0.0-beta.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'major',
      preRelease: true,
    });
    expect(result).toBe('1.0.0-beta.0');
  });

  it('type=minor, preRelease=false => 0.1.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'minor',
      preRelease: false,
    });
    expect(result).toBe('0.1.0');
  });

  it('type=minor, preRelease=true => 0.1.0-beta.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'minor',
      preRelease: true,
    });
    expect(result).toBe('0.1.0-beta.0');
  });

  it('type=patch, preRelease=false => 0.0.1', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'patch',
      preRelease: false,
    });
    expect(result).toBe('0.0.1');
  });

  it('type=patch, preRelease=true => 0.0.1-beta.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'patch',
      preRelease: true,
    });
    expect(result).toBe('0.0.1-beta.0');
  });

  it('type=none, preRelease=false => remain 0.0.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'none',
      preRelease: false,
    });
    expect(result).toBe('0.0.0');
  });

  it('type=none, preRelease=true => 0.0.1-beta.0', () => {
    const result = incrementTag({
      fullTagName: '0.0.0',
      type: 'none',
      preRelease: true,
    });
    expect(result).toBe('0.0.1-beta.0');
  });

  it('type=none, preRelease=true alwaysIncrement=true => 0.0.1-beta.6', () => {
    const result = incrementTag({
      fullTagName: '0.0.1-beta.5',
      type: 'none',
      preRelease: true,
      preReleaseAlwaysIncrement: true,
    });
    expect(result).toBe('0.0.1-beta.6');
  });
});
