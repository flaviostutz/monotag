import conventionalCommitsParser from 'conventional-commits-parser';

import { filterCommits, lastTagForPrefix } from './git';
import { NextTagOptions } from './types/NextTagOptions';
import { TagNotes } from './types/TagNotes';

const nextTag = async (opts: NextTagOptions): Promise<TagNotes> => {
  if (!opts.path) {
    throw new Error("'path' is required");
  }
  if (!opts.toRef) {
    throw new Error("'toRef' is required");
  }

  // if tagPrefix is not set, defaults to last path part
  let { tagPrefix } = opts;
  if (!tagPrefix) {
    const pathParts = opts.path.split('/');
    tagPrefix = `${pathParts[pathParts.length - 1]}`;
    if (tagPrefix.length > 0) {
      tagPrefix += '/';
    }
  }

  // current tag
  const latestTag = await lastTagForPrefix(opts.repoDir, tagPrefix);
  let currentTag = `${opts.tagPrefix}0.0.0`;
  if (latestTag) {
    currentTag = latestTag;
  }

  // detected changes
  const commits = await filterCommits(opts);

  const semLevel = opts.semverLevel;
  if (!semLevel) {
    // detect semLevel according to conventional commit message tips
    commits.forEach((clog) => {
      const convLog = conventionalCommitsParser(clog.message);
      console.log(JSON.stringify(convLog));
    });
  }
  return Promise.resolve('');
};

export { nextTag };
