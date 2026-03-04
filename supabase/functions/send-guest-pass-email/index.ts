import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GuestPassEmailRequest {
  guestPassId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service is not configured (missing RESEND_API_KEY)' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { guestPassId }: GuestPassEmailRequest = await req.json();

    if (!guestPassId) {
      return new Response(
        JSON.stringify({ error: 'guestPassId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch guest pass with related data
    const { data: guestPass, error: fetchError } = await supabase
      .from('guest_passes')
      .select(`
        *,
        host:user_id (full_name, email),
        event:event_id (title, event_datetime, location_name, location)
      `)
      .eq('id', guestPassId)
      .single();

    if (fetchError || !guestPass) {
      return new Response(
        JSON.stringify({ error: 'Guest pass not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate guest has email
    if (!guestPass.guest_email) {
      return new Response(
        JSON.stringify({ error: 'Guest email is required to send invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format event date
    const eventDate = new Date(guestPass.event.event_datetime);
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = eventDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const eventLocation = guestPass.event?.location_name || guestPass.event?.location || null;

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Corre App <noreply@correapp.com>',
        to: guestPass.guest_email,
        subject: `You're invited to ${guestPass.event.title}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0A0A0A;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #FF5722; font-size: 28px; font-weight: 900; font-style: italic; margin: 0;">CORRE</h1>
              </div>

              <!-- Main Content -->
              <div style="background-color: #1A1A1A; border-radius: 16px; padding: 32px; border: 1px solid #333;">
                <h2 style="color: #FFF; font-size: 24px; margin: 0 0 8px 0;">Hey ${guestPass.guest_name}!</h2>
                <p style="color: #AAA; font-size: 16px; margin: 0 0 24px 0;">
                  <strong style="color: #FFF;">${guestPass.host.full_name}</strong> has invited you to join them at an exclusive Corre event.
                </p>

                <!-- Event Card -->
                <div style="background: linear-gradient(135deg, #F59E0B, #D97706); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #FFF; font-size: 20px; margin: 0 0 16px 0;">${guestPass.event.title}</h3>
                  <p style="color: rgba(255,255,255,0.9); margin: 0 0 8px 0;">
                    <strong>Date:</strong> ${formattedDate}
                  </p>
                  <p style="color: rgba(255,255,255,0.9); margin: 0 0 8px 0;">
                    <strong>Time:</strong> ${formattedTime}
                  </p>
                  ${eventLocation ? `
                  <p style="color: rgba(255,255,255,0.9); margin: 0;">
                    <strong>Location:</strong> ${eventLocation}
                  </p>
                  ` : ''}
                </div>

                <!-- Verification Code -->
                <div style="background-color: #0A0A0A; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #333;">
                  <p style="color: #888; font-size: 12px; letter-spacing: 2px; margin: 0 0 12px 0; text-transform: uppercase;">
                    Your Check-in Code
                  </p>
                  <p style="color: #FFF; font-size: 36px; font-weight: 900; letter-spacing: 6px; margin: 0 0 12px 0; font-family: monospace;">
                    ${guestPass.verification_code}
                  </p>
                  <p style="color: #888; font-size: 14px; margin: 0;">
                    Show this code at the event entrance
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 32px;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  This is a guest pass invitation from Corre App.
                </p>
                <p style="color: #666; font-size: 12px; margin: 8px 0 0 0;">
                  Questions? Contact us at support@correapp.com
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Resend error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResult = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Guest pass email sent to ${guestPass.guest_email}`,
        emailId: emailResult.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
