import * as fs from 'fs';
import * as path from 'path';

import { ReleaseOptions } from '../types/ReleaseOptions';
import { TagNotes } from '../types/TagNotes';

import { getVersionFromTag } from './getVersionFromTag';

export const saveResultsToFile = (nt: TagNotes, opts: ReleaseOptions): void => {
  // save version to file
  const versionFile = opts.versionFile ?? 'dist/version.txt';
  // extract version from tag by matching with version part from tag
  const version = getVersionFromTag(nt.tagName, opts.tagPrefix);
  fs.mkdirSync(path.dirname(versionFile), { recursive: true });
  fs.rmSync(versionFile, { force: true });
  fs.writeFileSync(versionFile, version, { encoding: 'utf8' });
  if (opts.verbose) {
    console.log(`Version saved to file: ${versionFile}`);
  }

  // save changelog to file
  const changelogFile = opts.changelogFile ?? 'dist/changelog.md';
  fs.mkdirSync(path.dirname(changelogFile), { recursive: true });
  fs.rmSync(changelogFile, { force: true });
  fs.writeFileSync(changelogFile, nt.releaseNotes, { encoding: 'utf8' });
  if (opts.verbose) {
    console.log(`Changelog saved to file: ${changelogFile}`);
  }

  // save releasetag to file
  const releasetagFile = opts.releasetagFile ?? 'dist/releasetag.txt';
  fs.mkdirSync(path.dirname(releasetagFile), { recursive: true });
  fs.rmSync(releasetagFile, { force: true });
  fs.writeFileSync(releasetagFile, nt.tagName, { encoding: 'utf8' });
  if (opts.verbose) {
    console.log(`Release tag saved to file: ${releasetagFile}`);
  }
};
