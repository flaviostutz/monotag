import { randomBytes } from 'node:crypto';

import { notesForLatestTag } from './notes';
import { createSampleRepo } from './utils/tests';

describe('re-generate notes from latest tag', () => {
  const repoDir = `./testcases/notes-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should get notes for existing prefixed tag', async () => {
    const nt = await notesForLatestTag({
      repoDir,
      tagPrefix: 'prefix2/',
      path: 'prefix2',
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toContain('## prefix2/20.10.0 (');
    expect(nt).toContain('* 8 prefix2 creating test3 file');
    expect(nt).toContain(`### Features

* **Breaking:** 8 prefix2 creating test3 file

### Info`);
  });
  it('should generate notes for non-prefixed tag', async () => {
    const nt = await notesForLatestTag({
      repoDir,
      tagPrefix: '',
      path: '',
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toContain('## 345.2123.143 (');
    expect(nt).toContain(`### Features

* adding test1 file to root

### Info`);
  });
});
