import { Commit } from './Commit';

export type TagNotes = {
  tagName: string;
  version: string;
  releaseNotes: string;
  changesDetected: Commit[];
  existingTag: boolean;
};
