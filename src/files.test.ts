/* eslint-disable functional/no-let */
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';

import { TagNotes } from './types/TagNotes';
import { NextTagOptions } from './types/NextTagOptions';
import { appendChangelog, saveResultsToFiles } from './files';

describe('saveResultsToFile', () => {
  const repoDir = './testcases/test-saveResultsToFile';

  const tagNotes: TagNotes = {
    tagName: 'v1.0.0',
    version: '1.0.0',
    releaseNotes: 'Initial release',
    changesDetected: 1,
    existingTag: false,
  };

  const releaseOptions: NextTagOptions = {
    repoDir,
    tagPrefix: 'v',
    verbose: true,
    path: '.',
    versionFile: 'dist/version.txt',
    notesFile: 'dist/changelog.md',
    tagFile: 'dist/releasetag.txt',
  };

  it('should save version to file', () => {
    saveResultsToFiles(tagNotes, releaseOptions);

    const versionStr = fs.readFileSync('dist/version.txt', 'utf8');
    expect(versionStr).toBe('1.0.0');

    const releaseTagStr = fs.readFileSync('dist/releasetag.txt', 'utf8');
    expect(releaseTagStr).toBe('v1.0.0');

    const changelogStr = fs.readFileSync('dist/changelog.md', 'utf8');
    expect(changelogStr).toBe('Initial release');
  });

  it('should save version to file with custom opts', () => {
    saveResultsToFiles(tagNotes, {
      path: '.',
      repoDir,
      tagPrefix: 'v',
      versionFile: `${repoDir}/dist/versionAA.txt`,
      notesFile: `${repoDir}/dist/changelogAA.md`,
      tagFile: `${repoDir}/dist/releasetagAA.txt`,
    });

    const versionStr = fs.readFileSync(`${repoDir}/dist/versionAA.txt`, 'utf8');
    expect(versionStr).toBe('1.0.0');

    const releaseTagStr = fs.readFileSync(`${repoDir}/dist/releasetagAA.txt`, 'utf8');
    expect(releaseTagStr).toBe('v1.0.0');

    const changelogStr = fs.readFileSync(`${repoDir}/dist/changelogAA.md`, 'utf8');
    expect(changelogStr).toBe('Initial release');
  });
});

describe('appendChangelog', () => {
  const tag1: TagNotes = {
    existingTag: false,
    tagName: 'v1.0.0',
    releaseNotes: `## v1.0.0 (2015-01-01)
    
    ### Features
    
    * Feature 1`,
    version: '1.0.0',
    changesDetected: 1,
  };

  const tag2: TagNotes = {
    existingTag: false,
    tagName: 'v1.1.0',
    releaseNotes: `## v1.1.0 (2015-01-02)
    
    ### Features
    
    * Feature 2`,
    version: '1.1.0',
    changesDetected: 1,
  };

  const tag3: TagNotes = {
    existingTag: false,
    tagName: 'v1.2.0',
    releaseNotes: `## v1.2.0 (2015-01-03)
    
    ### Features
    
    * Feature 3`,
    version: '1.2.0',
    changesDetected: 1,
  };

  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monotag-test-'));
  });
  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should handle changelog mutations correctly', () => {
    // create changelog if it doesn't exist
    const changelogFile = path.join(tmpDir, 'changelog.md');
    appendChangelog(changelogFile, tag1, true);
    expect(fs.existsSync(changelogFile)).toBe(true);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag1.releaseNotes}

`);

    // if version already exists, skip adding to changelog
    appendChangelog(changelogFile, tag1, true);
    expect(fs.existsSync(changelogFile)).toBe(true);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag1.releaseNotes}

`);

    // if version doesn't exist, add to changelog on top
    appendChangelog(changelogFile, tag2, true);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag2.releaseNotes}

${tag1.releaseNotes}

`);

    // skip existing version
    appendChangelog(changelogFile, tag1, true);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag2.releaseNotes}

${tag1.releaseNotes}

`);

    // if version doesn't exist, add to changelog on top
    appendChangelog(changelogFile, tag3, true);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag3.releaseNotes}

${tag2.releaseNotes}

${tag1.releaseNotes}

`);
  });
});
