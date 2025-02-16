/* eslint-disable functional/no-try-statements */
/* eslint-disable no-console */
import { execSync } from 'node:child_process';

export const execCmd = (
  baseDir: string,
  shellScript: string,
  verbose?: boolean,
  ignoreError?: boolean,
): string => {
  if (verbose) {
    console.log(`${new Date().toISOString()}: Executing on baseDir=${baseDir}`);
    console.log(`${new Date().toISOString()}: ${shellScript}`);
  }
  try {
    const result = execSync(shellScript, { cwd: baseDir, shell: '/bin/bash' }).toString();
    if (verbose) {
      console.log(`${new Date().toISOString()}: ${result}`);
    }
    return result;
  } catch (error) {
    if (!ignoreError) {
      throw error;
    } else if (verbose) {
      console.log(`Ignoring error during execCmd: ${error}`);
    }
  }
  return '';
};
