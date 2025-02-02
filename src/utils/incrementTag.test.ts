import { SemverLevel } from '../types/SemverLevel';

import { incrementTag } from './incrementTag';

describe('when using tag incrementer', () => {
  it('should increment major and zero other parts', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.MAJOR,
    });
    expect(rr).toBe('my-service-prefix/1.0.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '-beta',
    });
    expect(rr).toBe('my-service-prefix/15.0.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '',
    });
    expect(rr).toBe('25.0.0');
  });

  it('should increment major and zero other parts -', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix-0.1.0-beta+build999',
      type: SemverLevel.MAJOR,
    });
    expect(rr).toBe('my-service-prefix-1.0.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix-14.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '-beta',
    });
    expect(rr).toBe('my-service-prefix-15.0.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '',
    });
    expect(rr).toBe('25.0.0');
  });

  it('should increment minor and zero other parts', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.MINOR,
    });
    expect(rr).toBe('my-service-prefix/0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: SemverLevel.MINOR,
      tagSuffix: '-beta',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.MINOR,
      tagSuffix: '',
    });
    expect(rr).toBe('24.23.0');
  });

  it('should increment minor and zero other parts', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.PATCH,
    });
    expect(rr).toBe('my-service-prefix/0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-beta+build999',
      type: SemverLevel.PATCH,
      tagSuffix: '-beta',
    });
    expect(rr).toBe('my-service-prefix/14.22.5-beta');
    rr = incrementTag({ fullTagName: '24.22.5-beta+build999', type: SemverLevel.PATCH });
    expect(rr).toBe('24.22.5');
  });
  it('should increment minor and zero other parts -', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix-0.1.0-beta+build999',
      type: SemverLevel.PATCH,
    });
    expect(rr).toBe('my-service-prefix-0.1.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix-14.22.5-beta+build999',
      type: SemverLevel.PATCH,
      tagSuffix: '-win64',
    });
    expect(rr).toBe('my-service-prefix-14.22.5-win64');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.PATCH,
      tagSuffix: '',
    });
    expect(rr).toBe('24.22.5');
  });
  it('should respect minVersion when incrementing', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.MAJOR,
      tagSuffix: '',
      minVersion: '2.0.0',
    });
    expect(rr).toBe('my-service-prefix/2.0.0');
    rr = incrementTag({
      fullTagName: '24.22.5-beta+build999',
      type: SemverLevel.PATCH,
      minVersion: '24.22.10',
    });
    expect(rr).toBe('24.22.10');
  });

  it('should throw error if incremented version exceeds maxVersion', async () => {
    const rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5-abraca+build999',
      type: SemverLevel.MINOR,
      tagSuffix: '-beta',
      maxVersion: '14.23.1',
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    expect(() => {
      incrementTag({
        fullTagName: 'my-service-prefix/0.1.0-beta+build999',
        type: SemverLevel.MAJOR,
        maxVersion: '0.5.0',
      });
    }).toThrow('Generated tag version 1.0.0 is greater than 0.5.0');
    expect(() => {
      incrementTag({
        fullTagName: 'my-service-prefix/14.22.5-beta+build999',
        type: SemverLevel.MINOR,
        tagSuffix: '-beta',
        maxVersion: '14.22.6',
      });
    }).toThrow('Generated tag version 14.23.0 is greater than 14.22.6');
    expect(() => {
      incrementTag({
        fullTagName: '24.22.5-beta+build999',
        type: SemverLevel.PATCH,
        maxVersion: '24.22.4',
      });
    }).toThrow('Generated tag version 24.22.5 is greater than 24.22.4');
  });
  it('should create pre-release versions', async () => {
    let rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.0-beta+build999',
      type: SemverLevel.PATCH,
      preRelease: true,
    });
    expect(rr).toBe('my-service-prefix/0.1.1-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/14.22.5',
      type: SemverLevel.MINOR,
      preRelease: true,
    });
    expect(rr).toBe('my-service-prefix/14.23.0-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5',
      type: SemverLevel.MAJOR,
      preRelease: true,
    });
    expect(rr).toBe('my-service-prefix/1.0.0-beta.0');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5-beta',
      type: SemverLevel.NONE,
      preRelease: false,
    });
    expect(rr).toBe('my-service-prefix/0.1.5');
    rr = incrementTag({
      fullTagName: 'my-service-prefix/0.1.5-beta',
      type: SemverLevel.NONE,
      preRelease: false,
    });
    expect(rr).toBe('my-service-prefix/0.1.5');
    rr = incrementTag({ fullTagName: '24.22.5-beta.0', type: SemverLevel.NONE, preRelease: true });
    expect(rr).toBe('24.22.5-beta.1');
    rr = incrementTag({ fullTagName: '24.22.5-beta.0', type: SemverLevel.PATCH, preRelease: true });
    expect(rr).toBe('24.22.6-beta.0');
  });
});
