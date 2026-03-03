/** Oracle structured response format (version 1.0) */

export interface OracleResponse {
  version: '1.0';
  blocks: OracleBlock[];
}

export type OracleBlock =
  | OracleTextBlock
  | OracleMetricBlock
  | OracleChartBlock
  | OracleTableBlock
  | OracleComparisonBlock
  | OracleActionBlock;

export interface OracleTextBlock {
  type: 'text';
  content: string;
  style?: 'normal' | 'alert' | 'success' | 'warning';
}

export interface OracleMetricBlock {
  type: 'metric';
  title: string;
  layout: 'grid' | 'compact';
  metrics: {
    label: string;
    value: string | number;
    change?: number;
    changeType?: 'positive' | 'negative' | 'neutral';
    unit?: string;
  }[];
}

export interface OracleChartBlock {
  type: 'chart';
  chartType: 'line' | 'bar' | 'pie';
  title: string;
  data: Record<string, unknown>[];
  config: {
    xAxis?: { label: string; key: string };
    yAxis?: { label: string; key: string };
  };
}

export interface OracleTableBlock {
  type: 'table';
  title: string;
  headers: string[];
  rows: (string | number)[][];
  sortable?: boolean;
}

export interface OracleComparisonBlock {
  type: 'comparison';
  title: string;
  items: {
    name: string;
    values: {
      label: string;
      value: string | number;
      highlight?: boolean;
    }[];
    winner?: boolean;
  }[];
}

export interface OracleActionBlock {
  type: 'action';
  actions: {
    label: string;
    type: 'button' | 'link';
    action: string;
    style?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }[];
}
