/* eslint-disable functional/immutable-data */
/* eslint-disable no-console */
/* eslint-disable no-undefined */
/* eslint-disable functional/no-let */
import { remoteOriginUrl, resolveCommitIdForTag, resolveCommitIdForRef } from './git';
import { CommitDetails, CommitsSummary } from './types/commits';
import { getDateFromCommit, resolveCommitsForTag, summarizeCommits } from './commits';
import { tagParts } from './utils/tags';

/**
 * Given a specific tag, look for the commits that compose the tag and build the release notes.
 * This is supposed to be an indempotent operation.
 */
export const notesForTag = (opts: {
  repoDir: string;
  /**
   * The tag name to use for the release notes. If doesn't exist in repo, toRef will be required.
   */
  tagName: string;
  paths: string[];
  /**
   * Reference for the start of the range of the commit analysis to compute the notes
   * If not defined, it will be automatically defined by searching for the previous tag to the tagName
   * that actually produces commits in the range.
   * e.g.: if tagName is "1.1.0", it will look for the previous tag "1.0.0"
   */
  // fromRef?: string;
  /**
   * Reference for the end of the range of the commit analysis to compute the notes
   * If not defined, it will use the reference of tagName in repo.
   * Required if tagName doesn't exist in repo
   * @default reference of tagName (if exists)
   */
  toRef?: string;
  tagPrefix: string;
  tagSuffix?: string;
  verbose?: boolean;
  notesDisableLinks?: boolean;
  notesBaseCommitUrl?: string;
  notesBasePRUrl?: string;
  notesBaseIssueUrl?: string;
  onlyConvCommit?: boolean;
  /**
   * If true, it won't include pre-releases in the search for the "fromRef" tag
   */
  ignorePreReleases?: boolean;
}): string | undefined => {
  if (opts.verbose) {
    console.log(`\n>> notesForTag`);
  }

  if (!opts.repoDir) {
    throw new Error("'repoDir' is required");
  }
  if (opts.paths.length === 0) {
    throw new Error("'paths' cannot be empty");
  }

  const toCommitId = resolveToCommitId({
    repoDir: opts.repoDir,
    tagName: opts.tagName,
    toRef: opts.toRef,
    verbose: opts.verbose,
  });

  const commits = resolveCommitsForTag({
    repoDir: opts.repoDir,
    paths: opts.paths,
    tagRef: toCommitId,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    ignorePreReleases: opts.ignorePreReleases,
    verbose: opts.verbose,
  });

  if (opts.verbose) {
    console.log(
      `\n>> toCommitId=${toCommitId}; firstCommit=${commits[0].id} commitCount=${commits.length}`,
    );
  }

  const commitsSummary = summarizeCommits(commits);
  const versionDate = commits.length > 0 ? getDateFromCommit(commits[0].date) : '';
  const formattedReleaseNotes = renderReleaseNotes({
    repoDir: opts.repoDir,
    commitsSummary,
    tagName: opts.tagName,
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

export const renderReleaseNotes = (args: {
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
    return `[${commitDetails.commit.id.slice(0, 7)}](${baseCommitUrl}${commitDetails.commit.id})`;
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

export const resolveToCommitId = (opts: {
  repoDir: string;
  tagName: string;
  toRef?: string;
  verbose?: boolean;
}): string => {
  let tagCommitId;

  // eslint-disable-next-line functional/no-try-statements
  try {
    tagCommitId = resolveCommitIdForTag(opts.repoDir, opts.tagName, opts.verbose);
  } catch {
    // tagName doesn't exist in repo
    if (opts.verbose) {
      console.log(`Tag ${opts.tagName} doesn't exist in repo`);
    }
  }

  if (opts.toRef) {
    let toRefCommitId;
    // eslint-disable-next-line functional/no-try-statements
    try {
      toRefCommitId = resolveCommitIdForRef(opts.repoDir, opts.toRef, opts.verbose);
    } catch {
      // toRef doesn't exist in repo
      throw new Error(`toRef ${opts.toRef} doesn't exist in repo`);
    }
    if (tagCommitId && tagCommitId !== toRefCommitId) {
      throw new Error(
        `Tag ${opts.tagName} and toRef ${opts.toRef} point to different commits. ${tagCommitId} != ${toRefCommitId}`,
      );
    }
    return toRefCommitId;
  }
  if (!tagCommitId) {
    throw new Error(`'toRef' is required if 'tagName' doesn't exist in repo`);
  }
  return tagCommitId;
};
