import axios from 'axios';

// Base TMDB API configuration
const tmdbApi = axios.create({
  baseURL: process.env.TMDB_API_URL || 'https://api.themoviedb.org/3',
  headers: {
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Interface for movie search results
export interface MovieSearchResult {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  genre_ids: number[];
}

// Interface for movie details
export interface MovieDetails {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview: string;
  genres: { id: number; name: string }[];
  keywords: { keywords: { id: number; name: string }[] };
}

/**
 * Search for movies by query
 */
export const searchMovies = async (query: string): Promise<MovieSearchResult[]> => {
  try {
    const response = await tmdbApi.get('/search/movie', {
      params: {
        query,
        include_adult: false,
        language: 'en-US',
        page: 1,
      },
    });
    
    return response.data.results;
  } catch (error) {
    console.error('Error searching movies:', error);
    throw error; // Propagate the error for proper error handling in API routes
  }
};

/**
 * Get detailed information about a movie
 */
export const getMovieDetails = async (movieId: number): Promise<MovieDetails | null> => {
  try {
    const [detailsResponse, keywordsResponse] = await Promise.all([
      tmdbApi.get(`/movie/${movieId}`, {
        params: {
          language: 'en-US',
          append_to_response: 'keywords',
        },
      }),
      tmdbApi.get(`/movie/${movieId}/keywords`),
    ]);
    
    return {
      ...detailsResponse.data,
      keywords: keywordsResponse.data,
    };
  } catch (error) {
    console.error(`Error fetching movie details for ID ${movieId}:`, error);
    return null;
  }
};

/**
 * Get popular movies
 */
export const getPopularMovies = async (): Promise<MovieSearchResult[]> => {
  try {
    const response = await tmdbApi.get('/movie/popular', {
      params: {
        language: 'en-US',
        page: 1,
      },
    });
    
    return response.data.results;
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
};