import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

interface DemoActivity {
  id: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  description: string;
  timeAgo: string;
  timestamp: string;
  actionCommand?: string;
  actionLabel?: string;
}

const DEMO_ACTIVITIES: DemoActivity[] = [
  { id: '1', severity: 'critical', description: '12 A+ prospects uncontacted for >48h', timeAgo: '5m ago', timestamp: new Date(Date.now() - 5 * 60_000).toISOString(), actionCommand: 'find uncontacted prospects', actionLabel: 'Contact' },
  { id: '2', severity: 'warning', description: 'Sequence #3 reply rate dropped below 15%', timeAgo: '23m ago', timestamp: new Date(Date.now() - 23 * 60_000).toISOString(), actionCommand: 'show sequence 3 performance', actionLabel: 'Investigate' },
  { id: '3', severity: 'success', description: 'Meeting booked: Sarah Chen \u2192 Demo call Thursday', timeAgo: '1h ago', timestamp: new Date(Date.now() - 60 * 60_000).toISOString() },
  { id: '4', severity: 'info', description: 'Research job completed: 47 fintech CMOs found', timeAgo: '2h ago', timestamp: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), actionCommand: 'show research results', actionLabel: 'View' },
  { id: '5', severity: 'success', description: 'Pipeline value crossed $1.2M milestone', timeAgo: '3h ago', timestamp: new Date(Date.now() - 3 * 60 * 60_000).toISOString(), actionCommand: 'show pipeline health', actionLabel: 'Details' },
  { id: '6', severity: 'warning', description: 'Email deliverability score dipped to 94%', timeAgo: '4h ago', timestamp: new Date(Date.now() - 4 * 60 * 60_000).toISOString() },
  { id: '7', severity: 'info', description: 'New enrichment data available for 23 contacts', timeAgo: '5h ago', timestamp: new Date(Date.now() - 5 * 60 * 60_000).toISOString(), actionCommand: 'enrich new contacts', actionLabel: 'Enrich' },
  { id: '8', severity: 'success', description: 'Sequence #1 variant B outperforming A by 18%', timeAgo: '6h ago', timestamp: new Date(Date.now() - 6 * 60 * 60_000).toISOString() },
  { id: '9', severity: 'info', description: 'Weekly KPI report generated', timeAgo: '8h ago', timestamp: new Date(Date.now() - 8 * 60 * 60_000).toISOString() },
  { id: '10', severity: 'warning', description: 'Bounce rate spike on domain @techcorp.io', timeAgo: '12h ago', timestamp: new Date(Date.now() - 12 * 60 * 60_000).toISOString() },
];

function computeTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export async function GET() {
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ activities: DEMO_ACTIVITIES, dataSource: 'demo' });
  }

  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60_000).toISOString();

    const [commsRes, jobsRes, campaignsRes] = await Promise.all([
      supabase
        .from('communications')
        .select('id, channel, subject, status, replied_at, sent_at, created_at')
        .gte('created_at', fortyEightHoursAgo)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('research_jobs')
        .select('id, status, job_type, results_summary, completed_at, created_at')
        .gte('created_at', fortyEightHoursAgo)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('outreach_campaigns')
        .select('id, name, status, metrics, created_at')
        .gte('created_at', fortyEightHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    const activities: DemoActivity[] = [];

    // Transform communications
    for (const comm of commsRes.data || []) {
      const ts = comm.replied_at || comm.sent_at || comm.created_at;
      if (comm.replied_at) {
        activities.push({
          id: `comm-${comm.id}`,
          severity: 'success',
          description: `Reply received: ${comm.subject || comm.channel + ' message'}`,
          timeAgo: computeTimeAgo(ts),
          timestamp: ts,
        });
      } else if (comm.status === 'bounced') {
        activities.push({
          id: `comm-${comm.id}`,
          severity: 'warning',
          description: `Email bounced: ${comm.subject || 'Unknown subject'}`,
          timeAgo: computeTimeAgo(ts),
          timestamp: ts,
        });
      }
    }

    // Transform research jobs
    for (const job of jobsRes.data || []) {
      const ts = job.completed_at || job.created_at;
      const summary = job.results_summary as Record<string, unknown> | null;
      const found = summary?.prospects_found ?? 0;
      if (job.status === 'completed') {
        activities.push({
          id: `job-${job.id}`,
          severity: 'info',
          description: `Research completed: ${found} prospects found`,
          timeAgo: computeTimeAgo(ts),
          timestamp: ts,
          actionCommand: 'show research results',
          actionLabel: 'View',
        });
      } else if (job.status === 'failed') {
        activities.push({
          id: `job-${job.id}`,
          severity: 'critical',
          description: `Research job failed: ${job.job_type}`,
          timeAgo: computeTimeAgo(ts),
          timestamp: ts,
        });
      }
    }

    // Transform campaigns
    for (const camp of campaignsRes.data || []) {
      const ts = camp.created_at;
      const metrics = camp.metrics as Record<string, unknown> | null;
      if (camp.status === 'active' && metrics) {
        const meetings = typeof metrics.meetings === 'number' ? metrics.meetings : 0;
        if (meetings > 0) {
          activities.push({
            id: `camp-${camp.id}`,
            severity: 'success',
            description: `Campaign "${camp.name}": ${meetings} meetings booked`,
            timeAgo: computeTimeAgo(ts),
            timestamp: ts,
          });
        }
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (activities.length === 0) {
      return NextResponse.json({ activities: DEMO_ACTIVITIES, dataSource: 'demo' });
    }

    return NextResponse.json({ activities, dataSource: 'live' });
  } catch (error) {
    console.error('Activity route error:', error);
    return NextResponse.json({ activities: DEMO_ACTIVITIES, dataSource: 'demo' });
  }
}
