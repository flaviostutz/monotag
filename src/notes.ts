import { CommitsSummary } from './types/CommitsSummary';

const formatReleaseNotes = (commitsSummary: CommitsSummary, markdownNotes: boolean): string => {
  let notes = '';

  // features
  if (commitsSummary.features.length > 0) {
    notes += 'Features:';
    notes = commitsSummary.features.reduce((pv, feat) => {
      return `${pv}\n  - ${feat}`;
    }, notes);
    notes += '\n\n';
  }

  // fixes
  if (commitsSummary.features.length > 0) {
    notes += 'Fixes:';
    notes = commitsSummary.fixes.reduce((pv, fix) => {
      return `${pv}\n  - ${fix}`;
    }, notes);
    notes += '\n\n';
  }

  // maintenance
  if (commitsSummary.maintenance.length > 0) {
    notes += 'Maintenance:';
    notes = commitsSummary.maintenance.reduce((pv, maintenance) => {
      return `${pv}\n  - ${maintenance}`;
    }, notes);
    notes += '\n\n';
  }

  // notes
  if (commitsSummary.notes.length > 0) {
    notes += 'Notes:';
    notes = commitsSummary.notes.reduce((pv, cnotes) => {
      return `${pv}\n  - ${cnotes}`;
    }, notes);
    notes += '\n\n';
  }

  // references
  if (commitsSummary.references.length > 0) {
    // remove duplicate references
    const references = commitsSummary.references.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    notes += `References: ${JSON.stringify(references)
      .replace('[', '')
      .replace(']', '')
      .replace(/"/g, '')}`;
    notes += '\n\n';
  }

  // authors
  if (commitsSummary.authors.length > 0) {
    // remove duplicate authors
    const authors = commitsSummary.authors.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    notes += `Authors: ${JSON.stringify(authors)
      .replace('[', '')
      .replace(']', '')
      .replace(/"/g, '')}`;
    notes += '\n\n';
  }

  return notes;
};

export { formatReleaseNotes };
