'use client';

import { useState } from 'react';
import { Activity, Users, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EventsMetrics } from '@/hooks/use-events-stream';
import { EventType, eventTypeColors } from '@/lib/analytics/mock-events';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MetricsCardsProps {
  metrics: EventsMetrics | null;
  onTimerangeChange: (timerange: '15m' | '1h' | '24h' | '7d') => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Sparkline Data Generation
// ─────────────────────────────────────────────────────────────────────────────

function generateSparklineData(points: number = 20): { x: number; y: number }[] {
  return Array.from({ length: points }, (_, i) => ({
    x: i,
    y: Math.random() * 50 + 10,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MetricsCards({ metrics, onTimerangeChange }: MetricsCardsProps) {
  const [timerange, setTimerange] = useState<'15m' | '1h' | '24h' | '7d'>('1h');

  const handleTimerangeChange = (value: string) => {
    const newTimerange = value as '15m' | '1h' | '24h' | '7d';
    setTimerange(newTimerange);
    onTimerangeChange(newTimerange);
  };

  // Generate sparkline data
  const sparklineData = generateSparklineData();

  // Format metrics for display
  const eventsCount = metrics?.events_count ?? 0;
  const eventsPerMinute = metrics?.events_per_minute ?? 0;
  const uniqueUsers = metrics?.unique_users ?? 0;
  const topTypes = metrics?.top_types ?? [];

  // Prepare pie chart data
  const pieData = topTypes.map((item) => ({
    name: item.type,
    value: item.count,
    color: eventTypeColors[item.type as EventType]?.bg.replace('bg-', '').replace('-50', '') || '#94a3b8',
    percentage: item.percentage,
  }));

  // Icon colors for cards
  const cardIcons = [
    { icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Timerange Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Overview</h2>
        <Select value={timerange} onValueChange={handleTimerangeChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15m">Last 15 minutes</SelectItem>
            <SelectItem value="1h">Last hour</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Events Count Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Events
            </CardTitle>
            <div className={`rounded-full p-2 ${cardIcons[0].bg}`}>
              <Activity className={`h-4 w-4 ${cardIcons[0].color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventsCount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total events in selected period
            </p>
          </CardContent>
        </Card>

        {/* Events Per Minute Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Events/Min
            </CardTitle>
            <div className={`rounded-full p-2 ${cardIcons[1].bg}`}>
              <Zap className={`h-4 w-4 ${cardIcons[1].color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eventsPerMinute.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average event rate
            </p>
            {/* Sparkline */}
            <div className="mt-4 h-[40px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Unique Users Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Users
            </CardTitle>
            <div className={`rounded-full p-2 ${cardIcons[2].bg}`}>
              <Users className={`h-4 w-4 ${cardIcons[2].color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Active in this period
            </p>
          </CardContent>
        </Card>

        {/* Top Event Types Card */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Event Types
            </CardTitle>
            <div className={`rounded-full p-2 ${cardIcons[3].bg}`}>
              <Clock className={`h-4 w-4 ${cardIcons[3].color}`} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pieData.length > 0 ? (
              <>
                <div className="h-[60px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={15}
                        outerRadius={28}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-white p-2 text-xs shadow-sm">
                                <p className="font-medium capitalize">{data.name}</p>
                                <p className="text-muted-foreground">{data.value} events ({data.percentage}%)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pieData.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex items-center gap-1 text-xs">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="capitalize text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex h-[60px] items-center justify-center text-xs text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default MetricsCards;