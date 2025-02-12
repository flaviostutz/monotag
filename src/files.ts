/* eslint-disable functional/no-let */
/* eslint-disable no-console */
import * as fs from 'node:fs';
import path from 'node:path';

import { TagNotes } from './types/TagNotes';
import { NextTagOptions } from './types/NextTagOptions';
import { getVersionFromTag } from './utils/tags';

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
  if (opts.changelogFile) {
    appendChangelog(opts.changelogFile, nt);
  }
};

export const appendChangelog = (changelogFile: string, nt: TagNotes, verbose?: boolean): void => {
  if (!nt.releaseNotes) throw new Error('Release notes are required');

  // create header if file does not exist
  const exists = fs.existsSync(changelogFile);
  if (!exists) {
    if (verbose) {
      console.log(`Creating changelog file at ${changelogFile}`);
    }
    const header = `# Changelog
`;
    fs.mkdirSync(path.dirname(changelogFile), { recursive: true });
    fs.writeFileSync(changelogFile, header, { encoding: 'utf8' });
  }

  const existingContents = fs.readFileSync(changelogFile, { encoding: 'utf8' });

  // check if notes already exist in the file
  if (existingContents.includes(nt.tagName)) {
    if (verbose) {
      console.log(`Changelog already have mention to tag ${nt.tagName}. Skipping append.`);
    }
    return;
  }

  // insert change log to the top

  // find top version header
  let headerContents = existingContents;
  let bottomContents = '';
  const firstVersionHeaderPos = existingContents.indexOf('\n## ');
  if (firstVersionHeaderPos > 0) {
    headerContents = existingContents.slice(0, firstVersionHeaderPos);
    bottomContents = existingContents.slice(firstVersionHeaderPos + 1);
  }
  const contents = `${headerContents}
${nt.releaseNotes}

${bottomContents}`;
  fs.writeFileSync(changelogFile, contents, { encoding: 'utf8' });
  if (verbose) {
    console.log(`Changelog appended to file: ${changelogFile}`);
  }
};
