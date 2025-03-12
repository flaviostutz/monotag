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
  /**
   * Full tag name, including prefix, version and suffix
   * E.g: prefix1/1.0.0-rc.1-suffix2
   */
  tagName: string;
  /**
   * Version part of the tag, without prefix or suffix.
   * E.g: 1.0.0, 2.0.0-rc.1
   */
  version: string;
  /**
   * Release notes for this tag
   * If this is the first tag, it will be undefined
   */
  releaseNotes?: string;
  /**
   * Commits detected for this tag
   */
  changesDetected: Commit[];
  /**
   * If tag already exists in repository or a new one would be created
   */
  existingTag: boolean;
};

export type SemverLevel = 'patch' | 'minor' | 'major';

export type SemverLevelNone = SemverLevel | 'none';
