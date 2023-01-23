// import debug from 'debug';

import { filterCommits } from './git';
import { nextTag } from './tag';
import { createSampleRepo } from './utils/createSampleRepo';

// debug.enable('simple-git:task:*');

describe('when generating next tag with notes', () => {
  const repoDir = './testcases/nexttagrepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should fail if no commits found in path', async () => {
    const exec = async (): Promise<void> => {
      await nextTag({
        repoDir,
        fromRef: '',
        toRef: 'HEAD',
        path: 'inexistentModule',
      });
    };
    await expect(exec).rejects.toThrow('test');
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
  it('should return commits related to prefix1 path', async () => {
    const clogs = await filterCommits({
      repoDir,
      fromRef: 'HEAD~9',
      toRef: 'HEAD',
      path: 'prefix1',
    });
    expect(clogs).toHaveLength(6);
  });
  it('should return commits related to prefix2 path', async () => {
    const clogs = await filterCommits({
      repoDir,
      fromRef: 'HEAD~9',
      toRef: 'HEAD',
      path: 'prefix2',
    });
    expect(clogs).toHaveLength(7);
  });
});
