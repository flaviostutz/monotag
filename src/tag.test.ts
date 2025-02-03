/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
import { filterCommits } from './git';
import { nextTag } from './tag';
import { createSampleRepo } from './utils/createSampleRepo';

describe('when generating next tag with notes', () => {
  const repoDir = './testcases/nexttagrepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should increment major on root path/prefix because something has breaking change in history', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: '',
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('346.0.0');
  });
  it('should return latest if nothing changed', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: '',
      tagPrefix: '',
    });
    if (!nt) throw new Error('Shouldnt be null');
    expect(nt.tagName).toBe('346.0.0');
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
    console.log(nt.releaseNotes);
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

    expect(nt.releaseNotes?.trim()).toBe(`## prefix2/21.0.0 (${versionDate})

### Features

* 12 prefix2 adding test3 file for module prefix2
* 14 prefix1 prefix2 adding test4 for both prefix1 and prefix2

### Bug Fixes

* anyscope: 10 prefix2 updating test1 and test2 files again for module prefix2

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
    });
    if (!nt) throw new Error('Shoulnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-alpha');
    expect(nt.releaseNotes).toBeUndefined();
  });
  it('should return latest tag version with new prefix if no new commits found after latest tag in path', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'prefix3',
      tagPrefix: 'prefix3/',
      tagSuffix: '-rc1.0-all',
    });
    if (!nt) throw new Error('Shoulnt be null');
    expect(nt.tagName).toBe('prefix3/1.0.0-rc1.0-all');
    expect(nt.releaseNotes).toBeUndefined();
  });

  it('should return zero commits for inexisting path', async () => {
    const clogs = await filterCommits({
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
      await filterCommits({
        repoDir,
        fromRef: 'HEAD~9999',
        toRef: 'HEAD',
        path: '',
      });
    };
    await expect(exec).rejects.toThrow('failed');
  });
  it('should return commits related to prefix1 path', async () => {
    const clogs = await filterCommits({
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
    const clogs = await filterCommits({
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
    const clogs = await filterCommits({
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
