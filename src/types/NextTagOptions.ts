import { BasicOptions } from './BasicOptions';
import { SemverLevel } from './SemverLevel';

export type NextTagOptions = BasicOptions & { tagPrefix?: string; semverLevel?: SemverLevel };
