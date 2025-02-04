import { BasicOptions } from './BasicOptions';
import { SemverLevel } from './SemverLevel';

/**
 * Options for analyzing and generating a new tag
 */
export type NextTagOptions = BasicOptions & {
  /**
   * Tag prefix to look for latest tag and for generating the tag
   */
  tagPrefix: string;
  /**
   * Tag suffix to add to generated tag
   */
  tagSuffix?: string;
  /**
   * Which level to increment the version. If null, will be automatic, based on commit messages
   */
  semverLevel?: SemverLevel;
  /**
   * Minimum version for the generated tag.
   * If the naturally incremented version is lower, this value will be used
   * @default no limit
   */
  minVersion?: string;
  /**
   * Maximum version for the generated tag.
   * If the generated version is higher than this, the operation will fail
   * @default no limit
   */
  maxVersion?: string;
  /**
   * If the generated version is a pre-release
   * This will add a pre-release identifier to the version. E.g.: 1.0.0-beta
   * This will automatically create a pre-release version depending on the semverLevel
   * identified by commit message analysis based on conventional commits.
   * For example, if the commits contain a breaking change, the version will be a major pre-release.
   * So if it was 1.2.2, it will be 2.0.0-beta. If it was 3.2.1, it will be 4.0.0-beta.
   * The same applies for minor and patch levels.
   * @default false
   */
  preRelease?: boolean;
  /**
   * Pre-release identifier
   * @default 'beta'
   */
  preReleaseIdentifier?: string;
  /**
   * File that will be written with the tag name (e.g.: myservice/1.2.3-beta.0)
   * Won't be written if not provided
   */
  tagFile?: string;
  /**
   * File that will be written with the version (e.g.: 1.2.3-beta.0)
   * Won't be written if not provided
   */
  versionFile?: string;
  /**
   * File that will be written with the notes with the changes detected
   * The content will be a markdown with a list of commits
   * Won't be written if not provided
   */
  notesFile?: string;
  /**
   * File with the changelog that will be updated with the new version
   * During update, this will check if the version is already present in the changelog
   * and skip generation if it's already there.
   * Normally this file is named CHANGELOG.md
   * Won't be written if not provided
   */
  changelogFile?: string;
};
