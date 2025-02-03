import { getVersionFromTag } from './getVersionFromTag';

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
