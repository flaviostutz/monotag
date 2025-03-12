/* eslint-disable no-console */
/* eslint-disable no-undefined */
/* eslint-disable functional/no-let */
import { lastTagForPrefix, findCommitsForLatestTag } from './git';
import { CommitsSummary } from './types/commits';
import { NextTagOptions } from './types/options';
import { getDateFromCommit, summarizeCommits } from './commits';
import { tagParts } from './utils/tags';

/**
 * If the latest commit already has a tag for the prefix, it will reconstruct the notes by searching previous commit logs from the previous tag to current commit log.
 * If it doesn't have the tag, it means that this is a new tag and it will build the notes from the latest tag to the current commit log.
 * This is supposed to be an indempotent operation.
 */
const notesForLatestTag = async (opts: NextTagOptions): Promise<string | undefined> => {
  const latestTag = await lastTagForPrefix({
    repoDir: opts.repoDir,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
  });

  if (!latestTag) {
    if (opts.verbose) {
      console.log(`Latest tag not found, so no release notes will be generated`);
    }
    return undefined;
  }

  // look for the commits that compose the latest tag for this prefix
  const commits = await findCommitsForLatestTag(opts);
  if (commits.length === 0) {
    const initialCommitSummary: CommitsSummary = {
      nonConventional: [`No changes in path ${opts.path}`],
      level: 'none',
      features: [],
      fixes: [],
      maintenance: [],
      notes: [],
      references: [],
      authors: [],
    };
    const initialReleaseNotes = renderReleaseNotes({
      commitsSummary: initialCommitSummary,
      tagName: latestTag,
    });

    return initialReleaseNotes;
  }

  // commits found for the latest tag

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

const renderReleaseNotes = (args: {
  commitsSummary: CommitsSummary;
  tagName: string;
  versionDate?: string;
  onlyConvCommit?: boolean;
}): string => {
  let notes = '';

  const tparts = tagParts(args.tagName);

  if (tparts) {
    if (args.versionDate) {
      notes += `## ${tparts[1]} (${args.versionDate})\n\n`;
    } else {
      notes += `## ${tparts[1]}\n\n`;
    }
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

export { notesForLatestTag, renderReleaseNotes };
