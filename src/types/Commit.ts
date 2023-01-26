/**
 * A commit in repository
 */
export type Commit = {
  // commit id
  id: string;
  // message of commit
  message: string;
  // date of commit
  date: string;
  // author of commit
  author: string;
  // files touched by this commit
  files: string[];
};
