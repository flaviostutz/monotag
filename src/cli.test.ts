/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
/* eslint-disable functional/no-let */
import * as fs from 'node:fs';
import { randomBytes } from 'node:crypto';

import { expandPathWithDefaults, run } from './cli';
import { createSampleRepo } from './utils/tests';
import { execCmd } from './utils/os';

// INTEGRATION TEST FOR MONOTAG

describe('when using cli', () => {
  /**
   * RUN ONLY ONE TEST AT A TIME
   * TO AVOID CONCURRENCY AT THE GIT
   * REPO LEVEL BECAUSE WE ARE MUTATING
   * THE REPO
   */

  it('should execute cli tests successfuly', async () => {
    const repoDir = `./testcases/cli-test-repo-${randomBytes(2).toString('hex')}`;
    await createSampleRepo(repoDir);

    // mock console.log to get results and check them
    // const originalLog = console.log;
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
    expect(stdout).toMatch(/^346\.0\.0/);
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
    expect(stdout).toMatch(/^prefix9\/v1.0.3/);
    expect(exitCode).toBe(0);

    // get release notes

    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--path=SOMETHING_INEXISTENT',
      '--separator=/v',
    ]);
    expect(stdout).toEqual('No changes detected and no previous tag found');
    expect(exitCode).toBe(4);

    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
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
      'tag',
      `--repo-dir=${repoDir}`,
      '--path=prefix9',
      '--separator=/v',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('prefix9/v1.0.3');

    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`, '--fromRef=HEAD~3']);
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
    expect(stdout).toMatch(/^346\.0\.0/);
    expect(exitCode).toBe(0);

    // get next tag for multiple path sources
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`, '--path=prefix1,prefix3']);
    expect(stdout).not.toMatch(/^346\.0\.0/); // should prefix tag with "prefix1"
    expect(stdout).toMatch(/^prefix1\//); // should prefix tag with "prefix1"
    expect(stdout).toMatch('9 prefix1 updating test1 and test2 files again for module prefix1');
    expect(stdout).toMatch('test: 88 prefix3 adding test1 ');
    expect(stdout).not.toMatch('chore: 13 prefix2 updating');
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
    expect(stdout).toMatch(/^346.0.0-alpha.0/);
    expect(stdout).not.toContain('adding test1 file to root');
    expect(stdout).toContain('15 adding test2');
    expect(stdout).toContain('2 prefix1 ');
    expect(exitCode).toBe(0);

    // get existing pre-release tag
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--prefix=prefix66/',
      '--prerelease=true',
      '--prerelease-identifier=beta',
    ]);
    expect(stdout).toMatch('prefix66/3.0.0-beta.0');
    expect(stdout).toContain('adding test1 file to root');
    expect(stdout).toContain('15 adding test2');
    expect(stdout).toContain('2 prefix1 ');
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
      '--notes-file=dist/notes1.md',
    ]);
    expect(stdout).toMatch(/.*Creating tag 346.0.0-alpha.0.*Tag created successfully.*/);
    expect(stdout).toContain('346.0.0-alpha.0');
    expect(stdout).toContain('## 346.0.0 (');
    expect(stdout).not.toContain('adding test1 file to root');
    expect(stdout).toContain('15 adding test2');
    expect(stdout).toContain('2 prefix1 ');
    expect(exitCode).toBe(0);

    // git tag as prerelease again without changes to see
    // if its idempodent (should return the same tag)
    // auto increment of pre-release is deactivated by default
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
      '--notes-file=dist/notes2.md',
    ]);
    expect(stdout).toContain('346.0.0-alpha.0');
    expect(stdout).toContain('## 346.0.0 (');
    expect(stdout).not.toContain('adding test1 file to root');
    expect(stdout).toContain('15 adding test2');
    expect(stdout).toContain('2 prefix1 ');

    const notesAlpha0 = stdout;
    const notes1Contents = execCmd('.', 'cat dist/notes1.md');
    const notes2Contents = execCmd('.', 'cat dist/notes2.md');
    expect(notes1Contents).toEqual(notes2Contents);

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

    expect(stdout).toMatch(/^346.0.0-alpha.0.*Tag already exists in repo$/s);
    expect(exitCode).toBe(0);

    // get tag/notes from latest generated version (alpha)
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    expect(stdout).toBe(notesAlpha0.replaceAll('-alpha.0', ''));

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
    // same release notes
    const stwm = stdout.replace(/.*Creating tag 346.0.0-alpha.1.*Tag created successfully.*/, '');
    expect(stwm).toBe(notesAlpha0.replaceAll('-alpha.0', '-alpha.1'));
    expect(exitCode).toBe(0);
    const notesAlpha1 = stwm;

    // check if the same release notes are generated for the final release in comparison to pre-release
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    expect(stdout).toEqual(notesAlpha0.replaceAll('-alpha.0', ''));
    expect(stdout).toEqual(notesAlpha1.replaceAll('-alpha.1', ''));
    expect(exitCode).toBe(0);

    // check if tag is current
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('346.0.0-alpha.1');
    expect(exitCode).toBe(0);

    // SIMULATE PRE-RELEASE FIX WORKFLOW
    // add more commits and tag new pre-release (simulating fixing an alpha release bug and generating a new version etc)
    stdout = '';
    execCmd(repoDir, 'echo "test fixing alpha.1 bug" > test-alpha');

    // should fail as the working tree is not clean (pending files to be commited)
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('the latest tag is not up to date');
    expect(exitCode).toBe(6);

    // should fail as the working tree is not clean (pending things to be commited)
    execCmd(repoDir, 'git add test-alpha');
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('the latest tag is not up to date');
    expect(exitCode).toBe(6);

    // commit the changes
    execCmd(repoDir, 'git commit -m "fix: 99 adding test-alpha file to root"');

    // should fail as the latest commit is not tagged
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('The latest tag is not up to date');
    expect(exitCode).toBe(5);

    // tag the new pre-release with the fixes
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag-git',
      `--repo-dir=${repoDir}`,
      '--prerelease=true',
      '--prerelease-identifier=alpha',
    ]);
    expect(stdout).toMatch(/.*Creating tag 346.0.1-alpha.0.*Tag created successfully.*/);
    expect(stdout).toMatch('## 346.0.1 (');
    // new commit for fixing alpha.1
    expect(stdout).toMatch('99 adding test-alpha file to root');
    // previous commits that also should be included in this version notes
    expect(stdout).toMatch('15 adding test2 file to root');
    expect(stdout).toMatch('**Breaking:** 4 prefix1 creating test3 file');
    expect(stdout).toMatch('**Breaking:** 12 prefix2');
    expect(stdout).toMatch('7 prefix2 creating test2');
    expect(stdout).toMatch('anyscope: 10 prefix2');
    expect(stdout).toMatch('13 prefix2 updating test1 and test2');
    expect(stdout).toMatch('test: 5 prefix2 adding test2');
    expect(stdout).toMatch('2 prefix1 updating test1');
    expect(exitCode).toBe(0);
    // check if notes were generated with similar contents, adding the commit for fixing the bug
    // expect(stdout).not.toEqual(notesAlpha0);

    const stwm2 = stdout.replace(/.*Creating tag 346.0.1-alpha.0.*Tag created successfully.*/, '');
    const notesAlpha10 = stwm2;

    // shouldn't fail as it was just tagged
    stdout = '';
    exitCode = await run(['', '', 'current', `--repo-dir=${repoDir}`]);
    expect(stdout).toMatch('346.0.1-alpha.0');
    expect(exitCode).toBe(0);

    // check if final release notes are similar to the latest pre-release notes
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`]);
    expect(stdout).toEqual(notesAlpha10.replaceAll('-alpha.0', ''));
    expect(exitCode).toBe(0);

    // notes links
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--url-commit=https://myrepo/commits/',
    ]);
    expect(stdout).toMatch('## 346.0.1 (');
    expect(stdout).toMatch(
      /15 adding test2 file to root \[\[.{7}]\(https:\/\/myrepo\/commits\/.*\)]/,
    );
    expect(exitCode).toBe(0);

    // no notes links
    stdout = '';
    exitCode = await run(['', '', 'tag', `--repo-dir=${repoDir}`, '--no-links=true']);
    expect(stdout).toMatch('## 346.0.1 (');
    expect(stdout).not.toMatch(/https/);
    expect(exitCode).toBe(0);

    // bump package.json
    // create sample file that will be bumped
    fs.writeFileSync(`${repoDir}/packagerr.json`, '{"version":"0.0.1"}', { encoding: 'utf8' });
    fs.writeFileSync(`${repoDir}/mypro.toml`, '[main]\nversion="0.0.1"', { encoding: 'utf8' });
    // bump the file
    stdout = '';
    exitCode = await run([
      '',
      '',
      'tag',
      `--repo-dir=${repoDir}`,
      '--bump-action=latest',
      '--prerelease=true',
      '--prerelease-identifier=alpha',
      '--bump-files=packagerr.json,mypro.toml',
    ]);
    expect(exitCode).toBe(0);

    // this command will fail if content is not updated in files
    execCmd(repoDir, 'cat packagerr.json | grep 346.0.1-alpha.0');
    execCmd(repoDir, 'cat mypro.toml | grep 346.0.1-alpha.0');

    stdout = '';
    const rr = async (): Promise<void> => {
      await run(['', '', 'tag-push', `--repo-dir=${repoDir}`, '--fromRef=HEAD~999']);
    };
    await expect(rr).rejects.toThrow('Command failed: git rev-parse HEAD~999');

    // eslint-disable-next-line require-atomic-updates
    stdout = '';
    const rr1 = async (): Promise<void> => {
      await run(['', '', 'tag-push', `--repo-dir=${repoDir}`, '--fromRef=HEAD~5']);
    };
    await expect(rr1).rejects.toThrow();
  });
});

describe('expandPathWithDefaults', () => {
  it('should detect relative current dir when path is auto', () => {
    const repo = '/repo';
    const current = '/repo/services/app';
    const result = expandPathWithDefaults([''], repo, current);
    expect(result).toEqual(['services/app']);
    const result2 = expandPathWithDefaults(['./'], repo, current);
    expect(result2).toEqual(['services/app']);
    const result3 = expandPathWithDefaults(['.'], repo, current);
    expect(result3).toEqual(['services/app']);
  });

  it('should return empty if current dir is outside repo', () => {
    const repo = '/repo';
    const current = '/other/app';
    const result = expandPathWithDefaults(['.'], repo, current);
    expect(result).toEqual(['']);
    const result2 = expandPathWithDefaults([''], repo, current);
    expect(result2).toEqual(['']);
  });

  it('should handle relative paths', () => {
    const repo = '/repo';
    const current = '/repo/src';
    const result = expandPathWithDefaults(['../test'], repo, current);
    expect(result).toEqual(['test']);
  });

  it('should handle relative paths multiple', () => {
    const repo = '/repo';
    const current = '/repo/src';
    const result = expandPathWithDefaults(['../test', '..'], repo, current);
    expect(result).toEqual(['test', '']);
  });
});
