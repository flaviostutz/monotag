import { execSync } from 'child_process';

export const execCmd = (baseDir: string, commands: string, verbose?: boolean): string => {
  const lines = commands.split('\n');
  const cmd = lines.reduce((cur: string, line: string): string => {
    if (line.trim().startsWith('//') || line.trim() === '') {
      return cur;
    }
    return `${cur} && ${line}`;
  }, `cd ${baseDir}`);

  if (verbose) {
    console.log(`${new Date().toISOString()}: Executing on baseDir=${baseDir}`);
    console.log(`${new Date().toISOString()}: ${cmd}`);
  }
  const result = execSync(cmd).toString();
  if (verbose) {
    console.log(`${new Date().toISOString()}: ${result}`);
  }
  return result;
};
