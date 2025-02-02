import * as fs from 'fs';
import * as path from 'path';

import { ReleaseOptions } from '../types/ReleaseOptions';
import { TagNotes } from '../types/TagNotes';

import { getVersionFromTag } from './getVersionFromTag';

export const saveResultsToFile = (nt: TagNotes, opts: ReleaseOptions): void => {
  // save version to file
  const versionFile = opts.version || 'dist/version.txt';
  // extract version from tag by matching with version part from tag
  const version = getVersionFromTag(nt.tagName, opts.tagPrefix);
  fs.mkdirSync(path.dirname(versionFile), { recursive: true });
  fs.rmSync(versionFile, { force: true });
  fs.writeFileSync(versionFile, version, { encoding: 'utf8' });

  // save changelog to file
  const changelogFile = opts.changelog || 'dist/changelog.md';
  fs.mkdirSync(path.dirname(changelogFile), { recursive: true });
  fs.rmSync(changelogFile, { force: true });
  fs.writeFileSync(changelogFile, nt.releaseNotes, { encoding: 'utf8' });

  // save releasetag to file
  const releasetagFile = opts.releasetag || 'dist/releasetag.txt';
  fs.mkdirSync(path.dirname(releasetagFile), { recursive: true });
  fs.rmSync(releasetagFile, { force: true });
  fs.writeFileSync(releasetagFile, nt.tagName, { encoding: 'utf8' });
};
