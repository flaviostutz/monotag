import { tagParts } from './tagParts';

describe('when using tag parsers', () => {
  it('should return null when non semver tag', async () => {
    const rr = tagParts('1.0');
    expect(rr).toBeNull();
    const rr1 = tagParts('test');
    expect(rr1).toBeNull();
    const rr2 = tagParts('test-1.4+test1.3');
    expect(rr2).toBeNull();
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
    expect(rr).toBeNull();
    expect(new Date().getTime() - date1.getTime()).toBeLessThan(1000);
  });
  it('shouldnt take long to describe long tag parts', async () => {
    const date1 = new Date();
    const rr = tagParts(
      'anything-anything-anything-anything-anything-anything/1.2.3-20230118.17something+anotherthinghereyeah',
    );
    if (!rr) throw new Error();
    expect(rr[3]).toBe('1.2.3');
    expect(new Date().getTime() - date1.getTime()).toBeLessThan(1000);
  });
});
