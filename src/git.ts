/* eslint-disable functional/no-try-statements */
/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable functional/no-let */
/* eslint-disable functional/immutable-data */
/* eslint-disable no-undefined */
/* eslint-disable no-console */
import semver from 'semver';

import { BasicOptions } from './types/BasicOptions';
import { Commit } from './types/Commit';
import { execCmd } from './utils/os';
import { NextTagOptions } from './types/NextTagOptions';
import { getVersionFromTag, tagParts } from './utils/tags';

/**
 * Looks for commits that touched a certain path
 * @param opts {BasicOptions} parameters for commits filtering
 * @returns {Commit[]} List of commits
 */
const filterCommits = async (opts: BasicOptions): Promise<Commit[]> => {
  if (!opts.repoDir) {
    throw new Error("'repoDir' must be defined");
  }
  if (!opts.toRef) {
    throw new Error('toRef is required');
  }

  let refs = opts.toRef;
  if (opts.fromRef) {
    refs = `${opts.fromRef}..${opts.toRef}`;
  }

  // execute just to test if refs are valid
  execCmd(opts.repoDir, `git rev-list --count ${refs}`, opts.verbose);

  const outCommits = execCmd(
    opts.repoDir,
    `git log ${refs} --pretty=format:"%H" | head -n 30 | xargs -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
    opts.verbose,
  )
    .trim()
    .split('COMMIT');

  // this limit (with "head") is a safeguard for large repositories
  if (outCommits.length === 30) {
    console.log('Commits might have been limited to 30 results');
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
      // only keep commits that have touched any file inside "path"
      return cm.files.some((fn: string): boolean => {
        return fn.startsWith(opts.path);
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
const lastTagForPrefix = async (args: {
  repoDir: string;
  tagPrefix: string;
  tagSuffix?: string;
  verbose?: boolean;
  nth?: number;
}): Promise<string | undefined> => {
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
    // we are looking for a tag with a prefix
    if (args.tagPrefix) {
      // it's a tag for the desired prefix
      if (tparts[2] === args.tagPrefix) {
        return true;
      }
      // it's a tag without prefix and the desired prefix is empty
    } else if (!tparts[2]) {
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

  const i = args.nth ?? 0;
  if (orderedTags.length > i) {
    return orderedTags[i];
  }

  // tag with prefix not found
  return undefined;
};

export const lookForCommitsInPreviousTags = async (
  opts: NextTagOptions,
  nth: number,
): Promise<Commit[]> => {
  // get commits until this reference
  // if nth is 0, it means we want until the HEAD commit
  // else we want until the last tag found for the prefix
  const commitsUntilRef =
    nth === 0
      ? opts.toRef
      : await lastTagForPrefix({
          repoDir: opts.repoDir,
          tagPrefix: opts.tagPrefix,
          tagSuffix: opts.tagSuffix,
          verbose: opts.verbose,
        });

  // sometimes multiple tags are applied to the same commitid (e.g: 1.0.0-beta and 1.0.0)
  // which leads to no commits between those tags
  // go back in history to find a previous tag that actually
  // has commits in relation to the current tag (or HEAD)
  let commits: Commit[] = [];
  for (let i = nth; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const previousTag = await lastTagForPrefix({
      repoDir: opts.repoDir,
      tagPrefix: opts.tagPrefix,
      tagSuffix: opts.tagSuffix,
      verbose: opts.verbose,
      nth: i,
    });

    // eslint-disable-next-line no-await-in-loop
    commits = await filterCommits({
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

const tagExistsInRepo = (repoDir: string, tagName: string, verbose?: boolean): boolean => {
  try {
    execCmd(repoDir, `git show-ref --tags --quiet --verify -- "refs/tags/${tagName}"`, verbose);
    return true;
  } catch {
    return false;
  }
};

export { filterCommits, lastTagForPrefix, tagExistsInRepo };
