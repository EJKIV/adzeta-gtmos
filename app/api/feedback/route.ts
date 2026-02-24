import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: Request) {
  try {
    // Check env vars
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing database configuration' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { user_id, signal_type, card_type, section, duration_ms, metadata, context } = body;

    if (!user_id || !signal_type) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, signal_type' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('feedback_signals')
      .insert({
        user_id,
        signal_type,
        card_type,
        section,
        duration_ms,
        metadata: metadata || {},
        context: context || {},
        timestamp: new Date().toISOString(),
        processed: false
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
