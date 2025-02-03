/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
import { lastTagForPrefix } from './git';
import { createSampleRepo } from './utils/createSampleRepo';

describe('when using git', () => {
  const repoDir = './testcases/tagsrepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should get latest tag for prefix1', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = await lastTagForPrefix(repoDir, 'prefix1/', true);
    expect(ltag).toBe('prefix1/3.4.5-alpha');
  });
  it('should get latest tag for prefix1 -', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = await lastTagForPrefix(repoDir, 'prefix9-', true);
    expect(ltag).toBe('prefix9-1.0.1');
  });
  it('should get latest tag for prefix2', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'prefix2/');
    expect(ltag).toBe('prefix2/20.10.0');
  });
  it('should get latest tag for prefix9/v', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'prefix9/v');
    expect(ltag).toBe('prefix9/v1.0.3');
  });
  it('should return null if no tag found', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'pref');
    expect(ltag).toBeUndefined();
  });
  it('should return null if no tag found for prefix99', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'prefix99/');
    expect(ltag).toBeUndefined();
  });
  it('should get latest tag for empty prefix', async () => {
    const ltag = await lastTagForPrefix(repoDir, '');
    expect(ltag).toEqual('345.2123.143');
  });
});
