import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const input = request.nextUrl.searchParams.get('input');

    if (!input || input.length < 2) {
        return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: 'Google Maps API key not configured' },
            { status: 500 }
        );
    }

    try {
        // Use Google Places API (New) - Autocomplete endpoint
        const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
            },
            body: JSON.stringify({
                input,
                includedPrimaryTypes: ['geocode', 'establishment'],
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('Places Autocomplete error:', data.error);
            return NextResponse.json(
                { error: 'Failed to fetch suggestions' },
                { status: 502 }
            );
        }

        const predictions = (data.suggestions || [])
            .filter((s: { placePrediction?: unknown }) => s.placePrediction)
            .map((s: { placePrediction: { placeId: string; text: { text: string } } }) => ({
                place_id: s.placePrediction.placeId,
                description: s.placePrediction.text.text,
            }));

        return NextResponse.json({ predictions });
    } catch (error) {
        console.error('Places Autocomplete error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
