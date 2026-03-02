import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type AdminAction = 'purge_cache' | 'reset_analytics';

interface ActionBody {
    action?: AdminAction;
}

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

function isAdminAction(value: unknown): value is AdminAction {
    return value === 'purge_cache' || value === 'reset_analytics';
}

export async function POST(request: Request) {
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

        const body = (await request.json()) as ActionBody;
        if (!isAdminAction(body.action)) {
            return NextResponse.json(
                { error: 'Invalid action. Expected purge_cache or reset_analytics.' },
                { status: 400 }
            );
        }

        const adminClient = createServiceRoleClient();
        const action = body.action;
        const nowIso = new Date().toISOString();

        const { data: opsRow, error: opsLookupError } = await adminClient
            .from('system_settings')
            .select('value')
            .eq('key', 'ops')
            .maybeSingle();

        if (opsLookupError) {
            return NextResponse.json({ error: opsLookupError.message }, { status: 500 });
        }

        const baseOpsValue: Record<string, unknown> =
            opsRow && typeof opsRow.value === 'object' && !Array.isArray(opsRow.value)
                ? { ...(opsRow.value as Record<string, unknown>) }
                : {};

        const nextOpsValue =
            action === 'purge_cache'
                ? {
                      ...baseOpsValue,
                      last_cache_purge_at: nowIso,
                      last_cache_purge_by: actor.id,
                  }
                : {
                      ...baseOpsValue,
                      last_analytics_reset_requested_at: nowIso,
                      last_analytics_reset_requested_by: actor.id,
                  };

        const { error: upsertOpsError } = await adminClient
            .from('system_settings')
            .upsert(
                {
                    key: 'ops',
                    value: nextOpsValue,
                    updated_at: nowIso,
                    updated_by: actor.id,
                },
                { onConflict: 'key' }
            );

        if (upsertOpsError) {
            return NextResponse.json({ error: upsertOpsError.message }, { status: 500 });
        }

        const { error: logError } = await adminClient.from('admin_action_logs').insert({
            actor_id: actor.id,
            action,
            details: {
                source: 'admin-dashboard-settings',
                at: nowIso,
            },
        });

        if (logError) {
            return NextResponse.json({ error: logError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            action,
            at: nowIso,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error running admin action.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
