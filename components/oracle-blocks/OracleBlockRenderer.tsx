'use client';

import type { OracleBlock } from './types';
import { TextBlock } from './TextBlock';
import { MetricBlock } from './MetricBlock';
import { ChartBlock } from './ChartBlock';
import { TableBlock } from './TableBlock';
import { ComparisonBlock } from './ComparisonBlock';
import { ActionBlock } from './ActionBlock';

interface OracleBlockRendererProps {
  blocks: OracleBlock[];
}

export function OracleBlockRenderer({ blocks }: OracleBlockRendererProps) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'text':
            return <TextBlock key={`text-${i}`} {...block} />;
          case 'metric':
            return <MetricBlock key={`metric-${i}`} {...block} />;
          case 'chart':
            return <ChartBlock key={`chart-${i}`} {...block} />;
          case 'table':
            return <TableBlock key={`table-${i}`} {...block} />;
          case 'comparison':
            return <ComparisonBlock key={`comparison-${i}`} {...block} />;
          case 'action':
            return <ActionBlock key={`action-${i}`} {...block} />;
          default:
            console.warn('Unknown oracle block type:', (block as OracleBlock).type);
            return null;
        }
      })}
    </div>
  );
}
