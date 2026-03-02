import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const placeId = request.nextUrl.searchParams.get('place_id');

    if (!placeId) {
        return NextResponse.json(
            { error: 'place_id is required' },
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
        // Use Google Places API (New) - Place Details endpoint
        const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'displayName,formattedAddress,location,photos',
            },
        });

        const data = await response.json();

        if (data.error) {
            console.error('Places Details error:', data.error);
            return NextResponse.json(
                { error: 'Failed to fetch place details' },
                { status: 502 }
            );
        }

        // Get a proper photo URL if photos exist
        let photoUrl = null;
        if (data.photos && data.photos.length > 0) {
            const photoName = data.photos[0].name;
            try {
                const photoRes = await fetch(
                    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true&key=${apiKey}`
                );
                const photoData = await photoRes.json();
                photoUrl = photoData.photoUri || null;
            } catch {
                // Photo fetch failed, continue without it
            }
        }

        return NextResponse.json({
            formatted_address: data.formattedAddress,
            name: data.displayName?.text,
            lat: data.location?.latitude,
            lng: data.location?.longitude,
            photo_url: photoUrl,
        });
    } catch (error) {
        console.error('Places Details error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
