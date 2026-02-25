import { NextRequest, NextResponse } from 'next/server';
import { executeSkill, executeFromText } from '@/lib/skills/executor';

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

export async function POST(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    // Structured invocation: { skillId, params }
    if (typeof body.skillId === 'string') {
      const output = await executeSkill({
        skillId: body.skillId,
        params: (body.params as Record<string, unknown>) ?? {},
        context: { source: 'api' },
      });
      return NextResponse.json(output);
    }

    // Natural language invocation: { text }
    if (typeof body.text === 'string') {
      const output = await executeFromText(body.text, { source: 'api' });
      return NextResponse.json(output);
    }

    return NextResponse.json(
      { error: 'Request must include "text" (string) or "skillId" (string)' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
