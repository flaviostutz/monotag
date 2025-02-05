import { Commit } from '../types/Commit';
import { SemverLevel } from '../types/SemverLevel';

import { summarizeCommits } from './summarizeCommits';

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
    ];

    const summary = summarizeCommits(commits);

    expect(summary.features).toEqual(['**Breaking:** add breaking change', 'add new feature']);
    expect(summary.fixes).toEqual(['fix bug']);
    expect(summary.maintenance).toEqual(['update dependencies']);
    expect(summary.nonConventional).toEqual(['docs: update documentation']);
    expect(summary.notes).toEqual([]);
    expect(summary.level).toEqual(SemverLevel.MAJOR);
    expect(summary.authors).toEqual(['Author 11', 'Author 22', 'Author 33', 'Author 44']);
    expect(summary.references).toEqual([]);
  });

  it('should handle commits with breaking changes in notes', () => {
    const commits: Commit[] = [
      {
        id: '1',
        author: 'Author One',
        date: '2023-01-01',
        message: 'feat: add new feature\n\nBREAKING CHANGE: new API',
        files: ['file1.ts'],
      },
    ];

    const summary = summarizeCommits(commits);

    expect(summary.features).toEqual(['**Breaking:** add new feature']);
    expect(summary.level).toEqual(SemverLevel.MAJOR);
    expect(summary.notes).toEqual(['BREAKING CHANGE: new API']);
  });
});
