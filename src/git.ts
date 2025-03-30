/* eslint-disable functional/no-try-statements */
/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-undefined */
/* eslint-disable no-console */
import semver from 'semver';
import { minimatch } from 'minimatch';

import { execCmd } from './utils/os';
import { getVersionFromTag, tagParts } from './utils/tags';
import { BasicOptions } from './types/options';
import { Commit } from './types/commits';

/**
 * Looks for commits that touched a certain path. fromRef and toRef are inclusive.
 * @param opts {BasicOptions} parameters for commits filtering
 * @returns {Commit[]} List of commits
 */
export const findCommitsTouchingPath = (opts: BasicOptions): Commit[] => {
  if (opts.verbose) {
    console.log('>> findCommitsTouchingPath');
  }
  if (!opts.repoDir) {
    throw new Error("'repoDir' must be defined");
  }

  const commitListCmd = gitCommitListCmd({
    repoDir: opts.repoDir,
    fromRef: opts.fromRef,
    toRef: opts.toRef,
    verbose: opts.verbose,
  });

  // range is empty
  if (!commitListCmd) {
    return [];
  }

  execCmd(opts.repoDir, `git --version`, opts.verbose);

  // execute just to test if refs are valid
  execCmd(opts.repoDir, `${commitListCmd} --count`, opts.verbose);

  const outCommits = execCmd(
    opts.repoDir,
    `${commitListCmd} | sed s/^-// | head -n 100 | xargs -r -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
    opts.verbose,
  )
    .trim()
    .split('COMMIT');

  // this limit (with "head") is a safeguard for large repositories
  if (outCommits.length === 100) {
    console.log('Commits might have been limited to 100 results');
  }

  const commits = outCommits
    .map((celem: string): Commit | undefined => {
      if (celem.trim().length === 0) {
        return undefined;
      }
      const fields = celem.trim().split(';');
      const com: Commit = {
        id: fields[1],
        author: fields[2],
        date: fields[3],
        message: fields[4],
        files: fields[5].trim().split('\n'),
      };
      return com;
    })
    .filter((cm: Commit | undefined): boolean => {
      if (!cm) {
        return false;
      }
      // only keep commits that have touched any file inside any of the paths provided to be analised
      return cm.files.some((fn: string): boolean => {
        if (!opts.paths || opts.paths.length === 0) {
          return true;
        }
        // check if this file matches any of the path patterns
        return opts.paths.some((p: string): boolean => {
          // empty path means any path
          if (p.trim().length === 0) {
            return true;
          }
          // check if file name matches glob pattern
          // add ** to the end of the pattern to match any file inside a certain prefix by default
          const dirPattern = `${p}/**`;
          const filePattern = p;
          return minimatch(fn, dirPattern) || minimatch(fn, filePattern);
          // return fn.startsWith(p);
        });
      });
    })
    .map((cm: Commit | undefined): Commit => {
      if (!cm) {
        throw new Error('Unexpected undefined commit');
      }
      return cm;
    });

  return commits.reverse();
};

/**
 * Get last tag in repository for a certain prefix according to semantic versioning
 * Ex.: Existing tags 'myservice/1.1.2', 'myservice/1.4.2', 'myservice/1.4.2-beta.0' and 'yourservice/3.4.1'
 *      If you query for tag prefix 'myservice/', it will return 'myservice/1.4.2'
 * @param {string} repoDir directory of the git repo
 * @param {string} tagPrefix tag prefix for looking for lastest tag
 * @param {string} tagSuffix tag suffix while looking for the lastest tag
 * @param {boolean} verbose verbose mode
 * @param {number} nth nth tag to return from the latest one
 * @returns {string} The tag with the same prefix/suffix that has the greatest semantic version
 */
export const lastTagForPrefix = (args: {
  repoDir: string;
  tagPrefix: string;
  tagSuffix?: string;
  verbose?: boolean;
  nth?: number;
  ignorePreReleases?: boolean;
  fromRef?: string;
  toRef?: string;
}): string | undefined => {
  // list tags by semver in descending order
  // this limit (with "head") is a safeguard for large repositories
  const tags = execCmd(
    args.repoDir,
    `git tag --list '${args.tagPrefix}*' --sort=-v:refname | head -n 200`,
    args.verbose,
  ).split('\n');

  if (args.verbose) {
    if (tags.length === 200) {
      console.log('Tags analysis might have been limited to last 200 results');
    }
    console.log(`${tags.length} with prefix '${args.tagPrefix}' found`);
  }

  // remove tags that don't match the prefix
  const filteredTagsPrefix = tags.filter((t: string): boolean => {
    const tparts = tagParts(t);
    // doesn't seem like a valid tag
    if (!tparts) {
      return false;
    }
    // it's a tag for the desired prefix
    if (tparts[2] === args.tagPrefix) {
      if (args.ignorePreReleases) {
        // check if this is a pre-release tag
        // remove tag+version and tag suffix from the tag name [tagPrefix][version][pre-release][tagSuffix]
        const preReleasePart = t
          .replace(args.tagPrefix, '')
          .replace(tparts[3], '') // version
          .replace(args.tagSuffix ?? '', '');
        if (preReleasePart) {
          return false;
        }
      }
      return true;
    }
    return false;
  });

  // remove tags that aren't pointing to commitids that are inside range fromRef to toRef
  const commitListCmd = gitCommitListCmd({
    repoDir: args.repoDir,
    fromRef: args.fromRef,
    toRef: args.toRef,
    verbose: args.verbose,
  });
  const filteredTagsRange = filteredTagsPrefix.filter((t: string): boolean => {
    if (!args.fromRef && !args.toRef) {
      return true;
    }
    try {
      // check if this tag points to a commit that is inside the desired commit range (from-to)
      // range is empty, so this commit is not found in range
      // this command will fail if grep doesn't find the tagCommitId in the commit range
      const tagCommitId = resolveCommitIdForTag(args.repoDir, t, args.verbose);
      execCmd(args.repoDir, `${commitListCmd} | sed s/^-// | grep ${tagCommitId}`, args.verbose);
    } catch {
      // grep fails if not found
      return false;
    }
    return true;
  });

  // git tag sort returns pre-released version after releases (1.0.0-alpha after 1.0.0)
  // which is semantically incorrect (first we prerelease with -alpha, then without identifier),
  // so we need to sort it again
  const orderedTags = filteredTagsRange.sort((a: string, b: string): number => {
    const versionA = getVersionFromTag(a, args.tagPrefix, args.tagSuffix);
    const versionB = getVersionFromTag(b, args.tagPrefix, args.tagSuffix);
    return semver.rcompare(versionA, versionB);
  });

  if (args.verbose) {
    console.log(`orderedTags: ${orderedTags}`);
  }

  const i = args.nth ?? 0;
  if (orderedTags.length > i) {
    return orderedTags[i];
  }

  // tag with prefix not found
  return undefined;
};

export const gitConfigUser = (
  repoDir: string,
  userName?: string,
  userEmail?: string,
  verbose?: boolean,
): void => {
  if (userName) {
    execCmd(repoDir, `git config user.name "${userName}"`, verbose);
  } else {
    try {
      execCmd(repoDir, `git config user.name`, verbose);
    } catch {
      throw new Error("git username is required because it's not already set in git");
    }
  }
  if (userEmail) {
    execCmd(repoDir, `git config user.email "${userEmail}"`, verbose);
  } else {
    try {
      execCmd(repoDir, `git config user.email`, verbose);
    } catch {
      throw new Error("git email is required because it's not already set in git");
    }
  }
};

export const tagExistsInRepo = (repoDir: string, tagName: string, verbose?: boolean): boolean => {
  try {
    execCmd(repoDir, `git show-ref --tags --verify -- "refs/tags/${tagName}"`, verbose);
    return true;
  } catch {
    return false;
  }
};

export const remoteOriginUrl = (repoDir: string, verbose?: boolean): string | undefined => {
  try {
    return execCmd(repoDir, `git remote get-url origin`, verbose).trim();
  } catch (error) {
    if (verbose) {
      console.log(`Unable to get remote origin url. err=${error}`);
    }
    return undefined;
  }
};

export const isCleanWorkingTree = (repoDir: string, verbose?: boolean): boolean => {
  if (verbose) {
    console.log('>> isCleanWorkingTree. repoDir=', repoDir);
  }
  const out = execCmd(repoDir, `git status -s`, verbose);
  // this command only returns something if there are untracked or uncommitted changes
  if (out.trim().length > 0) {
    return false;
  }
  return true;
};

/**
 * Generate git command to list commits between two refs, fromRef and toRef inclusive
 */
export const gitCommitListCmd = (args: {
  repoDir: string;
  fromRef?: string;
  toRef?: string;
  verbose?: boolean;
}): string => {
  const toRef = args.toRef ?? 'HEAD';
  if (!args.fromRef) {
    return `git rev-list ${toRef}`;
  }
  const fromCommitId = execCmd(args.repoDir, `git rev-parse ${args.fromRef}`, args.verbose).trim();
  const toCommitId = execCmd(args.repoDir, `git rev-parse ${toRef}`, args.verbose).trim();
  if (fromCommitId === toCommitId) {
    return `git rev-parse ${toRef}`;
  }
  // list commits between two refs
  return `git rev-list --boundary ${args.fromRef}..${toRef}`;
};

export const isFirstCommit = (repoDir: string, commitId: string, verbose?: boolean): boolean => {
  try {
    execCmd(
      repoDir,
      `git log --oneline --reverse --no-abbrev-commit | head -1 | grep ${commitId}`,
      verbose,
    );
    return true;
  } catch {
    return false;
  }
};

export const resolveCommitIdForRef = (repoDir: string, ref: string, verbose?: boolean): string => {
  return execCmd(repoDir, `git rev-parse --verify ${ref}`, verbose).trim();
};

export const resolveCommitIdForTag = (
  repoDir: string,
  tagName: string,
  verbose?: boolean,
): string => {
  return execCmd(repoDir, `git rev-list -n 1 ${tagName}`, verbose).trim();
};
