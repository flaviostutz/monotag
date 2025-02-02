export const getDateFromCommit = (dateWithTime: string): string => {
  return /(\d{4}-\d{2}-\d{2})/.exec(dateWithTime)?.[0] ?? '';
};
