export type MetricType = 
  | 'wordCount'
  | 'sentenceCount'
  | 'paragraphCount'
  | 'sectionCount'
  | 'subpartCount'
  | 'totalAuthors'
  | 'revisionAuthors'
  | 'complexityScore'
  | 'simplicityScore';

export interface MetricInfo {
  id: MetricType;
  name: string;
  description: string;
  formatter: (value: number) => string;
}

export interface AgencyMetrics {
  id: string;
  name: string;
  metrics: {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    sectionCount: number;
    subpartCount: number;
    totalAuthors: number;
    revisionAuthors: number;
    complexityScore: number;
    simplicityScore: number;
  };
  trend: {
    date: string;
    metrics: {
      wordCount: number;
      sentenceCount: number;
      paragraphCount: number;
      sectionCount: number;
      subpartCount: number;
      totalAuthors: number;
      revisionAuthors: number;
      complexityScore: number;
      simplicityScore: number;
    };
  }[];
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}