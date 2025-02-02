import * as fs from 'fs';

import { TagNotes } from '../types/TagNotes';
import { ReleaseOptions } from '../types/ReleaseOptions';

import { saveResultsToFile } from './saveResultsToFile';

describe('saveResultsToFile', () => {
  const repoDir = './testcases/test-saveResultsToFile';

  const tagNotes: TagNotes = {
    tagName: 'v1.0.0',
    releaseNotes: 'Initial release',
    changesDetected: 1,
  };

  const releaseOptions: ReleaseOptions = {
    repoDir,
    tagPrefix: 'v',
    verbose: true,
    path: '.',
  };

  it('should save version to file', () => {
    saveResultsToFile(tagNotes, releaseOptions);

    const versionStr = fs.readFileSync('dist/version.txt', 'utf8');
    expect(versionStr).toBe('1.0.0');

    const releaseTagStr = fs.readFileSync('dist/releasetag.txt', 'utf8');
    expect(releaseTagStr).toBe('v1.0.0');

    const changelogStr = fs.readFileSync('dist/changelog.md', 'utf8');
    expect(changelogStr).toBe('Initial release');
  });

  it('should save version to file with custom opts', () => {
    saveResultsToFile(tagNotes, {
      path: '.',
      repoDir,
      tagPrefix: 'v',
      version: `${repoDir}/dist/versionAA.txt`,
      changelog: `${repoDir}/dist/changelogAA.md`,
      releasetag: `${repoDir}/dist/releasetagAA.txt`,
    });

    const versionStr = fs.readFileSync(`${repoDir}/dist/versionAA.txt`, 'utf8');
    expect(versionStr).toBe('1.0.0');

    const releaseTagStr = fs.readFileSync(`${repoDir}/dist/releasetagAA.txt`, 'utf8');
    expect(releaseTagStr).toBe('v1.0.0');

    const changelogStr = fs.readFileSync(`${repoDir}/dist/changelogAA.md`, 'utf8');
    expect(changelogStr).toBe('Initial release');
  });
});
