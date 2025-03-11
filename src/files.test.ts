/* eslint-disable functional/no-let */
import * as fs from 'node:fs';
import * as os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

import { TagNotes } from './types/commits';
import { appendChangelog, bumpFilesToVersion, saveResultsToFiles } from './files';
import { CliNextTagOptions } from './types/options';

describe('saveResultsToFile', () => {
  const repoDir = `./testcases/test-saveResultsToFile-${randomBytes(2).toString('hex')}`;

  const tagNotes: TagNotes = {
    tagName: 'v1.0.0',
    version: '1.0.0',
    releaseNotes: 'Initial release',
    changesDetected: [],
    existingTag: false,
  };

  const releaseOptions: CliNextTagOptions = {
    repoDir,
    tagPrefix: 'v',
    verbose: false,
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

const changesDetected = [
  {
    author: 'author',
    date: 'date',
    message: 'message',
    files: ['file'],
    id: '123-456',
  },
];

describe('appendChangelog', () => {
  const tag1: TagNotes = {
    existingTag: false,
    tagName: 'v1.0.0',
    releaseNotes: `## v1.0.0 (2015-01-01)
    
    ### Features
    
    * Feature 1`,
    version: '1.0.0',
    changesDetected,
  };

  const tag2: TagNotes = {
    existingTag: false,
    tagName: 'v1.1.0',
    releaseNotes: `## v1.1.0 (2015-01-02)
    
    ### Features
    
    * Feature 2`,
    version: '1.1.0',
    changesDetected,
  };

  const tag3: TagNotes = {
    existingTag: false,
    tagName: 'v1.2.0',
    releaseNotes: `## v1.2.0 (2015-01-03)
    
    ### Features
    
    * Feature 3`,
    version: '1.2.0',
    changesDetected,
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
    appendChangelog(changelogFile, tag1, false);
    expect(fs.existsSync(changelogFile)).toBe(true);

    const fcontents = fs.readFileSync(changelogFile, { encoding: 'utf8' });
    expect(fcontents.match(`${tag1.tagName}`)?.length).toBe(1);
    expect(fcontents).toBe(`# Changelog

${tag1.releaseNotes}

`);

    // if version already exists, skip adding to changelog
    appendChangelog(changelogFile, tag1, false);
    expect(fs.existsSync(changelogFile)).toBe(true);

    const fcontents2 = fs.readFileSync(changelogFile, { encoding: 'utf8' });
    expect(fcontents2.match(`${tag1.tagName}`)?.length).toBe(1);
    expect(fcontents2).toBe(`# Changelog

${tag1.releaseNotes}

`);

    // if version doesn't exist, add to changelog on top
    appendChangelog(changelogFile, tag2, false);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag2.releaseNotes}

${tag1.releaseNotes}

`);

    // skip existing version
    appendChangelog(changelogFile, tag1, false);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag2.releaseNotes}

${tag1.releaseNotes}

`);

    // if version doesn't exist, add to changelog on top
    appendChangelog(changelogFile, tag3, false);
    expect(fs.readFileSync(changelogFile, { encoding: 'utf8' })).toBe(`# Changelog

${tag3.releaseNotes}

${tag2.releaseNotes}

${tag1.releaseNotes}

`);
  });
});
describe('bumpFiles', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monotag-test-'));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should bump version in JSON file', () => {
    const jsonFile = path.join(tmpDir, 'package.json');
    fs.writeFileSync(jsonFile, '{"name": "test", "version": "0.0.1"}', { encoding: 'utf8' });

    bumpFilesToVersion([jsonFile], '1.0.0', false);

    const updatedContents = fs.readFileSync(jsonFile, 'utf8');
    expect(updatedContents).toBe('{"name": "test", "version": "1.0.0"}');
  });

  it('should bump version in minimal JSON file', () => {
    const jsonFile = path.join(tmpDir, 'package.json');
    fs.writeFileSync(jsonFile, '{"version":"0.0.1"}', { encoding: 'utf8' });

    bumpFilesToVersion([jsonFile], '1.0.0', false);

    const updatedContents = fs.readFileSync(jsonFile, 'utf8');
    expect(updatedContents).toBe('{"version": "1.0.0"}');
  });

  it("should fail if file doesn't exist", () => {
    // eslint-disable-next-line no-undefined
    expect(() => {
      // eslint-disable-next-line no-undefined
      bumpFilesToVersion(['packagerrr.json'], '1.0.0', false);
    }).toThrow('Cannot bump packagerrr.json. File does not exist');
  });

  it('should bump version in YAML file', () => {
    const yamlFile = path.join(tmpDir, 'something.yml');
    fs.writeFileSync(yamlFile, 'name: test\nversion: "0.0.1"', { encoding: 'utf8' });

    bumpFilesToVersion([yamlFile], '1.0.0', false);

    const updatedContents = fs.readFileSync(yamlFile, 'utf8');
    expect(updatedContents).toBe('name: test\nversion: "1.0.0"');
  });

  it('should bump version in TOML file', () => {
    const yamlFile = path.join(tmpDir, 'pyproject.toml');
    fs.writeFileSync(yamlFile, 'name = test\nversion = "0.0.1"', { encoding: 'utf8' });

    bumpFilesToVersion([yamlFile], '1.0.0', false);

    const updatedContents = fs.readFileSync(yamlFile, 'utf8');
    expect(updatedContents).toBe('name = test\nversion = "1.0.0"');
  });

  it('should throw error if version field is not found', () => {
    const invalidFile = path.join(tmpDir, 'invalid.json');
    fs.writeFileSync(invalidFile, '{"name": "test"}', { encoding: 'utf8' });

    expect(() => bumpFilesToVersion([invalidFile], '1.0.0', false)).toThrow(
      'Could not find "version" field in file',
    );
  });

  it('should throw error if files parameter is missing', () => {
    // eslint-disable-next-line no-undefined
    expect(() => bumpFilesToVersion(undefined, '1.0.0', false)).toThrow('files is required');
  });

  it('should throw error if version parameter is missing', () => {
    expect(() => bumpFilesToVersion([path.join(tmpDir, 'dummy.json')], '', false)).toThrow(
      'version is required',
    );
  });
});
