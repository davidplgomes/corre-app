import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing server Supabase configuration.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: actor },
      error: actorError,
    } = await supabase.auth.getUser();

    if (actorError || !actor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: actorProfile, error: actorProfileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', actor.id)
      .maybeSingle();

    if (actorProfileError) {
      return NextResponse.json({ error: actorProfileError.message }, { status: 500 });
    }

    if (!actorProfile || actorProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').trim();

    const adminClient = createServiceRoleClient();
    let query = adminClient
      .from('partner_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ applications: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error loading applications.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
