/* eslint-disable functional/no-let */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { TagNotes } from '../types/TagNotes';

import { appendChangelog } from './appendChangelog';

describe('appendChangelog', () => {
  const tag1: TagNotes = {
    tagName: 'v1.0.0',
    releaseNotes: `## v1.0.0 (2015-01-01)
    
    ### Features
    
    * Feature 1`,
    version: '1.0.0',
    changesDetected: 1,
  };

  const tag2: TagNotes = {
    tagName: 'v1.1.0',
    releaseNotes: `## v1.1.0 (2015-01-02)
    
    ### Features
    
    * Feature 2`,
    version: '1.1.0',
    changesDetected: 1,
  };

  const tag3: TagNotes = {
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

  it('should not append release notes if they already exist in the changelog file', () => {});

  it('should throw an error if release notes are not provided', () => {});
});
