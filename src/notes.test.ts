/* eslint-disable no-undefined */
import { randomBytes } from 'node:crypto';

import {
  cleanupRemoteOrigin,
  notesForLatestTag,
  renderCommit,
  renderSubject,
  resolveBaseCommitUrl,
  resolveBaseIssueUrl,
  resolveBasePRUrl,
} from './notes';
import { createSampleRepo } from './utils/tests';
import { CommitDetails } from './types';

describe('re-generate notes from latest tag', () => {
  const repoDir = `./testcases/notes-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(() => {
    createSampleRepo(repoDir);
  });
  it('should get notes for existing prefixed tag', () => {
    const nt = notesForLatestTag({
      repoDir,
      tagPrefix: 'prefix2/',
      paths: ['prefix2'],
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toContain('## prefix2/20.10.0 (');
    expect(nt).toContain('* 8 prefix2 creating test3 file');
    expect(nt).toContain(`### Features

* **Breaking:** 8 prefix2 creating test3 file`);
  });
  it('should generate notes for non-prefixed tag', () => {
    const nt = notesForLatestTag({
      repoDir,
      tagPrefix: '',
      paths: [''],
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toContain('## 345.2123.143 (');
    expect(nt).toContain(`### Features

* adding test1 file to root`);
  });

  it('should return undefined for non existing tag', () => {
    const nt = notesForLatestTag({
      repoDir,
      tagPrefix: 'SOMETHING_INEXISTENT/',
      paths: ['prefix2'],
    });
    expect(nt).toBeUndefined();
  });

  it('should return empty release note if no commits found touching path', () => {
    const nt = notesForLatestTag({
      repoDir,
      tagPrefix: 'lonelytag/',
      paths: ['INEXISTENT_PATH'],
    });
    expect(nt).toBeUndefined();
  });
});

describe('render links utilities', () => {
  it('should clean up SSH-based remote origin URLs correctly', () => {
    const raw = 'git@github.com:rollup/rollup.git';
    const cleaned = cleanupRemoteOrigin(raw);
    expect(cleaned).toBe('https://github.com/rollup/rollup');
  });

  it('should strip .git at the end of HTTPS URLs', () => {
    const raw = 'https://github.com/rollup/rollup.git';
    const cleaned = cleanupRemoteOrigin(raw);
    expect(cleaned).toBe('https://github.com/rollup/rollup');
  });

  it('should strip user from urls', () => {
    const raw = 'https://someuser@github.com/rollup/rollup.git';
    const cleaned = cleanupRemoteOrigin(raw);
    expect(cleaned).toBe('https://github.com/rollup/rollup');
  });

  it('should return undefined if no remote origin is provided', () => {
    const cleaned = cleanupRemoteOrigin();
    expect(cleaned).toBeUndefined();
  });

  describe('resolve base urls', () => {
    const repoDir = `./testcases/notes-repo-${randomBytes(2).toString('hex')}`;
    beforeAll(() => {
      createSampleRepo(repoDir);
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('should return undefined if disableLinks is true', () => {
      expect(resolveBaseCommitUrl(repoDir, true)).toBeUndefined();
      expect(resolveBasePRUrl(repoDir, true)).toBeUndefined();
      expect(resolveBaseIssueUrl(repoDir, true)).toBeUndefined();
    });

    it('should return base url if provided', () => {
      const url1 = resolveBaseCommitUrl(repoDir, false, 'http://custom.com');
      expect(url1).toBe('http://custom.com');

      const url2 = resolveBasePRUrl(repoDir, false, 'http://mypr.com');
      expect(url2).toBe('http://mypr.com');

      const url3 = resolveBaseIssueUrl(repoDir, false, 'http://myissue.com');
      expect(url3).toBe('http://myissue.com');
    });

    it('baseCommitUrl: should construct commit URL from remote origin', () => {
      const url = resolveBaseCommitUrl(repoDir, false, '', false);
      expect(url).toBe('https://github.com/someone/myrepo/commit/');
    });

    it('basePRUrl: should construct PR URL from recognized remote origin', () => {
      // github is in test repo
      const url = resolveBasePRUrl(repoDir, false, '', false);
      expect(url).toBe('https://github.com/someone/myrepo/pull/');
    });

    it('baseIssueUrl: should construct Issue URL from recognized remote origin', () => {
      const url = resolveBaseIssueUrl(repoDir, false, '', false);
      expect(url).toBe('https://github.com/someone/myrepo/issues/');
    });

    it('should render the subject correctly', () => {
      const result = renderSubject('feat: new feature subject');
      expect(result).toContain('new feature subject');
    });

    it('should handle empty input gracefully', () => {
      const result = renderSubject('');
      expect(result).toBe('');
    });
  });
});

describe('renderSubject', () => {
  it('returns subject as is when no basePRUrl or baseIssueUrl is provided', () => {
    const result = renderSubject('Simple subject');
    expect(result).toBe('Simple subject');
  });

  it('replaces PR references with links when basePRUrl is provided', () => {
    const result = renderSubject(
      'Merge123: This is a PR reference 456 extra text',
      'http://example.com/pr/',
    );
    expect(result).toBe(
      'Merge[123](http://example.com/pr/123): This is a PR reference [456](http://example.com/pr/456) extra text',
    );

    // ignore case
    const result2 = renderSubject('pr #456 extra text', 'http://example.com/pr/');
    expect(result2).toBe('pr #[456](http://example.com/pr/456) extra text');

    const result3 = renderSubject('pr-456 extra text', 'http://example.com/pr/');
    expect(result3).toBe('pr-[456](http://example.com/pr/456) extra text');
  });

  it('replaces multple PR references', () => {
    const result = renderSubject(
      'Merged from 123: fix(something): very problematic, like PR 555',
      'http://example.com/pr/',
    );
    expect(result).toBe(
      'Merged from [123](http://example.com/pr/123): fix(something): very problematic, like PR [555](http://example.com/pr/555)',
    );
  });

  it('replaces issue references with links when baseIssueUrl is provided', () => {
    const result = renderSubject(
      'Fix something #789 happens here',
      undefined,
      'http://example.com/issues/',
    );
    expect(result).toBe('Fix something [#789](http://example.com/issues/789) happens here');
  });

  it('replaces multple PR references along with multiple issue references', () => {
    const result = renderSubject(
      'Merge 123: fix(something): very problematic, like PR #555, addressing issue #123 and #987',
      'http://example.com/pr/',
      'http://example.com/issues/',
    );
    expect(result).toBe(
      'Merge [123](http://example.com/pr/123): fix(something): very problematic, like PR #[555](http://example.com/pr/555), addressing issue [#123](http://example.com/issues/123) and [#987](http://example.com/issues/987)',
    );
  });

  it('skip link issue references when baseIssueUrl and basePrUrl not provided', () => {
    const result = renderSubject('Fix something #789 happens here');
    expect(result).toBe('Fix something #789 happens here');

    const result2 = renderSubject('PR 789 happens here');
    expect(result2).toBe('PR 789 happens here');
  });

  it('skips link replacement if subject has no PR or issue patterns', () => {
    const result = renderSubject(
      'Nothing special here',
      'http://example.com/pr/',
      'http://example.com/issues/',
    );
    expect(result).toBe('Nothing special here');
  });
});

describe('renderCommit', () => {
  it('returns empty string if subject is missing', () => {
    const commitDetails = { parsedLog: {}, commit: { id: 'abc123' } } as unknown as CommitDetails;
    expect(renderCommit(commitDetails)).toBe('');
  });

  it('includes scope when available', () => {
    const commitDetails = {
      parsedLog: { subject: 'Add feature X', scope: 'my-feature-123' },
      commit: { id: 'abc123' },
    } as unknown as CommitDetails;
    expect(renderCommit(commitDetails)).toContain('* my-feature-123: Add feature X [abc123]');
  });

  it('doesnt remove issue reference if not replacing', () => {
    const commitDetails = {
      parsedLog: {
        subject: 'chore: 13 prefix2 updating test1 and test2 files for module prefix2 closes #45',
      },
      commit: { id: 'abc123' },
    } as unknown as CommitDetails;
    expect(renderCommit(commitDetails)).toContain(
      '* chore: 13 prefix2 updating test1 and test2 files for module prefix2 closes #45 [abc123]',
    );
  });

  it('excludes scope if not provided', () => {
    const commitDetails = {
      parsedLog: {
        subject: 'Fix bug Y',
      },
      commit: { id: 'abc123' },
    } as unknown as CommitDetails;
    expect(renderCommit(commitDetails)).toContain('* Fix bug Y [abc123]');
  });

  it('links commit ID if baseCommitUrl is provided', () => {
    const commitDetails = {
      parsedLog: { subject: 'Enhance performance' },
      commit: { id: 'def456' },
    } as CommitDetails;
    const result = renderCommit(commitDetails, 'http://example.com/commits/');
    expect(result).toContain('Enhance performance [[def456](http://example.com/commits/def456)]');
  });
});
