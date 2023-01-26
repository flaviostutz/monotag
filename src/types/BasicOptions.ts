/**
 * Basic options for searching for changes in a certain path
 */
export type BasicOptions = {
  // Git repository dir
  repoDir: string;
  // path inside repository for looking for changes
  path: string;
  // git ref range (starting point) for searches
  fromRef?: string;
  // git ref range (ending point) for searches
  toRef?: string;
  onlyConvCommit?: boolean;
};
