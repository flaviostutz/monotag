/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-let */
import { execSync } from 'node:child_process';

import { run } from './cli';
import { createSampleRepo } from './utils/tests';

describe('when using cli', () => {
  const repoDir = './testcases/cli-test-repo';
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });

  /**
   * RUN ONLY ONE TEST AT A TIME
   * TO AVOID CONCURRENCY AT THE GIT
   * REPO LEVEL BECAUSE WE ARE MUTATTING
   * THE REPO
   */

  it('should execute cli tests successfuly', async () => {
    // mock console.log to get results and check them
    const originalLog = console.log;
    let stdout = '';
    console.log = (log): void => {
      stdout += log;
    };

    stdout = '';
    let exitCode = await run([
      '',
      '',
      'latest',
      `--repo-dir=${repoDir}`,
      '--path=prefix9',
      '--separator=/v',
    ]);
    expect(stdout).toEqual('prefix9/v1.0.3');
    expect(exitCode).toBe(0);

    // mock console.log to get results and check them
    stdout = '';
    console.log = (log): void => {
      stdout += log;
    };

    // run tests below sequentially to avoid issues with console.log mocking

    // invalid action
    stdout = '';
    exitCode = await run(['', '', 'invalidaction', '-v']);
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

    /**
     * MUTATING COMMANDS ARE FAILING ONLY ON CI/CD (but works on dev machine)
     * We discovered that the git log command returns the same list of commits in
     * gh actions, but in a different order (probably becuse the commits are generated in the same second or minute). This is probably why the tests are failing.
     */
    // TODO [2025-06-01] re-enable these tests on CI/CD
    // eslint-disable-next-line no-process-env
    // if (process.env.CI) {
    //   console.log("Skipping tests that mutate the repo because they're failing on CI/CD");
    //   return;
    // }

    originalLog('>>>>>>>>>>git log1');
    originalLog(
      execSync(
        'git log --no-walk --tags --pretty="%h %d %s" --decorate=full > log1.txt && cat log1.txt',
        { cwd: repoDir },
      ).toString(),
    );
    originalLog('>>>>>>>>>>git log1 XXX');
    originalLog(
      execSync(
        `git log --pretty=format:"%H" | head -n 30 | xargs -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
        { cwd: repoDir },
      ).toString(),
    );
    originalLog('>>>>>>>>>>git log1');

    // git tag as prerelease
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag-git',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
      '--notes-file=dist/notes1.md',
    ]);
    expect(stdout).toMatch(/.*Creating tag 346.0.0-alpha.0.*Tag created successfully.*/);
    expect(exitCode).toBe(0);

    // git tag as prerelease again without changes to see
    // if its idempodent (should return the same tag)
    // auto increment of pre-release is deactivated by default
    stdout = '';
    exitCode = await run([
      '',
      '',
      'notes',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
      '--notes-file=dist/notes2.md',
    ]);

    // check if note files were generated and are the same
    originalLog('>>>>>>>>>>git log2');
    originalLog(
      execSync(
        'git log --no-walk --tags --pretty="%h %d %s" --decorate=full > log2.txt && cat log2.txt',
        { cwd: repoDir },
      ).toString(),
    );
    originalLog('>>>>>>>>>>git log2 XXX');
    originalLog(
      execSync(
        `git log --pretty=format:"%H" | head -n 30 | xargs -L 1 git show --name-only --pretty='format:COMMIT;%H;%cn <%ce>;%ci;%s;'`,
        { cwd: repoDir },
      ).toString(),
    );
    originalLog('>>>>>>>>>>git log2');
    originalLog('>>>>>>>>>>notes1.md');
    originalLog(execSync('cat dist/notes1.md').toString());
    originalLog('>>>>>>>>>>notes1.md');
    originalLog('>>>>>>>>>>notes2.md');
    originalLog(execSync('cat dist/notes2.md').toString());
    originalLog('>>>>>>>>>>notes2.md');
    await execSync('diff dist/notes1.md dist/notes2.md');

    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag-git',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
      '--notes-file=dist/notes2.md',
    ]);

    expect(stdout).toEqual('346.0.0-alpha.0Tag already exists in repo');
    expect(exitCode).toBe(0);

    // get notes from latest generated version (alpha)
    stdout = '';
    exitCode = await run(['', '', 'notes', `--repo-dir=${repoDir}`]);
    const notesAlpha = stdout;

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

    // check if notes were generated getting inherated
    // commits from previous tags that had actual changes
    stdout = '';
    exitCode = await run(['', '', 'notes', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('## 346.0.0 (');
    expect(stdout).toMatch('15 adding test2 file to root');
    expect(stdout).toMatch('**Breaking:** 4 prefix1 creating test3 file');
    expect(exitCode).toBe(0);

    // check if notes were generated exactly with the same contents
    // from previous tags with the same actual changes (related to the same commitid)
    expect(notesAlpha).toEqual(stdout);

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
});
