import { getDateFromCommit } from './getDateFromCommit';

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
