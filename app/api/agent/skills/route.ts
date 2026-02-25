import { NextRequest, NextResponse } from 'next/server';
import { skillRegistry } from '@/lib/skills/registry';

// Import handlers to ensure they self-register
import '@/lib/skills/handlers/analytics-pipeline';
import '@/lib/skills/handlers/analytics-kpi';
import '@/lib/skills/handlers/research-search';
import '@/lib/skills/handlers/intel-recommendations';
import '@/lib/skills/handlers/system-help';

function authenticate(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const apiKey = process.env.OPENCLAW_API_KEY;
    if (apiKey && token === apiKey) return true;
  }
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const skills = skillRegistry.listAll().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    domain: s.domain,
    inputSchema: s.inputSchema,
    responseType: s.responseType,
    estimatedMs: s.estimatedMs,
    examples: s.examples,
  }));

  return NextResponse.json({ skills, count: skills.length });
}
