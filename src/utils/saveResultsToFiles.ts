/* eslint-disable no-console */
import * as fs from 'node:fs';
import path from 'node:path';

import { TagNotes } from '../types/TagNotes';
import { NextTagOptions } from '../types/NextTagOptions';

import { getVersionFromTag } from './getVersionFromTag';
import { appendChangelog } from './appendChangelog';

export const saveResultsToFiles = (nt: TagNotes, opts: NextTagOptions): void => {
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

  // save notes to file
  if (opts.notesFile) {
    if (!nt.releaseNotes) throw new Error('Release notes are required');
    fs.mkdirSync(path.dirname(opts.notesFile), { recursive: true });
    fs.rmSync(opts.notesFile, { force: true });
    fs.writeFileSync(opts.notesFile, nt.releaseNotes, { encoding: 'utf8' });
    if (opts.verbose) {
      console.log(`Notes saved to file: ${opts.notesFile}`);
    }
  }

  // save tag name to file
  if (opts.tagFile) {
    fs.mkdirSync(path.dirname(opts.tagFile), { recursive: true });
    fs.rmSync(opts.tagFile, { force: true });
    fs.writeFileSync(opts.tagFile, nt.tagName, { encoding: 'utf8' });
    if (opts.verbose) {
      console.log(`Tag saved to file: ${opts.tagFile}`);
    }
  }

  // save changelog to file
  if (!opts.preRelease && opts.changelogFile) {
    appendChangelog(opts.changelogFile, nt);
  }
};
