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
  level: SemverLevelNone;
  authors: string[];
  references: string[];
  nonConventional: string[];
};

export type TagNotes = {
  tagName: string;
  version: string;
  releaseNotes: string;
  changesDetected: Commit[];
  existingTag: boolean;
};

export type SemverLevel = 'patch' | 'minor' | 'major';

export type SemverLevelNone = SemverLevel | 'none';
