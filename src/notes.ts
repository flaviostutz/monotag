/* eslint-disable no-undefined */
/* eslint-disable functional/no-let */
import { lastTagForPrefix, lookForCommitsInPreviousTags } from './git';
import { CommitsSummary } from './types/CommitsSummary';
import { NextTagOptions } from './types/NextTagOptions';
import { getDateFromCommit, summarizeCommits } from './commits';
import { tagParts } from './utils/tags';

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

const notesForLatestTag = async (opts: NextTagOptions): Promise<string | undefined> => {
  const latestTag = await lastTagForPrefix({
    repoDir: opts.repoDir,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
  });

  if (!latestTag) {
    return undefined;
  }

  // look for a previous tag that actually has commits
  // to compose the release notes
  const commits = await lookForCommitsInPreviousTags(opts, 1);
  if (commits.length === 0) {
    return undefined;
  }

  const commitsSummary = summarizeCommits(commits);

  const versionDate = getDateFromCommit(commits[0].date);

  const formattedReleaseNotes = renderReleaseNotes({
    commitsSummary,
    tagName: latestTag,
    versionDate,
    onlyConvCommit: opts.onlyConvCommit,
  });

  return formattedReleaseNotes;
};

export { notesForLatestTag, renderReleaseNotes };
