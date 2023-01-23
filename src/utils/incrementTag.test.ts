import { SemverLevel } from '../types/SemverLevel';

import { incrementTag } from './incrementTag';

describe('when using tag incrementer', () => {
  it('should increment major and zero other parts', async () => {
    let rr = incrementTag('my-service-prefix/0.1.0-beta+build999', SemverLevel.MAJOR);
    expect(rr).toBe('my-service-prefix/1.0.0');
    rr = incrementTag('my-service-prefix/14.22.5-beta+build999', SemverLevel.MAJOR, '-beta');
    expect(rr).toBe('my-service-prefix/15.0.0-beta');
    rr = incrementTag('24.22.5-beta+build999', SemverLevel.MAJOR, '');
    expect(rr).toBe('25.0.0');
  });

  it('should increment minor and zero other parts', async () => {
    let rr = incrementTag('my-service-prefix/0.1.0-beta+build999', SemverLevel.MINOR);
    expect(rr).toBe('my-service-prefix/0.2.0');
    rr = incrementTag('my-service-prefix/14.22.5-beta+build999', SemverLevel.MINOR, '-beta');
    expect(rr).toBe('my-service-prefix/14.23.0-beta');
    rr = incrementTag('24.22.5-beta+build999', SemverLevel.MINOR, '');
    expect(rr).toBe('24.23.0');
  });

  it('should increment minor and zero other parts', async () => {
    let rr = incrementTag('my-service-prefix/0.1.0-beta+build999', SemverLevel.PATCH);
    expect(rr).toBe('my-service-prefix/0.1.1');
    rr = incrementTag('my-service-prefix/14.22.5-beta+build999', SemverLevel.PATCH, '-beta');
    expect(rr).toBe('my-service-prefix/14.22.6-beta');
    rr = incrementTag('24.22.5-beta+build999', SemverLevel.PATCH, '');
    expect(rr).toBe('24.22.6');
  });
});
