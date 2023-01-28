import { filterCommits, summarizeCommits } from './git';
import { BasicOptions } from './types/BasicOptions';
import { CommitsSummary } from './types/CommitsSummary';

/**
 * Filters commits according to opts and creates a formatted string with release notes
 * @param {BasicOptions} opts parameters for getting commits and creating the release notes
 * @returns {string} Release notes
 */
const releaseNotes = async (opts: BasicOptions): Promise<string> => {
  if (!opts.fromRef || opts.fromRef === 'auto') {
    throw new Error("'fromRef' is required");
  }
  if (!opts.toRef) {
    throw new Error("'toRef' is required");
  }

  const commits = await filterCommits(opts);
  if (commits.length === 0) {
    throw new Error(`No commits found touching path '${opts.path}'`);
  }

  const commitsSummary = summarizeCommits(commits);

  const rn = formatReleaseNotes(commitsSummary, opts.onlyConvCommit);
  return rn;
};

const formatReleaseNotes = (
  commitsSummary: CommitsSummary,
  onlyConvCommit?: boolean,
  versionName?: string,
): string => {
  let notes = '';

  if (versionName) {
    notes += `## Version '${versionName}'\n\n`;
  }

  // features
  if (commitsSummary.features.length > 0) {
    notes += '## Features\n\n';
    notes = commitsSummary.features.reduce((pv, feat) => {
      return `${pv}- ${feat}\n`;
    }, notes);
    notes += '\n';
  }

  // fixes
  if (commitsSummary.fixes.length > 0) {
    notes += '## Fixes\n\n';
    notes = commitsSummary.fixes.reduce((pv, fix) => {
      return `${pv}- ${fix}\n`;
    }, notes);
    notes += '\n';
  }

  // maintenance
  if (commitsSummary.maintenance.length > 0) {
    notes += '## Maintenance\n\n';
    notes = commitsSummary.maintenance.reduce((pv, maintenance) => {
      return `${pv}- ${maintenance}\n`;
    }, notes);
    notes += '\n';
  }

  // misc (non conventional commits)
  if (!onlyConvCommit) {
    if (commitsSummary.nonConventional.length > 0) {
      notes += '## Misc\n\n';
      notes = commitsSummary.nonConventional.reduce((pv, nonConventional) => {
        return `${pv}- ${nonConventional}\n`;
      }, notes);
      notes += '\n';
    }
  }

  // notes
  if (commitsSummary.notes.length > 0) {
    notes += '## Notes\n\n';
    notes = commitsSummary.notes.reduce((pv, cnotes) => {
      return `${pv}- ${cnotes}\n`;
    }, notes);
    notes += '\n';
  }

  if (commitsSummary.references.length > 0 && commitsSummary.authors.length > 0) {
    notes += '## Info\n\n';
  }

  // references
  if (commitsSummary.references.length > 0) {
    // remove duplicate references
    const references = commitsSummary.references.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    notes += `- Refs: ${JSON.stringify(references)
      .replace('[', '')
      .replace(']', '')
      .replace(/"/g, '')
      .replace(',', ', ')}`;
    notes += '\n';
  }

  // authors
  if (commitsSummary.authors.length > 0) {
    // remove duplicate authors
    const authors = commitsSummary.authors.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    notes += `- Authors: ${JSON.stringify(authors)
      .replace('[', '')
      .replace(']', '')
      .replace(/"/g, '')
      .replace(',', ', ')}`;
    notes += '\n';
  }

  return notes;
};

export { formatReleaseNotes, releaseNotes };
