import { NextRequest, NextResponse } from 'next/server';
import { searchMovies } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    // const authHeader = request.headers.get('authorization') || undefined;
    
    // Verify authentication (optional for search, but will be used for tracking)
    // const user = await getUserFromToken(authHeader);
    
    // Get query from URL parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }
    
    // Search for movies via TMDB API
    const movies = await searchMovies(query);
    
    return NextResponse.json({ movies });
  } catch (error) {
    console.error('Movie search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 