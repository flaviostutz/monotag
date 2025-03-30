/* eslint-disable no-undefined */
import { randomBytes } from 'node:crypto';

import {
  cleanupRemoteOrigin,
  notesForTag,
  renderCommit,
  renderSubject,
  resolveBaseCommitUrl,
  resolveBaseIssueUrl,
  resolveBasePRUrl,
  resolveToCommitId,
} from './notes';
import { createSampleRepo } from './utils/tests';
import { CommitDetails } from './types';
import { isFirstCommit } from './git';

describe('re-generate notes from latest tag', () => {
  const repoDir = `./testcases/notes-repo-${randomBytes(2).toString('hex')}`;
  beforeAll(() => {
    createSampleRepo(repoDir);
  });

  it('resolve toCommitId from tagName', () => {
    const cid = resolveToCommitId({
      repoDir,
      tagName: 'prefix2/20.10.0',
    });
    expect(cid.length > 5).toBeTruthy();
  });
  it('resolve toCommitId from ref', () => {
    const cid = resolveToCommitId({
      repoDir,
      tagName: 'inexisting_tag',
      toRef: 'HEAD~16',
    });
    expect(isFirstCommit(repoDir, cid)).toBeTruthy();
  });
  it('resolve toCommitId require valid ref', () => {
    const fn = (): string =>
      resolveToCommitId({
        repoDir,
        tagName: 'inexisting_tag',
      });
    expect(fn).toThrow("'toRef' is required if 'tagName'");
  });
  it('resolve toCommitId valid roRef required if tagName not found', () => {
    const fn = (): string =>
      resolveToCommitId({
        repoDir,
        tagName: 'inexisting_tag',
        toRef: 'STRAGE_REF',
      });
    expect(fn).toThrow("toRef STRAGE_REF doesn't exist in repo");
  });
  it('resolve toCommitId roRef must point to the same as an existing tag', () => {
    const cid = resolveToCommitId({
      repoDir,
      tagName: 'lonelytag/1.0.0',
      toRef: 'HEAD~15',
    });
    expect(cid.length > 5).toBeTruthy();
  });
  it('resolve toCommitId: should fail if toRef doesnt point to the same commit id as an existing tag', () => {
    const f = (): string =>
      resolveToCommitId({
        repoDir,
        tagName: 'lonelytag/1.0.0',
        toRef: 'HEAD~5',
      });
    expect(f).toThrow('point to different commits');
  });

  it('should get notes for existing prefixed tag', () => {
    const nt = notesForTag({
      repoDir,
      tagName: 'prefix2/20.10.0',
      tagPrefix: 'prefix2/',
      paths: ['prefix2'],
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toMatch('## prefix2/20.10.0 (');
    expect(nt).toMatch('* 8 prefix2 creating test3 file');
    expect(nt).toContain(`### Features

* **Breaking:** 8 prefix2 creating test3 file`);
  });
  it('latest tag not found for prefix3 without pre-release or suffix', () => {
    const nt = notesForTag({
      repoDir,
      tagName: 'prefix3/3.0.0',
      tagPrefix: 'prefix3/',
      paths: ['prefix3'],
      toRef: 'HEAD~6',
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toMatch('## prefix3/3.0.0 (');
    expect(nt).toMatch('88 prefix3 adding test1 file');
    expect(nt.split('\n')).toHaveLength(10);
  });
  it('should get notes for existing prefixed tag prefix3', () => {
    const nt = notesForTag({
      repoDir,
      tagName: 'prefix3/1.0.1',
      tagPrefix: 'prefix3/',
      paths: ['prefix3'],
      tagSuffix: '-alpha',
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toMatch('## prefix3/1.0.1 (');
    expect(nt).toMatch('88 prefix3 adding test1 file');
    expect(nt.split('\n')).toHaveLength(10);
  });
  it('should get notes for existing prefixed tag prefix3 beta', () => {
    const nt = notesForTag({
      repoDir,
      tagName: 'prefix3/1.0.1-beta.0',
      tagPrefix: 'prefix3/',
      paths: ['prefix3'],
      tagSuffix: '-alpha',
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toMatch('## prefix3/1.0.1 (');
    expect(nt).toMatch('88 prefix3 adding test1 file');
    expect(nt.split('\n')).toHaveLength(10);
  });
  it('should generate notes for non-prefixed tag', () => {
    const nt = notesForTag({
      repoDir,
      tagName: '345.2123.143',
      tagPrefix: '',
      paths: [''],
    });
    if (!nt) throw new Error('Shouldnt be undefined');
    expect(nt).toMatch('## 345.2123.143 (');
    expect(nt).toContain(`### Features

* adding test1 file to root`);
  });

  it('should return undefined for non existing tag', () => {
    const nt = notesForTag({
      repoDir,
      toRef: 'HEAD',
      tagName: 'SOMETHING_INEXISTENT/5.0.0',
      tagPrefix: 'SOMETHING_INEXISTENT/',
      paths: ['prefix2', 'prefix3'],
    });
    expect(nt).not.toMatch('1 prefix1');
    expect(nt).not.toMatch('2 prefix1');
    expect(nt).not.toMatch('3 prefix1');
    expect(nt).not.toMatch(' 4 prefix1');
    expect(nt).toMatch('5 prefix2');
    expect(nt).toMatch('6 prefix2');
    expect(nt).toMatch('7 prefix2');
    expect(nt).toMatch('8 prefix2');
    expect(nt).toMatch('88 prefix3');
    expect(nt).not.toMatch('9 prefix1');
    expect(nt).toMatch('10 prefix2');
    expect(nt).not.toMatch('11 prefix1');
    expect(nt).toMatch('12 prefix2');
    expect(nt).toMatch('13 prefix2');
    expect(nt).toMatch('14 prefix1');
    expect(nt?.split('\n')).toHaveLength(25);
  });

  it('should return empty release note if no commits found touching path', () => {
    const nt = notesForTag({
      repoDir,
      tagName: 'lonelytag/1.0.0',
      tagPrefix: 'lonelytag/',
      paths: ['INEXISTENT_PATH'],
    });
    expect(nt).toMatch('## lonelytag/1.0.0');
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
      expect(result).toMatch('new feature subject');
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
    expect(renderCommit(commitDetails)).toMatch('* my-feature-123: Add feature X [abc123]');
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
    expect(renderCommit(commitDetails)).toMatch('* Fix bug Y [abc123]');
  });

  it('links commit ID if baseCommitUrl is provided', () => {
    const commitDetails = {
      parsedLog: { subject: 'Enhance performance' },
      commit: { id: 'def456' },
    } as CommitDetails;
    const result = renderCommit(commitDetails, 'http://example.com/commits/');
    expect(result).toMatch('Enhance performance [[def456](http://example.com/commits/def456)]');
  });
});
