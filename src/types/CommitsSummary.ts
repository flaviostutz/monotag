import { SemverLevel } from './SemverLevel';

export type CommitsSummary = {
  fixes: string[];
  features: string[];
  maintenance: string[];
  notes: string[];
  level: SemverLevel;
  authors: string[];
  references: string[];
};
