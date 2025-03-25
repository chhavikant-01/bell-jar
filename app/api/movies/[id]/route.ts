import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails } from '@/lib/tmdb';
import { getUserFromToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get movie ID from path
    const movieId = parseInt(id, 10);
    
    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: 'Invalid movie ID' },
        { status: 400 }
      );
    }
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization') || undefined;
    
    // Verify authentication (optional, but will be used for tracking)
    const user = await getUserFromToken(authHeader);
    
    // Get movie details from TMDB API
    const movieDetails = await getMovieDetails(movieId);
    
    if (!movieDetails) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }
    
    // If user is authenticated, save the movie to the database for future matching
    if (user) {
      // Check if the movie exists in the database
      let movie = await prisma.movie.findUnique({
        where: { id: movieId },
      });
      
      // If not, create the movie entry
      if (!movie) {
        movie = await prisma.movie.create({
          data: {
            id: movieId,
            title: movieDetails.title,
            posterPath: movieDetails.poster_path,
            releaseDate: movieDetails.release_date ? new Date(movieDetails.release_date) : null,
            overview: movieDetails.overview,
            genres: movieDetails.genres.map(genre => genre.name),
          },
        });
      }
    }
    
    return NextResponse.json({ movie: movieDetails });
  } catch (error) {
    console.error('Movie details error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 