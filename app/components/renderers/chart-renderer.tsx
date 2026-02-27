'use client';

import { useMemo } from 'react';
import type { ChartBlock } from '@/lib/skills/types';
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const DEFAULT_COLORS = ['#de347f', '#2563eb', '#16a34a', '#ea580c'];

export function ChartRenderer({ block }: { block: ChartBlock }) {
  const colors = block.colors ?? DEFAULT_COLORS;

  const chartContent = useMemo(() => {
    const commonProps = {
      data: block.data,
      margin: { top: 8, right: 8, left: -16, bottom: 0 },
    };

    const xAxis = (
      <XAxis
        dataKey={block.xKey}
        tick={{ fill: '#86868b', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
    );

    const yAxis = (
      <YAxis
        tick={{ fill: '#86868b', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        width={48}
      />
    );

    const grid = <CartesianGrid strokeDasharray="3 3" stroke="#e5e5ea" />;

    const tooltip = (
      <Tooltip
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: 8,
          fontSize: 12,
          color: '#1d1d1f',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        }}
        itemStyle={{ color: '#5a5a5d' }}
      />
    );

    if (block.chartType === 'bar') {
      return (
        <BarChart {...commonProps}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {block.yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    }

    if (block.chartType === 'area') {
      return (
        <AreaChart {...commonProps}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {block.yKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              fill={colors[i % colors.length]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );
    }

    // Default: line
    return (
      <LineChart {...commonProps}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {block.yKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: colors[i % colors.length] }}
          />
        ))}
      </LineChart>
    );
  }, [block, colors]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {block.title && (
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          {block.title}
        </p>
      )}
      <div style={{ height: Math.max(180, Math.min(320, block.data.length * 16 + 120)) }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartContent}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
