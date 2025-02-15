import { Commit } from './commits';

export type TagNotes = {
  tagName: string;
  version: string;
  releaseNotes: string;
  changesDetected: Commit[];
  existingTag: boolean;
};

export enum SemverLevel {
  MAJOR = 1,
  MINOR = 2,
  PATCH = 3,
  NONE = 4,
}
