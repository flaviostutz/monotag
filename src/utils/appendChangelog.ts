/* eslint-disable functional/no-let */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';

import { TagNotes } from '../types/TagNotes';

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
