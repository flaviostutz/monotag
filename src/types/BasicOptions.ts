/**
 * Basic options for searching for changes in a certain path
 */
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
