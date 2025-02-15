/* eslint-disable functional/no-let */
/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */

import { findCommitsTouchingPath } from './git';
import { incrementTag, nextTag } from './tag';
import { SemverLevel } from './types/version';
import { createSampleRepo } from './utils/tests';

describe('when generating next tag with notes', () => {
  const repoDir = './testcases/nexttag-repo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should increment major on root path/prefix because something has a breaking change in history', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: '',
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
  it('should return latest if nothing changed', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD~16',
      path: '',
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('345.2123.143');
  });
  it('this passes on dev machine, but fails on gh actions', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD~16',
      path: '',
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('345.2123.143');
  });
  it('should fail if no commits found touching path', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'inexistentModule',
      tagPrefix: 'inexistentModule/',
    });
    expect(nt).toBeUndefined();
  });
  it('should return next version if minor changes found in path after last tag', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix1',
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
  it('should return latest only with different suffix if nothing changed', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix1',
      tagPrefix: 'prefix1/',
      tagSuffix: '-alphaaaaa',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0-alphaaaaa');
  });
  it('should return latest for custom tagPrefix', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix9',
      tagPrefix: 'prefix9/v',
      tagSuffix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.existingTag).toBeTruthy();
    expect(nt.tagName).toBe('prefix9/v1.0.3');
  });
  it('should return next version with suffix', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix1',
      tagPrefix: 'prefix1/',
      tagSuffix: '-beta-gama',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0-beta-gama');
  });
  it('should return next version if major changes found in path after last tag', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix2',
      tagPrefix: 'prefix2/',
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

* **Breaking:** 12 prefix2 adding test3 file for module prefix2
* 14 prefix1 prefix2 adding test4 for both prefix1 and prefix2

### Bug Fixes

* anyscope: 10 prefix2 updating test1 and test2 files again for module prefix2 [COMMITID]

### Maintenance

* 13 prefix2 updating test1 and test2 files for module prefix2 closes #45

### Info

* Refs: closes #45
* Authors: Flávio Stutz <flaviostutz@gmail.com>`);
  });
  it('should simply return latest tag if no new commits found after latest tag in path', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix3',
      tagPrefix: 'prefix3/',
      tagSuffix: '-alpha',
    });
    if (!nt) throw new Error('Shoulnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-alpha');
    expect(nt.existingTag).toBeTruthy();
    expect(nt.releaseNotes).toContain('## prefix3/1.0.0');
    expect(nt.releaseNotes).toContain('* test: 88 prefix3 adding test1 file');
  });
  it('should return latest tag version with new suffix if no new commits found after latest tag in path', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix3',
      tagPrefix: 'prefix3/',
      tagSuffix: '-rc1.0-all',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-rc1.0-all');
    expect(nt.existingTag).toBeFalsy();
    expect(nt.releaseNotes).toContain('## prefix3/1.0.0 (');
    expect(nt.releaseNotes).toContain('* test: 88 prefix3 adding test1 file');
  });

  it('should return zero commits for inexisting path', async () => {
    const clogs = await findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~9',
      toRef: 'HEAD',
      path: 'inexistentModule',
    });
    expect(clogs).toHaveLength(0);
  });
  it('should fail if git command fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const exec = async (): Promise<void> => {
      await findCommitsTouchingPath({
        repoDir,
        fromRef: 'HEAD~9999',
        toRef: 'HEAD',
        path: '',
      });
    };
    await expect(exec).rejects.toThrow('failed');
  });
  it('should return commits related to prefix1 path', async () => {
    const clogs = await findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~16',
      toRef: 'HEAD',
      path: 'prefix1',
    });
    expect(clogs).toHaveLength(7);
    expect(clogs.filter((cl) => cl.message.includes('prefix1'))).toHaveLength(7);
    expect(clogs.filter((cl) => cl.message.includes('prefix2'))).toHaveLength(1);
  });
  it('should return commits related to prefix2 path', async () => {
    const clogs = await findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~12',
      toRef: 'HEAD',
      path: 'prefix2',
    });
    expect(clogs).toHaveLength(8);
    expect(clogs.filter((cl) => cl.message.includes('prefix2'))).toHaveLength(8);
    expect(clogs.filter((cl) => cl.message.includes('prefix1'))).toHaveLength(1);
  });
  it('should return last 5 commits', async () => {
    const clogs = await findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~6',
      toRef: 'HEAD',
      path: '',
    });
    expect(clogs).toHaveLength(6);
    expect(clogs[0].message.includes('10')).toBeTruthy();
    expect(clogs[1].message.includes('11')).toBeTruthy();
    expect(clogs[2].message.includes('12')).toBeTruthy();
    expect(clogs[3].message.includes('13')).toBeTruthy();
    expect(clogs[4].message.includes('14')).toBeTruthy();
  });

  it('should create pre-release correctly', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix1',
      tagPrefix: 'prefix1/',
      preRelease: true,
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0-beta.0');
  });
  it('should create release correctly', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix1',
      tagPrefix: 'prefix1/',
      preRelease: false,
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('prefix1/3.5.0');
  });
});

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
