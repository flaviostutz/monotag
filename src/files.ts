/* eslint-disable functional/no-let */
/* eslint-disable no-console */
import * as fs from 'node:fs';
import path from 'node:path';

import { TagNotes } from './types/version';
import { getVersionFromTag } from './utils/tags';
import { CliNextTagOptions } from './types/options';

export const saveResultsToFiles = (nt: TagNotes, opts: CliNextTagOptions): void => {
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

  // bump package.json or pyproject.toml files
  if (opts.bumpAction === 'latest' || opts.bumpAction === 'zero') {
    const bumpVersion = opts.bumpAction === 'latest' ? version : '0.0.0';
    bumpFilesToVersion(opts.bumpFiles, bumpVersion, opts.verbose);
  }
};

/**
 * Bump version in files by simply replacing the contents of fields called "version"
 * Supports json and yml files
 * @param files {string[]} List of files to bump
 * @param version {string} New version to be set
 * @param verbose {boolean} If true, will print logs
 */
export const bumpFilesToVersion = (files?: string[], version?: string, verbose?: boolean): void => {
  if (!files) throw new Error('files is required');
  if (!version) throw new Error('version is required');
  // eslint-disable-next-line no-restricted-syntax
  for (const file of files) {
    if (verbose) {
      console.log(`Bumping ${file} to version ${version}`);
    }
    const contents = fs.readFileSync(file, { encoding: 'utf8' });
    // json files
    const updatedContents1 = contents.replace(/"version":\s*".*"/, `"version": "${version}"`);
    // toml files
    const updatedContents2 = updatedContents1.replace(
      /version\s*=\s*".*"/,
      `version = "${version}"`,
    );
    // yml files
    const updatedContents3 = updatedContents2.replace(/version:\s*".*"/, `version: "${version}"`);
    if (updatedContents3 === contents) {
      throw new Error(
        `Could not find "version" field in file ${file}. You need it with any value so it can be bumped.`,
      );
    }
    fs.writeFileSync(file, updatedContents3, { encoding: 'utf8' });
    if (verbose) {
      console.log(`File ${file} bumped to version ${version}`);
    }
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
