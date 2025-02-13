import { getVersionFromTag, tagParts } from './tags';

describe('getVersionFromTag', () => {
  it('should return the version without prefix', () => {
    const result = getVersionFromTag('v1.2.3', 'v');
    expect(result).toBe('1.2.3');
  });

  it('should return the version with additional metadata', () => {
    const result = getVersionFromTag('v1.2.3-beta', 'v');
    expect(result).toBe('1.2.3-beta');
  });

  it('should return the version when prefix is empty', () => {
    const result = getVersionFromTag('test/1.2.3', 'test/');
    expect(result).toBe('1.2.3');
  });

  it('should return the version when prefix is not present in tag', () => {
    const result = getVersionFromTag('test-123/test/abc/1.2.3', 'test-123/test/abc/');
    expect(result).toBe('1.2.3');
  });

  it('should return the version when tag contains multiple dots', () => {
    const result = getVersionFromTag('v1.2.3.4', 'v');
    expect(result).toBe('1.2.3.4');
  });

  it('should return the version when tag contains letters', () => {
    const result = getVersionFromTag('v1.2.3-alpha', 'v');
    expect(result).toBe('1.2.3-alpha');
  });

  it('should return the version when tag contains hyphens', () => {
    const result = getVersionFromTag('v1.2.3-rc.1', 'v');
    expect(result).toBe('1.2.3-rc.1');
  });

  it('should return the version when tag contains build metadata', () => {
    const result = getVersionFromTag('v1.2.3+build.1', 'v');
    expect(result).toBe('1.2.3+build.1');
  });
  it('should return the version when prefix is empty 2', () => {
    const result = getVersionFromTag('test/1.2.3', '');
    expect(result).toBe('1.2.3');
  });
  it('should return the version when prefix is empty with suffix', () => {
    const result = getVersionFromTag('test/1.2.3-abc', '');
    expect(result).toBe('1.2.3-abc');
  });
});

describe('when using tag parsers', () => {
  it('should return null when non semver tag', async () => {
    const rr = tagParts('1.0');
    expect(rr).toBeUndefined();
    const rr1 = tagParts('test');
    expect(rr1).toBeUndefined();
    const rr2 = tagParts('test-1.4+test1.3');
    expect(rr2).toBeUndefined();
  });
  it('should describe simple tag parts', async () => {
    const rr = tagParts('10.20.30');
    if (!rr) throw new Error('Shouldnt be null');
    expect(rr[0]).toBe('10.20.30');
    expect(rr[4]).toBe('10');
    expect(rr[5]).toBe('20');
    expect(rr[6]).toBe('30');
  });
  it('should describe prefixed tag parts', async () => {
    const rr = tagParts('my-service-prefix/0.1.0');
    if (!rr) throw new Error('Shouldnt be null');
    expect(rr[0]).toBe('my-service-prefix/0.1.0');
    expect(rr[2]).toBe('my-service-prefix/');
    expect(rr[3]).toBe('0.1.0');
    expect(rr[4]).toBe('0');
    expect(rr[5]).toBe('1');
    expect(rr[6]).toBe('0');
    expect(rr[7]).toBeUndefined();
  });
  it('should describe prefixed tag parts -', async () => {
    const rr = tagParts('my-service-prefix-0.1.0');
    if (!rr) throw new Error('Shouldnt be null');
    expect(rr[0]).toBe('my-service-prefix-0.1.0');
    expect(rr[2]).toBe('my-service-prefix-');
    expect(rr[3]).toBe('0.1.0');
    expect(rr[4]).toBe('0');
    expect(rr[5]).toBe('1');
    expect(rr[6]).toBe('0');
    expect(rr[7]).toBeUndefined();
  });
  it('should describe suffixed tag parts', async () => {
    const rr = tagParts('my-service-prefix/0.1.0-beta+build999');
    if (!rr) throw new Error('Shouldnt be null');
    expect(rr[0]).toBe('my-service-prefix/0.1.0-beta+build999');
    expect(rr[1]).toBe('my-service-prefix/0.1.0');
    expect(rr[2]).toBe('my-service-prefix/');
    expect(rr[3]).toBe('0.1.0');
    expect(rr[4]).toBe('0');
    expect(rr[5]).toBe('1');
    expect(rr[6]).toBe('0');
    expect(rr[7]).toBe('beta');
    expect(rr[8]).toBe('build999');
  });
  it('should describe suffixed tag parts separated by -', async () => {
    const rr = tagParts('my-service-prefix-0.1.0-beta+build999');
    if (!rr) throw new Error('Shouldnt be null');
    expect(rr[0]).toBe('my-service-prefix-0.1.0-beta+build999');
    expect(rr[1]).toBe('my-service-prefix-0.1.0');
    expect(rr[2]).toBe('my-service-prefix-');
    expect(rr[3]).toBe('0.1.0');
    expect(rr[4]).toBe('0');
    expect(rr[5]).toBe('1');
    expect(rr[6]).toBe('0');
    expect(rr[7]).toBe('beta');
    expect(rr[8]).toBe('build999');
  });
  it('should describe unprefixed tags', async () => {
    const rr = tagParts('0.1.0');
    if (!rr) throw new Error('Shouldnt be null');
    expect(rr[0]).toBe('0.1.0');
    expect(rr[1]).toBe('0.1.0');
    expect(rr[2]).toBe('');
    expect(rr[3]).toBe('0.1.0');
    expect(rr[4]).toBe('0');
    expect(rr[5]).toBe('1');
    expect(rr[6]).toBe('0');
    expect(rr[7]).toBeUndefined();
    expect(rr[8]).toBeUndefined();
  });
  it('shouldnt take long to reject long invalid tags', async () => {
    const date1 = new Date();
    const rr = tagParts('anything-anything-anything-anything-anything-anything-20230118.17');
    // const rr = tagParts('ground-lease-service-1.0.0');
    expect(rr).toBeUndefined();
    expect(Date.now() - date1.getTime()).toBeLessThan(1000);
  });
  it('shouldnt take long to describe long tag parts', async () => {
    const date1 = new Date();
    const rr = tagParts(
      'anything-anything-anything-anything-anything-anything/1.2.3-20230118.17something+anotherthinghereyeah',
    );
    if (!rr) throw new Error('parts not found');
    expect(rr[3]).toBe('1.2.3');
    expect(Date.now() - date1.getTime()).toBeLessThan(1000);
  });
});
