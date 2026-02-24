import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, signal_type, card_type, section, duration_ms, metadata } = body;

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
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Feedback insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
