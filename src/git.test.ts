import { lastTagForPrefix } from './git';
import { createSampleRepo } from './utils/createSampleRepo';

describe('when using git', () => {
  const repoDir = './testcases/tagsrepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should get latest tag for prefix1', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'prefix1/');
    expect(ltag).toBe('prefix1/3.3.5');
  });
  it('should get latest tag for prefix2', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'prefix2/');
    expect(ltag).toBe('prefix2/20.10.0');
  });
  it('should return null if no tag found', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'pref');
    expect(ltag).toBeNull();
  });
  it('should return null if no tag found for prefix99', async () => {
    const ltag = await lastTagForPrefix(repoDir, 'prefix99/');
    expect(ltag).toBeNull();
  });
  it('should get latest tag for empty prefix', async () => {
    const ltag = await lastTagForPrefix(repoDir, '');
    expect(ltag).toBe('30.0.0');
  });
});
