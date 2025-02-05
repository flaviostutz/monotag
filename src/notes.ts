/* eslint-disable functional/no-let */
import { filterCommits } from './git';
import { CommitsSummary } from './types/CommitsSummary';
import { NextTagOptions } from './types/NextTagOptions';
import { getDateFromCommit } from './utils/getDateFromCommit';
import { summarizeCommits } from './utils/summarizeCommits';
import { tagParts } from './utils/tagParts';

/**
 * Filters commits according to opts and creates a formatted string with release notes
 * @param {BasicOptions} opts parameters for getting commits and creating the release notes
 * @returns {string} Release notes
 */
const releaseNotes = async (opts: NextTagOptions, tagName: string): Promise<string> => {
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
  const versionDate = getDateFromCommit(commits[0].date);

  const rn = renderReleaseNotes({
    commitsSummary,
    tagName,
    versionDate,
    onlyConvCommit: opts.onlyConvCommit,
  });
  return rn;
};

const renderReleaseNotes = (args: {
  commitsSummary: CommitsSummary;
  tagName: string;
  versionDate: string;
  onlyConvCommit?: boolean;
}): string => {
  let notes = '';

  const tparts = tagParts(args.tagName);

  if (tparts) {
    notes += `## ${tparts[1]} (${args.versionDate})\n\n`;
  }

  // features
  if (args.commitsSummary.features.length > 0) {
    notes += '### Features\n\n';
    notes = args.commitsSummary.features.reduce((pn, feat) => {
      return `${pn}* ${feat}\n`;
    }, notes);
    notes += '\n';
  }

  // fixes
  if (args.commitsSummary.fixes.length > 0) {
    notes += '### Bug Fixes\n\n';
    notes = args.commitsSummary.fixes.reduce((pv, fix) => {
      return `${pv}* ${fix}\n`;
    }, notes);
    notes += '\n';
  }

  // maintenance
  if (args.commitsSummary.maintenance.length > 0) {
    notes += '### Maintenance\n\n';
    notes = args.commitsSummary.maintenance.reduce((pv, maintenance) => {
      return `${pv}* ${maintenance}\n`;
    }, notes);
    notes += '\n';
  }

  // misc (non conventional commits)
  if (!args.onlyConvCommit && args.commitsSummary.nonConventional.length > 0) {
    notes += '### Misc\n\n';
    notes = args.commitsSummary.nonConventional.reduce((pv, nonConventional) => {
      return `${pv}* ${nonConventional}\n`;
    }, notes);
    notes += '\n';
  }

  // notes
  if (args.commitsSummary.notes.length > 0) {
    notes += '### Notes\n\n';
    notes = args.commitsSummary.notes.reduce((pv, cnotes) => {
      return `${pv}* ${cnotes}\n`;
    }, notes);
    notes += '\n';
  }

  if (args.commitsSummary.references.length > 0 || args.commitsSummary.authors.length > 0) {
    notes += '### Info\n\n';
  }

  // references
  if (args.commitsSummary.references.length > 0) {
    // remove duplicate references
    const references = args.commitsSummary.references.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    notes += `* Refs: ${JSON.stringify(references)
      .replace('[', '')
      .replace(']', '')
      .replaceAll('"', '')
      .replaceAll(',', ', ')}`;
    notes += '\n';
  }

  // authors
  if (args.commitsSummary.authors.length > 0) {
    // remove duplicate authors
    const authors = args.commitsSummary.authors.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    notes += `* Authors: ${JSON.stringify(authors)
      .replace('[', '')
      .replace(']', '')
      .replaceAll('"', '')
      .replaceAll(',', ', ')}`;
    notes += '\n';
  }

  return notes;
};

export { renderReleaseNotes as formatReleaseNotes, releaseNotes };
