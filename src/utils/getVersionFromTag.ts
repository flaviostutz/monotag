export const getVersionFromTag = (tagName: string, tagPrefix: string): string => {
  let version = tagName.replace(tagPrefix, '');
  const versionMatch = /(\d+\.\d+\.\d+.*)/.exec(tagName);
  if (versionMatch) {
    version = versionMatch[0];
  }
  return version;
};
