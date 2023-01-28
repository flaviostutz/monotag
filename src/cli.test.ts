import { run } from './cli';
import { createSampleRepo } from './utils/createSampleRepo';

describe('when using cli', () => {
  const repoDir = './testcases/clirepo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should execute cli tests successfuly', async () => {
    // mock console.log to get results and check them
    let stdout = '';
    console.log = (log): void => {
      stdout += log;
    };

    // run tests below sequentially to avoid issues with console.log mocking

    // invalid action
    stdout = '';
    let exitCode = await run(['', '', 'invalidaction', '-v']);
    expect(stdout).toMatch(/help/);
    expect(exitCode).toBe(1);

    // get next tag
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`, '-v']);
    expect(stdout).toMatch('30.0.1');
    expect(exitCode).toBe(0);

    // get release notes
    stdout = '';
    exitCode = await run(['', '', 'notes', `--repo-dir=${repoDir}`, '--fromRef=HEAD~3', '-v']);
    expect(stdout).toMatch('Refs: closes #45');
    expect(stdout).toMatch('Maintenance:');
    expect(exitCode).toBe(0);

    // generate tag in git repo and tag it
    stdout = '';
    exitCode = await run(['', '', 'tag-git', `--repo-dir=${repoDir}`, '--fromRef=HEAD~3', '-v']);
    expect(stdout).toMatch(/.*Creating tag 30.0.1.*Tag created successfully.*/);
    expect(exitCode).toBe(0);

    // generate tag in git repo and tag it
    stdout = '';
    const rr = async (): Promise<void> => {
      await run(['', '', 'tag-push', `--repo-dir=${repoDir}`, '--fromRef=HEAD~999']);
    };
    await expect(rr).rejects.toThrow(
      "fatal: ambiguous argument 'HEAD~999..HEAD': unknown revision or path not in the working tree",
    );
  });
});
