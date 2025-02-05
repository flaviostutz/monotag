/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-let */
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
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    expect(stdout).toEqual('346.0.0');
    expect(exitCode).toBe(0);

    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('346.0.0');
    expect(exitCode).toBe(0);

    // get next tag for custom prefix separator
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--path=prefix9',
      '--separator=/v',
    ]);
    expect(stdout).toEqual('prefix9/v1.0.3');
    expect(exitCode).toBe(0);

    // get next tag prefix2 dir
    // stdout = '';
    // exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    // expect(stdout).toEqual('prefix2-1.0.0');
    // expect(exitCode).toBe(0);

    // get release notes

    stdout = '';
    exitCode = await run([
      '',
      '',
      'notes',
      `--repo-dir=${repoDir}`,
      '--path=SOMETHING_INEXISTENT',
      '--separator=/v',
    ]);
    expect(stdout).toEqual('No changes detected and no previous tag found');
    expect(exitCode).toBe(4);

    stdout = '';
    exitCode = await run(['', '', 'notes', `--repo-dir=${repoDir}`]);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch('346.0.0 (');
    expect(stdout).toMatch('### Features');
    expect(stdout).toMatch('* 7 prefix2 creating test2 file');
    expect(stdout).toMatch('### Bug Fixes');
    expect(stdout).toMatch('user-ui: 9 prefix1');
    expect(stdout).toMatch('### Info');

    // min version
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`, '--min-version=400.1']);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch('400.1.0');

    // max version (should fail if more than max version)
    stdout = '';
    const mvc = async (): Promise<void> => {
      await run(['', '', 'tag', `--repo-dir=${repoDir}`, '--max-version=1']);
    };
    await expect(mvc).rejects.toThrow('Generated tag version 346.0.0 is greater than 1');

    stdout = '';
    exitCode = await run([
      '',
      '',
      'notes',
      `--repo-dir=${repoDir}`,
      '--path=prefix9',
      '--separator=/v',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toEqual('');

    stdout = '';
    exitCode = await run(['', '', 'notes', `--repo-dir=${repoDir}`, '--fromRef=HEAD~3']);
    expect(stdout).toMatch('Refs: closes #45');
    expect(stdout).toMatch('## Features');
    expect(exitCode).toBe(0);

    // get latest tag
    stdout = '';
    exitCode = await run(['', '', 'latest', `--repo-dir=${repoDir}`]);
    expect(stdout).toEqual('345.2123.143');
    expect(exitCode).toBe(0);

    // get current tag
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toContain('The latest tag is not up to date');
    expect(exitCode).toBe(5);

    // get next tag
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    expect(stdout).toEqual('346.0.0');
    expect(exitCode).toBe(0);

    // get next tag as prerelease
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
    ]);
    expect(stdout).toEqual('346.0.0-alpha.0');
    expect(exitCode).toBe(0);

    // git tag as prerelease
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag-git',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
    ]);
    expect(stdout).toMatch(/.*Creating tag 346.0.0-alpha.0.*Tag created successfully.*/);
    expect(exitCode).toBe(0);

    // git tag as prerelease again without changes to see
    // if its idempodent (should be the same)
    // auto increment of pre-release is deactivated by default
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag-git',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
    ]);
    expect(stdout).toEqual('346.0.0-alpha.0Tag already exists in repo');
    expect(exitCode).toBe(0);

    // git tag prerelease again without changes
    // but this time forcing the increment
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag-git',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
      '--prerelease-increment',
    ]);
    expect(stdout).toMatch(/.*Creating tag 346.0.0-alpha.1.*Tag created successfully.*/);
    expect(exitCode).toBe(0);

    // get current tag
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('346.0.0-alpha.1');
    expect(exitCode).toBe(0);

    // check if notes were generated getting inherating
    // commits from previous tags that had actual changes
    stdout = '';
    exitCode = await run(['', '', 'notes', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('## 346.0.0 (');
    expect(stdout).toMatch('15 adding test2 file to root');
    expect(stdout).toMatch('**Breaking:** 4 prefix1 creating test3 file');
    expect(exitCode).toBe(0);

    // these were failing on CI/CD but not locally (maybe due to race conditions)
    // // generate tag in git repo and tag it
    // stdout = '';
    // exitCode = await run(['', '', 'tag-git', `--repo-dir=${repoDir}`, '--suffix=-alpha']);
    // expect(stdout).toMatch(/.*Creating tag 30.0.1-alpha.*Tag created successfully.*/);
    // expect(exitCode).toBe(0);

    // // generate tag in git repo and tag it
    // stdout = '';
    // const rr2 = async (): Promise<void> => {
    //   await run(['', '', 'tag-git', `--repo-dir=${repoDir}`, '--suffix=-alpha']);
    // };
    // await expect(rr2).rejects.toThrow('already exists');

    // generate tag in git repo and tag it

    stdout = '';
    const rr = async (): Promise<void> => {
      await run(['', '', 'tag-push', `--repo-dir=${repoDir}`, '--fromRef=HEAD~999']);
    };
    await expect(rr).rejects.toThrow(
      "fatal: ambiguous argument 'HEAD~999..HEAD': unknown revision or path not in the working tree",
    );

    // eslint-disable-next-line require-atomic-updates
    stdout = '';
    const rr1 = async (): Promise<void> => {
      await run(['', '', 'tag-push', `--repo-dir=${repoDir}`, '--fromRef=HEAD~5']);
    };
    await expect(rr1).rejects.toThrow("fatal: 'origin' does not appear to be a git repository");
  });
  it('should use custom separator successfully', async () => {
    // mock console.log to get results and check them
    let stdout = '';
    console.log = (log): void => {
      stdout += log;
    };

    stdout = '';
    const exitCode = await run([
      '',
      '',
      'latest',
      `--repo-dir=${repoDir}`,
      '--path=prefix9',
      '--separator=/v',
    ]);
    expect(stdout).toEqual('prefix9/v1.0.3');
    expect(exitCode).toBe(0);
  });
});
