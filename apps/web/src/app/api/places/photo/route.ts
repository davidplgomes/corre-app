import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const photoUri = request.nextUrl.searchParams.get('photo_uri');

    if (!photoUri) {
        return NextResponse.json(
            { error: 'photo_uri is required' },
            { status: 400 }
        );
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Google Maps API key not configured' },
            { status: 500 }
        );
    }

    try {
        // Use Google Places API (New) - Photo endpoint
        const response = await fetch(
            `https://places.googleapis.com/v1/${photoUri}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`
        );

        const data = await response.json();

        if (data.error) {
            console.error('Places Photo error:', data.error);
            return NextResponse.json(
                { error: 'Failed to fetch photo' },
                { status: 502 }
            );
        }

        return NextResponse.json({ photoUrl: data.photoUri });
    } catch (error) {
        console.error('Places Photo error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
