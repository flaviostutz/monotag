export const lastPathPart = (path: string): string => {
  const pathParts = path.split('/');
  return pathParts[pathParts.length - 1];
};
