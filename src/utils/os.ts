/* eslint-disable no-console */
import { execSync } from 'node:child_process';

export const execCmd = (baseDir: string, shellScript: string, verbose?: boolean): string => {
  if (verbose) {
    console.log(`${new Date().toISOString()}: Executing on baseDir=${baseDir}`);
    console.log(`${new Date().toISOString()}: ${shellScript}`);
  }
  const result = execSync(shellScript, { cwd: baseDir, shell: '/bin/bash' }).toString();
  if (verbose) {
    console.log(`${new Date().toISOString()}: ${result}`);
  }
  return result;
};
