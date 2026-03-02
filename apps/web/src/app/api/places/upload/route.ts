import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const BUCKET = 'place-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

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

function getSafeExtension(mimeType: string): string {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = (formData as unknown as { get: (name: string) => unknown }).get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Image file is required.' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Only PNG, JPG or WEBP files are allowed.' },
                { status: 400 }
            );
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Image must be 5MB or less.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = getSafeExtension(file.type);
        const objectPath = `places/${Date.now()}-${randomUUID()}.${ext}`;

        const adminClient = createServiceRoleClient();
        const { error: uploadError } = await adminClient.storage
            .from(BUCKET)
            .upload(objectPath, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            return NextResponse.json({ error: uploadError.message }, { status: 500 });
        }

        const { data: publicData } = adminClient.storage.from(BUCKET).getPublicUrl(objectPath);
        return NextResponse.json({ success: true, image_url: publicData.publicUrl });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected error uploading image.';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
