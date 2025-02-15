/**
 * Basic options for searching for changes in a certain path
 */
import { SemverLevel } from './version';

export type BasicOptions = {
  /**
   * Directory where the git repository is located
   * @default .
   */
  repoDir: string;
  /**
   * Path inside repository for looking for changes
   * Defaults to any path
   */
  path: string;
  /**
   * Git ref range (starting point) for searching for changes in git log history
   * @default latest tag
   */
  fromRef?: string;
  /**
   * Git ref range (ending point) for searching for changes in git log history
   * Defaults to HEAD
   */
  toRef?: string;
  /**
   * Only take into consideration git commits that follows the conventional commits format
   * while rendering release notes
   * @default false
   */
  onlyConvCommit?: boolean;
  /**
   * Output messages about what is being done
   * Such as git commands being executed etc
   * @default false
   */
  verbose?: boolean;
};

/**
 * Options for analyzing and generating a new tag
 */
export type NextTagOptions = BasicOptions & {
  /**
   * Tag prefix to look for latest tag and for generating the tag
   */
  tagPrefix: string;
  /**
   * Tag suffix to add to the generated tag
   * When using pre-release capabilities, that will manage and increment prerelease versions,
   * this will be added to the generated version.
   * E.g.: 1.0.0-beta.1-MY_SUFFIX, if tagSuffix is '-MY_SUFFIX'
   * @default ''
   */
  tagSuffix?: string;
  /**
   * Which level to increment the version. If undefined, will be automatic, based on commit messages
   * @default undefined (automatic)
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
   * If true, the pre-release version will always be incremented
   * even if no changes are detected
   * So subsequent calls to 'nextTag' will always increment the pre-release version
   * @default false
   */
  preReleaseAlwaysIncrement?: boolean;
};

export type CliNextTagOptions = NextTagOptions & {
  /**
   * File that will be written with the tag name (e.g.: myservice/1.2.3-beta.0)
   * @default undefined (won't be created)
   */
  tagFile?: string;
  /**
   * File that will be written with the version (e.g.: 1.2.3-beta.0)
   * @default undefined (won't be created)
   */
  versionFile?: string;
  /**
   * File that will be written with the notes with the changes detected
   * The content will be a markdown with a list of commits
   * @default undefined (won't be created)
   */
  notesFile?: string;
  /**
   * File with the changelog that will be updated with the new version
   * During update, this will check if the version is already present in the changelog
   * and skip generation if it's already there.
   * Normally this file is named CHANGELOG.md
   * @default undefined (won't be created)
   */
  changelogFile?: string;

  /**
   * Bump action to be performed after the tag is generated
   * in regard to package files such as package.json, pyproject.yml etc
   * Options:
   *   - 'latest': bump the version field of the files to the calculated tag
   *   - 'zero': bump the version field of the files to 0.0.0
   *   - 'disabled': won't change any files
   * @default 'none'
   */
  bumpAction?: 'latest' | 'zero' | 'none';
  /**
   * Files to be bumped with the latest version
   * It will search for a "version" attribute in the file, replace it with the new version and save
   * If the field doesn't exist, it won't be changed
   * @default ['package.json']
   */
  bumpFiles?: string[];

  /**
   * Configure git cli with username
   * Required if action is 'commit', 'tag' or 'push'
   * @default undefined
   */
  gitUsername?: string;
  /**
   * Configure git cli with email
   * Required if action is 'commit', 'tag' or 'push'
   * @default undefined
   */
  gitEmail?: string;
};
