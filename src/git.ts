import { BasicOptions } from './types/BasicOptions';
import { Commit } from './types/Commit';
import { execCmd } from './utils/execCmd';
import { tagParts } from './utils/tagParts';

/**
 * Looks for commits that touched a certain path
 * @param opts {BasicOptions} parameters for commits filtering
 * @returns {DefaultLogFields[]} List of commits
 */
const filterCommits = async (opts: BasicOptions): Promise<Commit[]> => {
  if (!opts.repoDir || !opts.path) {
    throw new Error("'repoDir' and 'path' must be defined");
  }

  const out = execCmd(
    opts.repoDir,
    `git log ${opts.fromRef} ${opts.toRef} --pretty=format:"%H" | xargs -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
    true,
  );

  const commits = out
    .trim()
    .split('COMMIT')
    .map((celem: string): Commit => {
      if (celem.trim().length === 0) {
        return null;
      }
      const fields = celem.trim().split(';');
      console.log(`>>>${fields}`);
      const com: Commit = {
        id: fields[1],
        author: fields[2],
        date: fields[3],
        message: fields[4],
        files: fields[5].trim().split('\n'),
      };
      return com;
    })
    .filter((cm: Commit | null): boolean => {
      if (cm == null) {
        return false;
      }
      // only keep commits that have touched any file inside "path"
      return cm.files.some((fn: string): boolean => {
        return fn.startsWith(opts.path);
      });
    });

  return commits;
};

/**
 * Get last tag in repository for a certain prefix according to semantic versioning
 * Ex.: Existing tags 'myservice/1.1.2', 'myservice/1.4.2' and 'yourservice/3.4.1'
 *      If you query for tag prefix 'myservice/', it will return 'myservice/1.4.2'
 * @param repoDir
 * @param tagPrefix
 * @returns The tag with the same prefix that has the greatest semantic version
 */
const lastTagForPrefix = async (repoDir: string, tagPrefix: string): Promise<string | null> => {
  // list tags by semver in descending order
  const tags = execCmd(repoDir, 'git tag --sort=-v:refname').split('\n');

  for (let i = 0; i < tags.length; i += 1) {
    const tag = tags[i];
    const tparts = tagParts(tag);
    if (!tparts) {
      continue;
    }
    if (tagPrefix) {
      if (tparts[2] === tagPrefix) {
        return tparts[1];
      }
    } else if (!tparts[2]) {
      return tparts[1];
    }
  }
  // tag with prefix not found
  return null;
};

export { filterCommits, lastTagForPrefix };
