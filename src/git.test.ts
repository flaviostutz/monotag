/* eslint-disable no-undefined */
/* eslint-disable no-console */
/* eslint-disable functional/immutable-data */
import { randomBytes } from 'node:crypto';

import { gitConfigUser, lastTagForPrefix } from './git';
import { execCmd } from './utils/os';
import { createSampleRepo } from './utils/tests';

describe('when using git', () => {
  const repoDir = `./testcases/git-test-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('should get latest tag for prefix1', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'prefix1/' });
    expect(ltag).toBe('prefix1/3.4.5-alpha');
  });
  it('should get the 2nd latest tag for prefix1', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'prefix1/', nth: 1 });
    expect(ltag).toBe('prefix1/3.3.5');
  });
  it('should get latest tag for prefix1 -', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = (): void => {};
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'prefix9-' });
    expect(ltag).toBe('prefix9-1.0.1');
  });
  it('should get latest tag for prefix2', async () => {
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'prefix2/' });
    expect(ltag).toBe('prefix2/20.10.0');
  });
  it('should get latest tag for prefix9/v', async () => {
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'prefix9/v' });
    expect(ltag).toBe('prefix9/v1.0.3');
  });
  it('should return null if no tag found', async () => {
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'pref' });
    expect(ltag).toBeUndefined();
  });
  it('should return null if no tag found for prefix99', async () => {
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: 'prefix99/' });
    expect(ltag).toBeUndefined();
  });
  it('should get latest tag for empty prefix', async () => {
    const ltag = await lastTagForPrefix({ repoDir, tagPrefix: '' });
    expect(ltag).toEqual('345.2123.143');
  });
});
describe('gitConfigUser', () => {
  const repoDir = `./testcases/gitconfig-repo-${randomBytes(4).toString('hex')}`;
  beforeAll(async () => {
    await createSampleRepo(repoDir);
  });
  it('verify configured git user', async () => {
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
