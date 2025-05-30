import { randomBytes } from 'node:crypto';

import { Commit } from './types/commits';
import {
  getDateFromCommit,
  movePrefixFromCommitLog,
  resolveCommitsForTag,
  semverGreaterThan,
  summarizeCommits,
} from './commits';
import { createSampleRepo } from './utils/tests';

describe('getDateFromCommit', () => {
  it('should extract the date from a string with date and time', () => {
    const input = '2023-10-05 14:48:00.000Z';
    const expectedOutput = '2023-10-05';
    expect(getDateFromCommit(input)).toBe(expectedOutput);
  });

  it('should return an empty string if no date is found', () => {
    const input = 'No date here';
    const expectedOutput = '';
    expect(getDateFromCommit(input)).toBe(expectedOutput);
  });

  it('should handle strings with multiple dates and return the first one', () => {
    const input = '2023-10-05 14:48:00.000Z and 2023-11-06T15:49:00.000Z';
    const expectedOutput = '2023-10-05';
    expect(getDateFromCommit(input)).toBe(expectedOutput);
  });

  it('should handle strings with only a date', () => {
    const input = '2023-10-05';
    const expectedOutput = '2023-10-05';
    expect(getDateFromCommit(input)).toBe(expectedOutput);
  });

  it('should return an empty string for an empty input', () => {
    const input = '';
    const expectedOutput = '';
    expect(getDateFromCommit(input)).toBe(expectedOutput);
  });
});

