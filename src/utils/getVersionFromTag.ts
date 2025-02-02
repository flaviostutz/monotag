export const getVersionFromTag = (
  tagName: string,
  tagPrefix?: string,
  tagSuffix?: string,
): string => {
  // remove the tagPrefix only if appearing in the beginning of the tagName string using regex
  const versionPart = tagName
    .replace(new RegExp(`^${tagPrefix ?? ''}`), '')
    .replace(new RegExp(`${tagSuffix ?? ''}$`), '');

  // let version = tagName.replace(tagPrefix, '').replace(tagSuffix, '');
  const versionMatch = /(\d+\.\d+\.\d+.*)/.exec(versionPart);
  if (versionMatch) {
    return versionMatch[0];
  }
  return versionPart;
};
