import { releaseNotes } from './notes';
import { createSampleRepo } from './utils/createSampleRepo';

describe('when creating release notes notes', () => {
  const repoDir = './testcases/notesrepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should return release notes for a commit range', async () => {
    // get date now in format YYYY-MM-DD, adding 0 if needed
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const versionDate = `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;

    const nt = await releaseNotes(
      {
        repoDir,
        fromRef: 'HEAD~3',
        toRef: 'HEAD',
        path: 'prefix2',
      },
      '1.1.0',
    );
    expect(nt.trim()).toBe(`## 1.1.0 (${versionDate})

### Features

* 14 prefix1 prefix2 adding test4 for both prefix1 and prefix2

### Maintenance

* 13 prefix2 updating test1 and test2 files for module prefix2 closes #45

### Info

* Refs: closes #45
* Authors: Flávio Stutz <flaviostutz@gmail.com>`);
  });
});
