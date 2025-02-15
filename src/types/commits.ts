import { SemverLevel } from './version';

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

/**
 * Commit summarized according to conventional commit
 */
export type CommitsSummary = {
  fixes: string[];
  features: string[];
  maintenance: string[];
  notes: string[];
  level: SemverLevel;
  authors: string[];
  references: string[];
  nonConventional: string[];
};
