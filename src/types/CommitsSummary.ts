import { SemverLevel } from './SemverLevel';

/**
 * Commit summarized according to conventional commit
 */
export type CommitsSummary = {
  fixes: string[];
  features: string[];
  maintenance: string[];
  notes: string[];
  level: SemverLevel;
  authors: string[];
  references: string[];
  nonConventional: string[];
};
