import { randomBytes, randomInt, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

interface DecisionRequest {
  decision: 'approve' | 'decline';
  review_notes?: string;
  initial_password?: string;
}

interface PartnerApplicationRow {
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  business_description: string | null;
  contact_email: string | null;
  website_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
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

async function logAdminAction(
  adminClient: ReturnType<typeof createServiceRoleClient>,
  actorId: string,
  action: string,
  details: Record<string, unknown>
) {
  const { error } = await adminClient.from('admin_action_logs').insert({
    actor_id: actorId,
    action,
    details,
  });

  if (error) {
    console.warn('Failed to write admin action log:', error.message);
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generatePassword(length = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += chars[randomInt(0, chars.length)];
  }
  return output;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
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

    const body = (await request.json()) as Partial<DecisionRequest>;
    const decision = body.decision;
    const reviewNotes = (body.review_notes || '').trim();
    const providedPassword = (body.initial_password || '').trim();

    if (decision !== 'approve' && decision !== 'decline') {
      return NextResponse.json({ error: 'decision must be approve or decline.' }, { status: 400 });
    }

    const adminClient = createServiceRoleClient();
    const { data: application, error: applicationError } = await adminClient
      .from('partner_applications')
      .select(
        'id,full_name,email,business_name,business_description,contact_email,website_url,status'
      )
      .eq('id', applicationId)
      .maybeSingle<PartnerApplicationRow>();

    if (applicationError) {
      return NextResponse.json({ error: applicationError.message }, { status: 500 });
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: `Application already ${application.status}.` },
        { status: 409 }
      );
    }

    if (decision === 'decline') {
      const { error: declineError } = await adminClient
        .from('partner_applications')
        .update({
          status: 'rejected',
          review_notes: reviewNotes || null,
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (declineError) {
        return NextResponse.json({ error: declineError.message }, { status: 500 });
      }

      await logAdminAction(
        adminClient,
        actor.id,
        'partner_application.declined',
        {
          application_id: applicationId,
          email: application.email,
          business_name: application.business_name,
          review_notes: reviewNotes || null,
        }
      );

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    const fullName = application.full_name.trim();
    const email = application.email.trim().toLowerCase();
    const businessName = application.business_name.trim();
    const contactEmail = (application.contact_email || '').trim().toLowerCase();
    const businessDescription = (application.business_description || '').trim();
    const websiteUrl = (application.website_url || '').trim();

    if (!fullName || !email || !businessName) {
      return NextResponse.json(
        { error: 'Application is missing required fields (full_name, email, business_name).' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Application email is invalid.' }, { status: 400 });
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      return NextResponse.json({ error: 'Application contact email is invalid.' }, { status: 400 });
    }

    if (websiteUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(websiteUrl);
      } catch {
        return NextResponse.json({ error: 'Application website URL is invalid.' }, { status: 400 });
      }
    }

    const autoGeneratedPassword = providedPassword.length === 0;
    const password = autoGeneratedPassword ? generatePassword() : providedPassword;

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    let createdUserId: string | null = null;
    let createdAuthUser = false;
    let partnerSaved = false;
    let savedPartnerId: string | null = null;

    try {
      const { data: existingUserRow, error: existingUserError } = await adminClient
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUserError) {
        return NextResponse.json({ error: existingUserError.message }, { status: 500 });
      }

      if (existingUserRow?.id) {
        createdUserId = existingUserRow.id;
      } else {
        const { data: authCreated, error: authCreateError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

        if (authCreateError) {
          return NextResponse.json({ error: authCreateError.message }, { status: 400 });
        }

        createdUserId = authCreated.user?.id || null;
        createdAuthUser = true;
      }

      if (!createdUserId) {
        return NextResponse.json({ error: 'Auth user creation returned no user id.' }, { status: 500 });
      }

      // Trigger on auth.users should create public.users; wait briefly before fallback insert.
      let hasUserRow = false;
      for (let i = 0; i < 5; i += 1) {
        const { data: maybeUser } = await adminClient
          .from('users')
          .select('id')
          .eq('id', createdUserId)
          .maybeSingle();

        if (maybeUser?.id) {
          hasUserRow = true;
          break;
        }
        await sleep(200);
      }

      if (!hasUserRow) {
        const fallbackQrSecret = randomBytes(16).toString('hex');
        const { error: userInsertError } = await adminClient.from('users').insert({
          id: createdUserId,
          email,
          full_name: fullName,
          qr_code_secret: fallbackQrSecret,
          role: 'partner',
        });

        if (userInsertError) {
          return NextResponse.json({ error: userInsertError.message }, { status: 500 });
        }
      }

      const { error: userUpdateError } = await adminClient
        .from('users')
        .update({ full_name: fullName, email, role: 'partner' })
        .eq('id', createdUserId);

      if (userUpdateError) {
        return NextResponse.json({ error: userUpdateError.message }, { status: 500 });
      }

      const { data: existingPartner, error: existingPartnerError } = await adminClient
        .from('partners')
        .select('id')
        .eq('user_id', createdUserId)
        .maybeSingle();

      if (existingPartnerError) {
        return NextResponse.json({ error: existingPartnerError.message }, { status: 500 });
      }

      const partnerPayload = {
        user_id: createdUserId,
        business_name: businessName,
        business_description: businessDescription || null,
        contact_email: contactEmail || email,
        website_url: websiteUrl || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (existingPartner?.id) {
        const { error: partnerUpdateError } = await adminClient
          .from('partners')
          .update(partnerPayload)
          .eq('id', existingPartner.id);

        if (partnerUpdateError) {
          return NextResponse.json({ error: partnerUpdateError.message }, { status: 500 });
        }
        savedPartnerId = existingPartner.id;
      } else {
        savedPartnerId = randomUUID();
        const { error: partnerInsertError } = await adminClient
          .from('partners')
          .insert({ id: savedPartnerId, ...partnerPayload });

        if (partnerInsertError) {
          return NextResponse.json({ error: partnerInsertError.message }, { status: 500 });
        }
      }

      partnerSaved = true;

      const { error: approveError } = await adminClient
        .from('partner_applications')
        .update({
          status: 'approved',
          review_notes: reviewNotes || null,
          reviewed_by: actor.id,
          reviewed_at: new Date().toISOString(),
          created_partner_user_id: createdUserId,
          created_partner_id: savedPartnerId,
        })
        .eq('id', applicationId);

      if (approveError) {
        return NextResponse.json({ error: approveError.message }, { status: 500 });
      }

      await logAdminAction(
        adminClient,
        actor.id,
        'partner_application.approved',
        {
          application_id: applicationId,
          created_partner_user_id: createdUserId,
          created_partner_id: savedPartnerId,
          email,
          business_name: businessName,
          existing_user: !createdAuthUser,
          auto_generated_password: createdAuthUser && autoGeneratedPassword,
        }
      );

      return NextResponse.json({
        success: true,
        status: 'approved',
        user_id: createdUserId,
        partner_id: savedPartnerId,
        email,
        temporary_password: createdAuthUser && autoGeneratedPassword ? password : null,
        existing_user: !createdAuthUser,
      });
    } finally {
      // Best-effort rollback to avoid orphan auth accounts on partial failures.
      if (createdAuthUser && createdUserId && !partnerSaved) {
        await adminClient.auth.admin.deleteUser(createdUserId);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error deciding application.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
