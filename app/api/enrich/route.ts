import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { invokeOpenClawTool, isOpenClawAvailable } from '@/lib/research/openclaw-client';

const MAX_PROSPECT_IDS = 50;

export async function POST(request: Request) {
  if (!isOpenClawAvailable()) {
    return NextResponse.json(
      { error: 'Enrichment service not configured' },
      { status: 503 }
    );
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  let body: { prospectIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { prospectIds } = body;
  if (!Array.isArray(prospectIds) || prospectIds.length === 0) {
    return NextResponse.json(
      { error: 'prospectIds must be a non-empty array' },
      { status: 400 }
    );
  }

  if (prospectIds.length > MAX_PROSPECT_IDS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PROSPECT_IDS} prospects per request` },
      { status: 400 }
    );
  }

  // Fetch prospects from Supabase
  const { data: prospects, error: fetchError } = await supabase
    .from('prospects')
    .select('id, person_name, person_email, company_name, source_provider_id')
    .in('id', prospectIds);

  if (fetchError) {
    console.error('Enrich fetch error:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch prospects' }, { status: 500 });
  }

  if (!prospects || prospects.length === 0) {
    return NextResponse.json({ enriched: 0, failed: 0 });
  }

  let enriched = 0;
  let failed = 0;

  // Enrich each prospect via OpenClaw
  await Promise.all(
    prospects.map(async (prospect) => {
      try {
        const enrichment = await invokeOpenClawTool('enrich_person', {
          name: prospect.person_name,
          email: prospect.person_email,
          company: prospect.company_name,
        });

        const { error: updateError } = await supabase
          .from('prospects')
          .update({
            enrichment_data: enrichment,
            enrichment_status: 'enriched',
          })
          .eq('id', prospect.id);

        if (updateError) {
          console.error(`Enrich update error for ${prospect.id}:`, updateError);
          failed++;
        } else {
          enriched++;
        }
      } catch (err) {
        console.error(`Enrich failed for ${prospect.id}:`, err);
        failed++;
      }
    })
  );

  return NextResponse.json({ enriched, failed });
}
