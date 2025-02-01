import { NextTagOptions } from './NextTagOptions';

export type ReleaseOptions = NextTagOptions & {
  releasetag?: string;
  version?: string;
  changelog?: string;
};
