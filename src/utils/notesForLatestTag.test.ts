import { createSampleRepo } from './createSampleRepo';
import { notesForLatestTag } from './notesForLatestTag';

describe('re-generate notes from latest tag', () => {
  const repoDir = './testcases/notes-latest-tag-repo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should generate notes for existing tag', async () => {
    const nt = await notesForLatestTag({
      repoDir,
      tagPrefix: 'prefix2/',
      path: 'prefix2',
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toContain('## prefix2/20.10.0 (2025-02-05)');
    expect(nt).toContain('* 8 prefix2 creating test3 file');
  });
});
