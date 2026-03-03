'use client';

import {
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import type { ChartBlock as ChartBlockType } from '@/types/ai-agent';

const DEFAULT_COLORS = [
  'var(--color-brand-500)',
  'var(--color-brand-600)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-info)',
  'var(--color-error)',
];

export function ChartBlock({
  chartType,
  title,
  description,
  data,
  xAxis,
  yAxis,
  colors = DEFAULT_COLORS,
  height = 300,
}: ChartBlockType) {
  const seriesKeys = data.length > 0 && data[0].series
    ? Object.keys(data[0].series)
    : [];

  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
    ...d.series,
  }));

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <Tooltip />
            <Legend />
            {seriesKeys.length > 0 ? (
              seriesKeys.map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
              ))
            ) : (
              <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={false} />
            )}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <Tooltip />
            <Legend />
            {seriesKeys.length > 0 ? (
              seriesKeys.map((key, i) => (
                <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
              ))
            ) : (
              <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <YAxis tick={{ fontSize: 12 }} stroke="var(--color-text-muted)" />
            <Tooltip />
            <Legend />
            {seriesKeys.length > 0 ? (
              seriesKeys.map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.2} />
              ))
            ) : (
              <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.2} />
            )}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              dataKey="value"
              nameKey="name"
              label={(props) => `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );

      case 'funnel':
        return (
          <FunnelChart>
            <Tooltip />
            <Funnel dataKey="value" data={chartData} isAnimationActive>
              <LabelList position="right" fill="var(--color-text-primary)" stroke="none" dataKey="name" fontSize={12} />
              {chartData.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h4>
      )}
      {description && (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}
      <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart() || <div />}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
