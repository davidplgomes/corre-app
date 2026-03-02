import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export type AdminContext = {
    userId: string;
};

export function getServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error('Missing Supabase service configuration');
    }

    return createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function ensureAdmin(): Promise<
    { ok: true; context: AdminContext } | { ok: false; response: NextResponse }
> {
    const supabase = await createServerSupabaseClient();
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    const { data: actor, error: actorError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (actorError) {
        return {
            ok: false,
            response: NextResponse.json({ error: actorError.message }, { status: 500 }),
        };
    }

    if (!actor || actor.role !== 'admin') {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        };
    }

    return {
        ok: true,
        context: { userId: user.id },
    };
}

export async function logAdminAction(
    adminClient: ReturnType<typeof getServiceClient>,
    actorId: string,
    action: string,
    details: Record<string, unknown>
) {
    const { error } = await adminClient
        .from('admin_action_logs' as any)
        .insert({
            actor_id: actorId,
            action,
            details,
        } as any);

    if (error) {
        console.warn('Failed to write admin action log:', error.message);
    }
}
