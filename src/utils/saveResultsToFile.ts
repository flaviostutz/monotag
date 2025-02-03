/* eslint-disable no-console */
import * as fs from 'node:fs';
import path from 'node:path';

import { TagNotes } from '../types/TagNotes';
import { NextTagOptions } from '../types/NextTagOptions';

import { getVersionFromTag } from './getVersionFromTag';

export const saveResultsToFile = (nt: TagNotes, opts: NextTagOptions): void => {
  // extract version from tag by matching with version part from tag
  const version = getVersionFromTag(nt.tagName, opts.tagPrefix, opts.tagSuffix);

  // save version to file
  if (opts.versionFile) {
    fs.mkdirSync(path.dirname(opts.versionFile), { recursive: true });
    fs.rmSync(opts.versionFile, { force: true });
    fs.writeFileSync(opts.versionFile, version, { encoding: 'utf8' });
    if (opts.verbose) {
      console.log(`Version saved to file: ${opts.versionFile}`);
    }
  }

  // save changelog to file
  if (opts.changelogFile) {
    if (!nt.releaseNotes) throw new Error('Release notes are required');
    fs.mkdirSync(path.dirname(opts.changelogFile), { recursive: true });
    fs.rmSync(opts.changelogFile, { force: true });
    fs.writeFileSync(opts.changelogFile, nt.releaseNotes, { encoding: 'utf8' });
    if (opts.verbose) {
      console.log(`Changelog saved to file: ${opts.changelogFile}`);
    }
  }

  // save releasetag to file
  if (opts.releasetagFile) {
    fs.mkdirSync(path.dirname(opts.releasetagFile), { recursive: true });
    fs.rmSync(opts.releasetagFile, { force: true });
    fs.writeFileSync(opts.releasetagFile, nt.tagName, { encoding: 'utf8' });
    if (opts.verbose) {
      console.log(`Release tag saved to file: ${opts.releasetagFile}`);
    }
  }
};
