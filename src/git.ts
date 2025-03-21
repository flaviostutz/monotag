/* eslint-disable functional/no-try-statements */
/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-undefined */
/* eslint-disable no-console */
import semver from 'semver';

import { execCmd } from './utils/os';
import { getVersionFromTag, tagParts } from './utils/tags';
import { BasicOptions, NextTagOptions } from './types/options';
import { Commit } from './types/commits';

/**
 * Looks for commits that touched a certain path
 * @param opts {BasicOptions} parameters for commits filtering
 * @returns {Commit[]} List of commits
 */
export const findCommitsTouchingPath = async (opts: BasicOptions): Promise<Commit[]> => {
  if (!opts.repoDir) {
    throw new Error("'repoDir' must be defined");
  }
  if (!opts.toRef) {
    throw new Error('toRef is required');
  }

  let refs = opts.toRef;
  if (opts.fromRef) {
    refs = `${opts.fromRef}...${opts.toRef}`;
  }

  execCmd(opts.repoDir, `git --version`, opts.verbose);

  // execute just to test if refs are valid
  execCmd(opts.repoDir, `git rev-list --count ${refs}`, opts.verbose);

  const outCommits = execCmd(
    opts.repoDir,
    `git rev-list ${refs} | head -n 50 | xargs -r -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
    opts.verbose,
  )
    .trim()
    .split('COMMIT');

  execCmd(opts.repoDir, `git rev-list --count ${refs}`, opts.verbose);

  // this limit (with "head") is a safeguard for large repositories
  if (outCommits.length === 50) {
    console.log('Commits might have been limited to 50 results');
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
        // check if this file is inside any of the paths
        return opts.paths.some((p: string): boolean => {
          // empty path means any path
          if (p.trim().length === 0) {
            return true;
          }
          return fn.startsWith(p);
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
export const lastTagForPrefix = async (args: {
  repoDir: string;
  tagPrefix: string;
  tagSuffix?: string;
  verbose?: boolean;
  nth?: number;
  ignorePreReleases?: boolean;
}): Promise<string | undefined> => {
  if (args.verbose) {
    console.log('\n>> lastTagForPrefix. args=', args);
  }
  // list tags by semver in descending order
  const tags = execCmd(
    args.repoDir,
    `git tag --list '${args.tagPrefix}*' --sort=-v:refname | head -n 100`,
    args.verbose,
  ).split('\n');

  // this limit (with "head") is a safeguard for large repositories

  if (args.verbose) {
    if (tags.length === 100) {
      console.log('Tags analysis ight have been limited to last 100 results');
    }
    console.log(`${tags.length} with prefix '${args.tagPrefix}' found`);
  }

  // remove tags that don't match the prefix
  // or are excluded by the exceptTag parameter
  const filteredTags = tags.filter((t: string): boolean => {
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

  // git tag sort returns pre-released version after releases (1.0.0-alpha after 1.0.0)
  // which is semantically incorrect (first we prerelease with -alpha, then without identifier),
  // so we need to sort it again
  const orderedTags = filteredTags.sort((a: string, b: string): number => {
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

export const findCommitsForLatestTag = async (opts: NextTagOptions): Promise<Commit[]> => {
  // get latest tag for the prefix (might be pointing to HEAD or not)
  const commitsUntilRef = await lastTagForPrefix({
    repoDir: opts.repoDir,
    tagPrefix: opts.tagPrefix,
    tagSuffix: opts.tagSuffix,
    verbose: opts.verbose,
    nth: 0,
  });

  // sometimes multiple tags are applied to the same commitid (e.g: 1.0.0-beta and 1.0.0)
  // which leads to no commits between those tags
  // go back in history to find a previous tag that actually
  // has commits in relation to the current tag (or HEAD)
  let commits: Commit[] = [];
  for (let i = 1; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const previousTag = await lastTagForPrefix({
      repoDir: opts.repoDir,
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      verbose: opts.verbose,
      nth: i,
      ignorePreReleases: true,
    });

    // eslint-disable-next-line no-await-in-loop
    commits = await findCommitsTouchingPath({
      ...opts,
      fromRef: previousTag,
      toRef: commitsUntilRef,
    });

    // commits between versions was found
    if (commits.length > 0) {
      break;
    }
  }

  return commits;
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
    execCmd(repoDir, `git show-ref --tags --quiet --verify -- "refs/tags/${tagName}"`, verbose);
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
