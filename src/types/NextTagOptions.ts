import { BasicOptions } from './BasicOptions';
import { SemverLevel } from './SemverLevel';

/**
 * Options for analyzing and generating a new tag
 */
export type NextTagOptions = BasicOptions & {
  // Tag prefix to look for latest tag and for generating the tag
  tagPrefix: string;
  // Which level to increment the version. If null, will be automatic, based on commit messages
  semverLevel?: SemverLevel;
};
