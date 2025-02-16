import { Commit } from './commits';

export type TagNotes = {
  tagName: string;
  version: string;
  releaseNotes: string;
  changesDetected: Commit[];
  existingTag: boolean;
};

export type SemverLevel = 'patch' | 'minor' | 'major';

export type SemverLevelNone = SemverLevel | 'none';
