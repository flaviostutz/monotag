/* eslint-disable no-undefined */
/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
import { randomBytes } from 'node:crypto';

import {
  findCommitsForLatestTag,
  findCommitsTouchingPath,
  gitConfigUser,
  lastTagForPrefix,
} from './git';
import { execCmd } from './utils/os';
import { createSampleRepo } from './utils/tests';

describe('when using git', () => {
  const repoDir = `./testcases/git-test-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(() => {
    createSampleRepo(repoDir);
  });
  it('should get latest tag for prefix1', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix1/' });
    expect(ltag).toBe('prefix1/3.4.5-alpha');
  });
  it('should get the 2nd latest tag for prefix1', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix1/', nth: 1 });
    expect(ltag).toBe('prefix1/3.3.5');
  });
  it('should get latest tag for prefix1 -', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix9-' });
    expect(ltag).toBe('prefix9-1.0.1');
  });
  it('should get latest tag for prefix2', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix2/' });
    expect(ltag).toBe('prefix2/20.10.0');
  });
  it('should get latest tag for prefix2 in range from', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix2/', fromRef: 'HEAD~12' });
    expect(ltag).toBe('prefix2/20.10.0');
  });
  it('should get latest tag for prefix2 in range to', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix2/', toRef: 'HEAD~10' });
    expect(ltag).toBe('prefix2/10.0.1');
  });
  it('should get latest tag for prefix2 in range from...to', () => {
    const ltag = lastTagForPrefix({
      repoDir,
      tagPrefix: 'prefix2/',
      fromRef: 'HEAD~10',
      toRef: 'HEAD~9',
    });
    expect(ltag).toBe('prefix2/10.10.0');
  });
  it('should get latest tag for prefix2 in range from...to same ref', () => {
    const ltag = lastTagForPrefix({
      repoDir,
      tagPrefix: 'prefix2/',
      fromRef: 'HEAD~9',
      toRef: 'HEAD~9',
    });
    expect(ltag).toBe('prefix2/10.10.0');
  });
  it('should get latest tag for prefix2 in range root...to HEAD~10', () => {
    const ltag = lastTagForPrefix({
      repoDir,
      tagPrefix: 'prefix2/',
      toRef: 'HEAD~10',
    });
    expect(ltag).toBe('prefix2/10.0.1');
  });
  it('should get latest tag for prefix2 in range root...to HEAD~9', () => {
    const ltag = lastTagForPrefix({
      repoDir,
      tagPrefix: 'prefix2/',
      toRef: 'HEAD~9',
    });
    expect(ltag).toBe('prefix2/10.10.0');
  });
  it('should get latest tag for prefix2 in first commit should be empty', () => {
    const ltag = lastTagForPrefix({
      repoDir,
      tagPrefix: 'prefix2/',
      fromRef: 'HEAD~16',
      toRef: 'HEAD~16',
    });
    expect(ltag).toBeUndefined();
  });
  it('should get latest tag for prefix2 in range from (first commit)...to', () => {
    const ltag = lastTagForPrefix({
      repoDir,
      tagPrefix: 'prefix1/',
      fromRef: 'HEAD~16',
      toRef: 'HEAD~13',
    });
    expect(ltag).toBe('prefix1/1.10.0');
  });
  it('should get latest tag for prefix9/v', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix9/v' });
    expect(ltag).toBe('prefix9/v1.0.3');
  });
  it('should return null if no tag found', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'pref' });
    expect(ltag).toBeUndefined();
  });
  it('should return null if no tag found for prefix99', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: 'prefix99/' });
    expect(ltag).toBeUndefined();
  });
  it('should get latest tag for empty prefix', () => {
    const ltag = lastTagForPrefix({ repoDir, tagPrefix: '' });
    expect(ltag).toEqual('345.2123.143');
  });
  it('should return zero commits for inexisting path', () => {
    const clogs = findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~9',
      toRef: 'HEAD',
      paths: ['inexistentModule'],
    });
    expect(clogs).toHaveLength(0);
  });
  it('should fail if git command fails', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    expect((): void => {
      findCommitsTouchingPath({
        repoDir,
        fromRef: 'HEAD~9999',
        toRef: 'HEAD',
        paths: [''],
      });
    }).toThrow('failed');
  });
  it('should return commits related to prefix1 path', () => {
    const clogs = findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~16',
      toRef: 'HEAD',
      paths: ['prefix1'],
    });
    expect(clogs).toHaveLength(7);
    expect(clogs.filter((cl) => cl.message.includes('prefix1'))).toHaveLength(7);
    expect(clogs.filter((cl) => cl.message.includes('prefix2'))).toHaveLength(1);
  });
  it('should return commits related to prefix2 path', () => {
    const clogs = findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~12',
      toRef: 'HEAD',
      paths: ['prefix2'],
    });
    expect(clogs).toHaveLength(8);
    expect(clogs.filter((cl) => cl.message.includes('prefix2'))).toHaveLength(8);
    expect(clogs.filter((cl) => cl.message.includes('prefix1'))).toHaveLength(1);
  });
  it('should return commits related to prefix1 and prefix2 path', () => {
    const clogs = findCommitsTouchingPath({
      repoDir,
      toRef: 'HEAD',
      paths: ['prefix1', 'prefix3'],
    });
    expect(clogs).toHaveLength(8);
    expect(clogs.filter((cl) => cl.message.includes('prefix1'))).toHaveLength(7);
    expect(clogs.filter((cl) => cl.message.includes('prefix3'))).toHaveLength(1);
  });
  it('should return commits related to prefix1 and prefix2 path using clob', () => {
    const clogs = findCommitsTouchingPath({
      repoDir,
      toRef: 'HEAD',
      paths: ['prefix1/**/test4', 'prefix3/testINEXISTENT', 'prefix2/test2'],
    });
    expect(clogs).toHaveLength(3);
    expect(clogs.filter((cl) => cl.message.includes('prefix1'))).toHaveLength(1);
    expect(clogs.filter((cl) => cl.message.includes('prefix3'))).toHaveLength(0);
    expect(clogs.filter((cl) => cl.message.includes('prefix2'))).toHaveLength(3);
  });
  it('should return last 5 commits', () => {
    const clogs = findCommitsTouchingPath({
      repoDir,
      fromRef: 'HEAD~6',
      toRef: 'HEAD',
      paths: [''],
    });
    expect(clogs).toHaveLength(7);
    expect(clogs[0].message).toMatch('9 ');
    expect(clogs[1].message).toMatch('10 ');
    expect(clogs[2].message).toMatch('11 ');
    expect(clogs[3].message).toMatch('12 ');
    expect(clogs[4].message).toMatch('13 ');
    expect(clogs[5].message).toMatch('14 ');
    expect(clogs[6].message).toMatch('15 ');
  });

  it('find commits related to the latest tag', () => {
    const clogs = findCommitsForLatestTag({
      repoDir,
      paths: ['prefix2'],
      tagPrefix: 'prefix2/',
      fromRef: 'HEAD~16',
      toRef: 'HEAD~9',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('7 prefix2 creating');
  });
  it('latest tag in root have only one commit because its in the beginning of the history', () => {
    const commits = findCommitsForLatestTag({
      repoDir,
      paths: [''],
      tagPrefix: '',
    });
    expect(commits).toHaveLength(1);
  });
});
describe('gitConfigUser', () => {
  const repoDir = `./testcases/gitconfig-repo-${randomBytes(4).toString('hex')}`;
  beforeAll(() => {
    createSampleRepo(repoDir);
  });
  it('verify configured git user', () => {
    // this is done in sequence because it cannot run in parallel with the same repo and
    // we don't want to create multiple sample git repos for this

    // unset configured user and email
    // eslint-disable-next-line functional/no-try-statements
    execCmd(repoDir, 'git config --unset user.name', false, true);
    execCmd(repoDir, 'git config --unset user.email', false, true);
    execCmd(repoDir, 'git config --unset --global user.name', false, true);
    execCmd(repoDir, 'git config --unset --global user.email', false, true);

    expect(() => gitConfigUser(repoDir, undefined, 'some@user.com')).toThrow(
      'git username is required',
    );
    expect(() => gitConfigUser(repoDir, 'username', '')).toThrow('git email is required');

    // unset configured user and email
    execCmd(repoDir, 'git config --unset user.name', false, true);
    execCmd(repoDir, 'git config --unset user.email', false, true);

    gitConfigUser(repoDir, 'testUser', 'testUser@myemail.com');

    const outUser = execCmd(repoDir, 'git config user.name', false).trim();
    const outEmail = execCmd(repoDir, 'git config user.email', false).trim();

    expect(outUser).toBe('testUser');
    expect(outEmail).toBe('testUser@myemail.com');
  });
});
