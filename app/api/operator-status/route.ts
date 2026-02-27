import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authenticate } from '@/lib/api-auth';

const DEMO_STATUS = {
  overrides_today: 2,
  overrides_week: 8,
  target_override_rate: 5,
  current_override_rate: 4.2,
  status: 'healthy',
  last_updated: '',
};

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json({ ...DEMO_STATUS, last_updated: new Date().toISOString(), dataSource: 'demo' });
  }

  try {
    const [activeJobsRes, pendingApprovalRes] = await Promise.all([
      supabase.from('research_jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('communications').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    ]);

    const activeJobs = activeJobsRes.count ?? 0;
    const pendingApproval = pendingApprovalRes.count ?? 0;

    // If no data at all, return demo
    if (activeJobs === 0 && pendingApproval === 0) {
      const totalJobs = await supabase.from('research_jobs').select('id', { count: 'exact', head: true });
      if (!totalJobs.count || totalJobs.count === 0) {
        return NextResponse.json({ ...DEMO_STATUS, last_updated: new Date().toISOString(), dataSource: 'demo' });
      }
    }

    const overrideRate = pendingApproval > 0 ? Math.round((pendingApproval / Math.max(activeJobs, 1)) * 100) / 10 : 0;
    const status = overrideRate > 10 ? 'critical' : overrideRate > 5 ? 'warning' : 'healthy';

    return NextResponse.json({
      overrides_today: pendingApproval,
      overrides_week: pendingApproval * 3, // estimate
      target_override_rate: 5,
      current_override_rate: overrideRate,
      status,
      last_updated: new Date().toISOString(),
      dataSource: 'live',
    });
  } catch (error) {
    console.error('Operator status route error:', error);
    return NextResponse.json({ ...DEMO_STATUS, last_updated: new Date().toISOString(), dataSource: 'demo' });
  }
}
