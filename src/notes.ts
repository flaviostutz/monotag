/* eslint-disable no-console */
/* eslint-disable no-undefined */
/* eslint-disable functional/no-let */
import { lastTagForPrefix, findCommitsForLatestTag, remoteOriginUrl } from './git';
import { CommitDetails, CommitsSummary } from './types/commits';
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
    // if not commits found it means that the path analised has no changes, thus we don't have a release notes
    return undefined;
  }

  // commits found for the latest tag

  const commitsSummary = summarizeCommits(commits);
  const versionDate = getDateFromCommit(commits[0].date);
  const formattedReleaseNotes = renderReleaseNotes({
    repoDir: opts.repoDir,
    commitsSummary,
    tagName: latestTag,
    disableLinks: opts.notesDisableLinks,
    baseCommitUrl: opts.notesBaseCommitUrl,
    basePRUrl: opts.notesBasePRUrl,
    baseIssueUrl: opts.notesBaseIssueUrl,
    versionDate,
    onlyConvCommit: opts.onlyConvCommit,
    verbose: opts.verbose,
  });

  return formattedReleaseNotes;
};

const renderReleaseNotes = (args: {
  repoDir: string;
  commitsSummary: CommitsSummary;
  tagName: string;
  disableLinks?: boolean;
  baseCommitUrl?: string;
  basePRUrl?: string;
  baseIssueUrl?: string;
  versionDate?: string;
  onlyConvCommit?: boolean;
  verbose?: boolean;
}): string => {
  let notes = '';

  const baseCommitUrl = resolveBaseCommitUrl(
    args.repoDir,
    args.disableLinks,
    args.baseCommitUrl,
    args.verbose,
  );

  const basePRUrl = resolveBasePRUrl(args.repoDir, args.disableLinks, args.basePRUrl, args.verbose);

  const baseIssueUrl = resolveBaseIssueUrl(
    args.repoDir,
    args.disableLinks,
    args.baseIssueUrl,
    args.verbose,
  );

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
    notes = args.commitsSummary.features.reduce((pv, commit) => {
      return `${pv}${renderCommit(commit, baseCommitUrl, basePRUrl, baseIssueUrl)}`;
    }, notes);
    notes += '\n';
  }

  // fixes
  if (args.commitsSummary.fixes.length > 0) {
    notes += '### Bug Fixes\n\n';
    notes = args.commitsSummary.fixes.reduce((pv, commit) => {
      return `${pv}${renderCommit(commit, baseCommitUrl, basePRUrl, baseIssueUrl)}`;
    }, notes);
    notes += '\n';
  }

  // maintenance
  if (args.commitsSummary.maintenance.length > 0) {
    notes += '### Maintenance\n\n';
    notes = args.commitsSummary.maintenance.reduce((pv, commit) => {
      return `${pv}${renderCommit(commit, baseCommitUrl, basePRUrl, baseIssueUrl)}`;
    }, notes);
    notes += '\n';
  }

  // misc (non conventional commits)
  if (!args.onlyConvCommit && args.commitsSummary.nonConventional.length > 0) {
    notes += '### Misc\n\n';
    notes = args.commitsSummary.nonConventional.reduce((pv, commit) => {
      return `${pv}${renderCommit(commit, baseCommitUrl, basePRUrl, baseIssueUrl)}`;
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

export const renderCommit = (
  commitDetails: CommitDetails,
  baseCommitUrl?: string,
  basePRUrl?: string,
  baseIssueURL?: string,
): string => {
  if (!commitDetails.parsedLog.subject) {
    return '';
  }
  if (commitDetails.parsedLog.scope) {
    return `* ${commitDetails.parsedLog.scope}: ${renderSubject(commitDetails.parsedLog.subject, basePRUrl, baseIssueURL)} [${renderCommitId(commitDetails, baseCommitUrl)}]\n`;
  }
  return `* ${renderSubject(commitDetails.parsedLog.subject, basePRUrl, baseIssueURL)} [${renderCommitId(commitDetails, baseCommitUrl)}]\n`;
};

export const renderSubject = (
  subject: string,
  basePRUrl?: string,
  baseIssueUrl?: string,
): string => {
  if (!basePRUrl && !baseIssueUrl) {
    return subject;
  }

  let result = subject;

  // this subject seems to have a reference to a PR
  // replace any references that seems like a PR number by a link to the PR page
  if (basePRUrl) {
    const prLink = `[$2](${basePRUrl}$2)`;
    result = subject.replaceAll(
      /(.*?merge[^\d.]*|.*?pr[^a-z][^\d.]*|.*?pull[^\d.]*)(\d+)(.*?)/gi,
      `$1${prLink}$3`,
    );
  }

  if (!baseIssueUrl) {
    return result;
  }

  // check if this subject has a reference to an issue
  const issueLink = `[#$2](${baseIssueUrl}$2)`;
  return result.replaceAll(/(.*?)#(\d+)(.*?)/gi, `$1${issueLink}$3`);
};

const renderCommitId = (commitDetails: CommitDetails, baseCommitUrl?: string): string => {
  if (baseCommitUrl) {
    return `[${commitDetails.commit.id.slice(0, 7)}](${baseCommitUrl}/commit/${
      commitDetails.commit.id
    })`;
  }
  return `${commitDetails.commit.id.slice(0, 7)}`;
};

export const resolveBaseCommitUrl = (
  repoDir: string,
  disableLinks?: boolean,
  baseCommitUrl?: string,
  verbose?: boolean,
): string | undefined => {
  if (disableLinks) {
    return undefined;
  }
  if (baseCommitUrl) {
    return baseCommitUrl;
  }
  const remoteOrigin = cleanupRemoteOrigin(remoteOriginUrl(repoDir, verbose));
  if (!remoteOrigin) {
    return undefined;
  }
  return remoteOrigin ? `${remoteOrigin}/commit/` : undefined;
};

export const resolveBasePRUrl = (
  repoDir: string,
  disableLinks?: boolean,
  basePRUrl?: string,
  verbose?: boolean,
): string | undefined => {
  if (disableLinks) {
    return undefined;
  }
  if (basePRUrl) {
    return basePRUrl;
  }
  const remoteOrigin = cleanupRemoteOrigin(remoteOriginUrl(repoDir, verbose));
  if (!remoteOrigin) {
    return undefined;
  }

  let path = '';
  if (remoteOrigin.includes('github')) {
    path = 'pull';
  }
  if (remoteOrigin.includes('gitlab')) {
    path = '-/merge_requests';
  }
  if (remoteOrigin.includes('azure')) {
    path = 'pullrequest';
  }
  if (!path) {
    if (verbose) {
      console.log(
        `Cannot determine PR path for remote origin ${remoteOrigin}. Provide a base PR URL to render links in notes.`,
      );
    }
    return undefined;
  }
  return `${remoteOrigin}/${path}/`;
};

export const resolveBaseIssueUrl = (
  repoDir: string,
  disableLinks?: boolean,
  baseIssueUrl?: string,
  verbose?: boolean,
): string | undefined => {
  if (disableLinks) {
    return undefined;
  }
  if (baseIssueUrl) {
    return baseIssueUrl;
  }
  const remoteOrigin = cleanupRemoteOrigin(remoteOriginUrl(repoDir, verbose));
  if (!remoteOrigin) {
    return undefined;
  }

  let path = '';
  if (remoteOrigin.includes('github')) {
    path = 'issues';
  }
  if (remoteOrigin.includes('gitlab')) {
    path = '-/issues';
  }
  if (!path) {
    if (verbose) {
      console.log(
        `Cannot determine issue path for remote origin ${remoteOrigin}. Provide a base Issue URL to render links in notes.`,
      );
    }
    return undefined;
  }
  return `${remoteOrigin}/${path}/`;
};

export const cleanupRemoteOrigin = (remoteOriginRaw?: string): string | undefined => {
  if (!remoteOriginRaw) {
    return undefined;
  }
  let remoteOrigin = remoteOriginRaw;
  remoteOrigin = remoteOrigin.replace(/(git@)(.*)(:)(.*)/, 'https://$2/$4'); // ssh "git@github.com:rollup/rollup.git" to https://github.com/rollup/rollup.git
  remoteOrigin = remoteOrigin.replace(/https?:\/\//, 'https://'); // http to https
  remoteOrigin = remoteOrigin.replace(/ssh:\/\//, 'https://'); // ssh to https protocol
  remoteOrigin = remoteOrigin.replace(/https:\/\/.*@/, 'https://'); // remove user from URL
  remoteOrigin = remoteOrigin.replace(/\.git$/, ''); // remove .git at the end
  return remoteOrigin;
};

export { notesForLatestTag, renderReleaseNotes };
