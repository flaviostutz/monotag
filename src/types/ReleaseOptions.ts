import { NextTagOptions } from './NextTagOptions';

export type ReleaseOptions = NextTagOptions & {
  releasetagFile?: string;
  versionFile?: string;
  changelogFile?: string;
};
