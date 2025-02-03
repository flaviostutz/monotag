export const lastPathPart = (path: string): string => {
  const pathParts = path.split('/');
  const part = pathParts.at(-1);
  if (!part) {
    return path;
  }
  return part;
};