describe('summarizeCommits', () => {
  it('should summarize commits correctly', () => {
    const commits: Commit[] = [
      {
        id: '4',
        author: 'Author 44',
        date: '2023-01-04',
        message: 'docs: update documentation',
        files: ['file4.ts'],
      },
      {
        id: '3',
        author: 'Author 33',
        date: '2023-01-03',
        message: 'chore: update dependencies',
        files: ['file3.ts'],
      },
      {
        id: '5',
        author: 'Author 44',
        date: '2023-01-05',
        message: 'feat!: add breaking change',
        files: ['file5.ts'],
      },
      {
        id: '1',
        author: 'Author 11',
        date: '2023-01-01',
        message: 'feat: add new feature',
        files: ['file1.ts'],
      },
      {
        id: '2',
        author: 'Author 22',
        date: '2023-01-02',
        message: 'fix: fix bug',
        files: ['file2.ts'],
      },
      {
        id: '6',
        author: 'Author 22',
        date: '2023-01-04',
        message: 'MERGED FROM 123: fix: fix second bug',
        files: ['file2.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.features.map((cd) => cd.commit)).toMatchObject([
      { id: '5', author: 'Author 44', date: '2023-01-05', message: 'feat!: add breaking change' },
      { id: '1', author: 'Author 11', date: '2023-01-01', message: 'feat: add new feature' },
    ]);
    expect(summary.fixes.map((cd) => cd.commit)).toMatchObject([
      { id: '2', author: 'Author 22', date: '2023-01-02', message: 'fix: fix bug' },
      {
        id: '6',
        author: 'Author 22',
        date: '2023-01-04',
        message: 'MERGED FROM 123: fix: fix second bug',
      },
    ]);
    expect(summary.maintenance.map((cd) => cd.commit)).toMatchObject([
      { id: '3', author: 'Author 33', date: '2023-01-03', message: 'chore: update dependencies' },
    ]);
    expect(summary.nonConventional.map((cd) => cd.commit)).toMatchObject([
      { id: '4', author: 'Author 44', date: '2023-01-04', message: 'docs: update documentation' },
    ]);
    expect(summary.notes).toEqual([]);
    expect(summary.level).toEqual('major');
    expect(summary.authors).toEqual(['Author 11', 'Author 22', 'Author 33', 'Author 44']);
    expect(summary.references).toEqual([]);
  });

  it('should handle commits with breaking changes in notes', () => {
    const commits: Commit[] = [
      {
        id: '1',
        author: 'Author One',
        date: '2023-01-01',
        message: 'feat: add new feature\n\nBREAKING CHANGES: new API',
        files: ['file1.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.features).toMatchObject([
      {
        commit: {
          id: '1',
          author: 'Author One',
          date: '2023-01-01',
          message: `feat: add new feature

BREAKING CHANGES: new API`,
        },
      },
    ]);
    expect(summary.level).toEqual('major');
    expect(summary.notes).toEqual(['BREAKING CHANGES: new API']);
  });

  it('should handle minor changes', () => {
    const commits: Commit[] = [
      {
        id: '1',
        author: 'Author One',
        date: '2023-01-01',
        message: 'feat: add new feature',
        files: ['file1.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.features).toMatchObject([
      {
        commit: {
          id: '1',
          author: 'Author One',
          date: '2023-01-01',
          message: 'feat: add new feature',
        },
      },
    ]);
    expect(summary.level).toEqual('minor');
  });

  it('should handle basic changes', () => {
    const commits: Commit[] = [
      {
        id: '1',
        author: 'Author One',
        date: '2023-01-01',
        message: 'fix: fix something',
        files: ['file1.ts'],
      },
      {
        id: '2',
        author: 'Author One',
        date: '2023-01-02',
        message: 'chore: chore something',
        files: ['file1.ts'],
      },
      {
        id: '3',
        author: 'Author One',
        date: '2023-01-03',
        message: 'feat: feat something',
        files: ['file1.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.fixes).toMatchObject([
      {
        commit: {
          id: '1',
          author: 'Author One',
          date: '2023-01-01',
          message: 'fix: fix something',
        },
      },
    ]);
    expect(summary.level).toEqual('minor');
  });

  it('should handle random changes correctly', () => {
    const commits: Commit[] = [
      {
        id: '1',
        author: 'Author One',
        date: '2023-01-01',
        message: 'feat!: major something',
        files: ['file1.ts'],
      },
      {
        id: '2',
        author: 'Author One',
        date: '2023-01-02',
        message: 'chore: chore something',
        files: ['file1.ts'],
      },
      {
        id: '3',
        author: 'Author One',
        date: '2023-01-03',
        message: 'feat: feat something',
        files: ['file1.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.fixes).toEqual([]);
    expect(summary.features).toMatchObject([
      {
        commit: {
          id: '1',
          author: 'Author One',
          date: '2023-01-01',
          message: 'feat!: major something',
        },
      },
      {
        commit: {
          id: '3',
        },
      },
    ]);
    expect(summary.level).toEqual('major');
  });

  it('should handle changes', () => {
    const commits: Commit[] = [
      {
        id: '1',
        author: 'Author One',
        date: '2023-01-01',
        message: 'non conventional change',
        files: ['file1.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.nonConventional).toMatchObject([
      { commit: { id: '1', message: 'non conventional change' } },
    ]);
    expect(summary.level).toEqual('patch');
  });
});
describe('semverGreaterThan', () => {
  it('should return false when both semver levels are equal', () => {
    expect(semverGreaterThan('major', 'major')).toBe(false);
    expect(semverGreaterThan('minor', 'minor')).toBe(false);
    expect(semverGreaterThan('patch', 'patch')).toBe(false);
  });

  it('should return true when major is compared to anything else', () => {
    expect(semverGreaterThan('major', 'minor')).toBe(true);
    expect(semverGreaterThan('major', 'patch')).toBe(true);
    expect(semverGreaterThan('major', 'none')).toBe(true);
  });

  it('should return true when minor is compared to patch', () => {
    expect(semverGreaterThan('minor', 'patch')).toBe(true);
  });

  it('should return false in other minor comparisons', () => {
    expect(semverGreaterThan('minor', 'major')).toBe(false);
    expect(semverGreaterThan('none', 'major')).toBe(false);
  });

  it('should return false for patch in any comparison except itself', () => {
    expect(semverGreaterThan('patch', 'major')).toBe(false);
    expect(semverGreaterThan('patch', 'minor')).toBe(false);
    expect(semverGreaterThan('patch', 'none')).toBe(true);
  });
});

describe('movePrefixFromCommitLog', () => {
  it('should return the same string if no conventional commit is found', () => {
    const input = 'Just a random commit message';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });

  it('should move prefix to the end when conventional commit is found', () => {
    const input = 'PREFIX-123 feat: add feature';
    const expected = 'feat: add feature (PREFIX-123)';
    expect(movePrefixFromCommitLog(input)).toBe(expected);
  });

  it('should remove non-alphanumeric characters from the prefix', () => {
    const input = '[PROJ-1]! fix: fix error';
    const expected = 'fix: fix error (PROJ-1)';
    expect(movePrefixFromCommitLog(input)).toBe(expected);
  });

  it('should not add parentheses if no prefix remains after cleaning', () => {
    const input = '!!! feat(something): new stuff';
    const expected = 'feat(something): new stuff';
    expect(movePrefixFromCommitLog(input)).toBe(expected);
  });

  it('should correctly handle multiple words in the prefix', () => {
    const input = 'MY PROJECT 2023 fix: correct the bug';
    const expected = 'fix: correct the bug (MY PROJECT 2023)';
    expect(movePrefixFromCommitLog(input)).toBe(expected);
  });

  it('should handle "feat: something to break"', () => {
    const input = 'feat: something to break';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });

  it('should handle "chore(main): doing that!!"', () => {
    const input = 'chore(main): doing that!!';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });

  it('should handle "feat!: another one"', () => {
    const input = 'feat!: another one';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });

  it('should handle "feat(test)!: another two"', () => {
    const input = 'feat(test)!: another two';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });

  it('should handle "MERGED HERE chore(abc)!: abracadabra"', () => {
    const input = 'MERGED HERE chore(abc)!: abracadabra';
    expect(movePrefixFromCommitLog(input)).toBe('chore(abc)!: abracadabra (MERGED HERE)');
  });

  it('should handle "MERGED THERE 123! fix: abracadabra"', () => {
    const input = 'MERGED THERE 123! fix: abracadabra';
    expect(movePrefixFromCommitLog(input)).toBe('fix: abracadabra (MERGED THERE 123)');
  });

  it('should handle "Merged PR 123: feat(my-service): call Lambda"', () => {
    const input = 'Merged PR 123: feat(my-service): call Lambda';
    expect(movePrefixFromCommitLog(input)).toBe('feat(my-service): call Lambda (Merged PR 123)');
  });

  it('should handle "MERGED FROM 123: fix: fix bug fix: abc"', () => {
    const input = 'MERGED FROM 123: fix: fix bug fix: abc';
    expect(movePrefixFromCommitLog(input)).toBe('fix: fix bug fix: abc (MERGED FROM 123)');
  });

  it('should handle "Merge pull request #69 fix(wso2): deployment when needed"', () => {
    const input = 'Merge pull request #69 fix(wso2): deployment when needed';
    expect(movePrefixFromCommitLog(input)).toBe(
      'fix(wso2): deployment when needed (Merge pull request #69)',
    );
  });

  it('should handle "NOTHING"', () => {
    const input = 'NOTHING';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });

  it('should handle "BREAKING CHANGES" in message body', () => {
    const input = 'feat: add new feature\n\nBREAKING CHANGES: new API';
    expect(movePrefixFromCommitLog(input)).toBe(input);
  });
});

describe('when resolving commit for tag', () => {
  const repoDir = `./testcases/commits-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(() => {
    createSampleRepo(repoDir);
  });

  it('find commits related to prefix2 tag 10.0.0', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'prefix2/10.0.0',
      paths: ['prefix2'],
      tagPrefix: 'prefix2/',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('5 prefix2 adding test2 file');
  });
  it('find commits related to prefix2 tag 10.1.0', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'prefix2/10.1.0',
      paths: ['prefix2'],
      tagPrefix: 'prefix2/',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('7 prefix2');
  });
  it('find commits related to HEAD (346.0.0-alpha.0)', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'HEAD',
      paths: [''],
      tagPrefix: '',
    });
    expect(clogs).toHaveLength(16);
    expect(clogs[0].message).toMatch('1 prefix1');
    expect(clogs[9].message).toMatch('9 prefix1');
    expect(clogs[15].message).toMatch('15 adding ');
  });
  it('find commits related to prefix2 tag prefix3/1.0.1-beta.0', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'prefix3/1.0.1-beta.0',
      paths: ['prefix3'],
      tagPrefix: 'prefix3/',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('88 prefix3 adding');
  });
  it('find commits related to prefix1 tag prefix1/1.0.0', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'prefix1/1.0.0',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('1 prefix1 adding');
  });
  it('find commits related to prefix1 tag prefix1/1.0.1', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'prefix1/1.0.1',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('2 prefix1');
  });
  it('find commits related to prefix1 tag prefix1/1.2.0', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'prefix1/1.2.0',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
    });
    expect(clogs).toHaveLength(1);
    expect(clogs[0].message).toMatch('3 prefix1');
  });
  it('find commits related to prefix1 in HEAD', () => {
    const clogs = resolveCommitsForTag({
      repoDir,
      tagRef: 'HEAD',
      paths: ['prefix1'],
      tagPrefix: 'prefix1/',
    });
    expect(clogs).toHaveLength(3);
    expect(clogs[0].message).toMatch('9 prefix1');
    expect(clogs[1].message).toMatch('11 prefix1');
    expect(clogs[2].message).toMatch('4 prefix1');
  });
});
