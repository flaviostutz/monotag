import { filterCommits } from './git';
import { nextTag } from './tag';
import { createSampleRepo } from './utils/createSampleRepo';

describe('when generating next tag with notes', () => {
  const repoDir = './testcases/nexttagrepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should fail if no commits found touching path', async () => {
    const nt = await nextTag({
      repoDir,
      fromRef: 'auto',
      toRef: 'HEAD',
      path: 'inexistentModule',
      tagPrefix: 'inexistentModule/',
    });
    expect(nt).toBeNull();
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
    expect(nt.tagName).toBe('prefix1/3.4.0');
    expect(nt.releaseNotes.includes('## Features')).toBeTruthy();
    expect(
      nt.releaseNotes.includes('updating test1 and test2 files for module prefix1'),
    ).toBeTruthy();
    expect(nt.releaseNotes.includes('## Fixes')).toBeTruthy();
    expect(nt.releaseNotes.includes('adding test4 for both prefix1 and prefix2')).toBeTruthy();
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
    expect(nt.releaseNotes.trim()).toBe(`## Version 'prefix2/21.0.0'

## Features

- 12 prefix2 adding test3 file for module prefix2
- 14 prefix1 prefix2 adding test4 for both prefix1 and prefix2

## Fixes

- anyscope: 10 prefix2 updating test1 and test2 files again for module prefix2

## Maintenance

- 13 prefix2 updating test1 and test2 files for module prefix2 closes #45

## Info

- Refs: closes #45
- Authors: Flávio Stutz <flaviostutz@gmail.com>`);
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
      fromRef: 'HEAD~14',
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
      fromRef: 'HEAD~10',
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
      fromRef: 'HEAD~5',
      toRef: 'HEAD',
      path: '',
    });
    expect(clogs).toHaveLength(5);
    expect(clogs[0].message.includes('10')).toBeTruthy();
    expect(clogs[1].message.includes('11')).toBeTruthy();
    expect(clogs[2].message.includes('12')).toBeTruthy();
    expect(clogs[3].message.includes('13')).toBeTruthy();
    expect(clogs[4].message.includes('14')).toBeTruthy();
  });
});
