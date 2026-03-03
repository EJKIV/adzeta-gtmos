'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import type { OracleChartBlock } from './types';

const COLORS = [
  'var(--color-brand-500, #6366f1)',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#f97316',
];

export function ChartBlock({ chartType, title, data, config }: OracleChartBlock) {
  const xKey = config.xAxis?.key ?? 'label';
  const yKey = config.yAxis?.key ?? 'value';

  // Detect all numeric series keys (excluding the xAxis key)
  const seriesKeys = data.length > 0
    ? Object.keys(data[0]).filter(k => k !== xKey && typeof data[0][k] === 'number')
    : [yKey];

  return (
    <div>
      {title && (
        <h3
          className="text-xs font-semibold uppercase tracking-wide mb-2"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {title}
        </h3>
      )}
      <div className="w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                dataKey={yKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(props: PieLabelRenderProps) =>
                  `${props.name ?? ''} ${(((props.percent as number | undefined) ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          ) : chartType === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e5e7eb)" />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
                label={
                  config.yAxis?.label
                    ? { value: config.yAxis.label, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-text-tertiary)' } }
                    : undefined
                }
              />
              <Tooltip />
              {seriesKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
              ))}
              {seriesKeys.length > 1 && <Legend />}
            </BarChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle, #e5e7eb)" />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                axisLine={{ stroke: 'var(--color-border-subtle, #e5e7eb)' }}
                label={
                  config.yAxis?.label
                    ? { value: config.yAxis.label, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'var(--color-text-tertiary)' } }
                    : undefined
                }
              />
              <Tooltip />
              {seriesKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
              {seriesKeys.length > 1 && <Legend />}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
