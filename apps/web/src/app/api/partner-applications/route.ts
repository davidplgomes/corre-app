import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

interface SubmitPartnerApplicationRequest {
  full_name: string;
  email: string;
  phone?: string;
  phone_country_code?: string;
  business_name: string;
  club_benefits: string;
  staff_benefits: string;
  poc_name: string;
  category: string;
  category_other?: string;
  membership: string;
  start_date?: string;
  logo_url?: string;
  business_description?: string;
  contact_email?: string;
  website_url?: string;
  instagram_handle?: string;
  business_address?: string;
  city?: string;
  country?: string;
  partnership_focus?: string[];
  notes?: string;
}

const CATEGORY_OPTIONS = new Set([
  'Barber Shop',
  'Beauty Salon',
  'Physiotherapy Clinic',
  'Massage',
  'Supplements',
  'Medical Clinic',
  'Dental Practice',
  'Gym',
  'Restaurant',
  'Clothing Shop',
  'Hotel',
  'Travel Agency',
  'Tour Operator',
  'Other',
]);

const MEMBERSHIP_OPTIONS = new Set(['Free', 'Monthly', 'Annual']);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

function normalizeFocus(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, 8);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SubmitPartnerApplicationRequest>;
    const fullName = (body.full_name || body.poc_name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phoneCountryCode = (body.phone_country_code || '').trim();
    const phone = (body.phone || '').trim();
    const businessName = (body.business_name || '').trim();
    const clubBenefits = (body.club_benefits || '').trim();
    const staffBenefits = (body.staff_benefits || '').trim();
    const pocName = (body.poc_name || '').trim();
    const category = (body.category || '').trim();
    const categoryOther = (body.category_other || '').trim();
    const membership = (body.membership || '').trim();
    const startDate = (body.start_date || '').trim();
    const logoUrl = (body.logo_url || '').trim();
    const businessDescription = (body.business_description || '').trim();
    const contactEmail = (body.contact_email || '').trim().toLowerCase();
    const websiteUrl = (body.website_url || '').trim();
    const instagramHandle = (body.instagram_handle || '').trim();
    const businessAddress = (body.business_address || '').trim();
    const city = (body.city || '').trim();
    const country = (body.country || '').trim();
    const notes = (body.notes || '').trim();
    const partnershipFocus = normalizeFocus(body.partnership_focus);

    if (
      !businessName ||
      !clubBenefits ||
      !staffBenefits ||
      !pocName ||
      !phone ||
      !instagramHandle ||
      !category ||
      !membership ||
      !email
    ) {
      return NextResponse.json(
        {
          error:
            'business_name, club_benefits, staff_benefits, poc_name, phone, instagram_handle, category, membership and email are required.',
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    if (contactEmail && !isValidEmail(contactEmail)) {
      return NextResponse.json({ error: 'Invalid contact email format.' }, { status: 400 });
    }

    if (!CATEGORY_OPTIONS.has(category)) {
      return NextResponse.json({ error: 'Invalid category option.' }, { status: 400 });
    }

    if (category === 'Other' && !categoryOther) {
      return NextResponse.json({ error: 'Please specify category when selecting Other.' }, { status: 400 });
    }

    if (!MEMBERSHIP_OPTIONS.has(membership)) {
      return NextResponse.json({ error: 'Invalid membership option.' }, { status: 400 });
    }

    if (websiteUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(websiteUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid website URL.' }, { status: 400 });
      }
    }

    if (logoUrl) {
      try {
        // eslint-disable-next-line no-new
        new URL(logoUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid logo URL.' }, { status: 400 });
      }
    }

    let normalizedStartDate: string | null = null;
    if (startDate) {
      const date = new Date(startDate);
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid start date.' }, { status: 400 });
      }
      normalizedStartDate = date.toISOString().slice(0, 10);
    }

    const adminClient = createServiceRoleClient();

    const { data: existingPending, error: pendingLookupError } = await adminClient
      .from('partner_applications')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingLookupError) {
      return NextResponse.json({ error: pendingLookupError.message }, { status: 500 });
    }

    if (existingPending?.id) {
      return NextResponse.json(
        { error: 'An application with this email is already pending review.' },
        { status: 409 }
      );
    }

    const { data: existingUser, error: userLookupError } = await adminClient
      .from('users')
      .select('id,role')
      .eq('email', email)
      .maybeSingle();

    if (userLookupError) {
      return NextResponse.json({ error: userLookupError.message }, { status: 500 });
    }

    if (existingUser?.role === 'partner') {
      return NextResponse.json(
        { error: 'This email is already linked to a partner account.' },
        { status: 409 }
      );
    }

    const { data, error } = await adminClient
      .from('partner_applications')
      .insert({
        full_name: fullName,
        email,
        phone: phone || null,
        phone_country_code: phoneCountryCode || null,
        business_name: businessName,
        club_benefits: clubBenefits,
        staff_benefits: staffBenefits,
        poc_name: pocName,
        category,
        category_other: category === 'Other' ? categoryOther : null,
        membership,
        start_date: normalizedStartDate,
        logo_url: logoUrl || null,
        business_description: businessDescription || null,
        contact_email: contactEmail || null,
        website_url: websiteUrl || null,
        instagram_handle: instagramHandle || null,
        business_address: businessAddress || null,
        city: city || null,
        country: country || null,
        partnership_focus: partnershipFocus,
        notes: notes || null,
        status: 'pending',
      })
      .select('id,created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        application_id: data.id,
        created_at: data.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error submitting application.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
