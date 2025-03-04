import { MetricInfo } from '../types';

export const metrics: MetricInfo[] = [
  {
    id: 'wordCount',
    name: 'Word Count',
    description: 'Total number of words in the regulations',
    formatter: (value) => `${(value / 1000).toFixed(1)}k words`,
  },
  {
    id: 'sentenceCount',
    name: 'Sentence Count',
    description: 'Total number of sentences',
    formatter: (value) => `${(value / 1000).toFixed(1)}k sentences`,
  },
  {
    id: 'paragraphCount',
    name: 'Paragraph Count',
    description: 'Total number of paragraphs',
    formatter: (value) => value.toLocaleString() + ' paragraphs',
  },
  {
    id: 'sectionCount',
    name: 'Section Count',
    description: 'Number of major sections',
    formatter: (value) => value.toLocaleString() + ' sections',
  },
  {
    id: 'subpartCount',
    name: 'Subpart Count',
    description: 'Number of subparts within sections',
    formatter: (value) => value.toLocaleString() + ' subparts',
  },
  {
    id: 'totalAuthors',
    name: 'Total Authors',
    description: 'Number of unique authors who have contributed',
    formatter: (value) => value.toLocaleString() + ' authors',
  },
  {
    id: 'revisionAuthors',
    name: 'Revision Authors',
    description: 'Authors involved in the current revision',
    formatter: (value) => value.toLocaleString() + ' authors',
  },
  {
    id: 'complexityScore',
    name: 'Complexity Score',
    description: 'Overall complexity rating (0-100)',
    formatter: (value) => value.toFixed(1) + ' / 100',
  },
  {
    id: 'simplicityScore',
    name: 'Simplicity Score',
    description: 'Readability and clarity rating (0-100)',
    formatter: (value) => value.toFixed(1) + ' / 100',
  },
];