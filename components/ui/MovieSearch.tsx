import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Input } from './Input';

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
}

interface MovieSearchProps {
  onSelect: (movie: Movie) => void;
  className?: string;
}

export const MovieSearch: React.FC<MovieSearchProps> = ({ onSelect, className = '' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      
      axios.get(`/api/movies/search?query=${encodeURIComponent(query)}`)
        .then(response => {
          setResults(response.data.movies.slice(0, 5));
          setIsOpen(true);
        })
        .catch(error => {
          console.error('Error searching movies:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (movie: Movie) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(movie);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getFullYear();
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Input 
        fullWidth
        placeholder="Search for a movie..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
        className="bg-white/10 backdrop-blur-sm"
      />
      
      {isLoading && (
        <div className="absolute right-3 top-3">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full"
          />
        </div>
      )}
      
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden border border-purple-500/20 dark:border-purple-300/20"
          >
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-auto">
              {results.map((movie) => (
                <motion.li
                  key={movie.id}
                  whileHover={{ backgroundColor: 'rgba(219, 39, 119, 0.1)' }}
                  className="px-4 py-2 cursor-pointer flex items-center gap-3"
                  onClick={() => handleSelect(movie)}
                >
                  {movie.poster_path ? (
                    <img 
                      src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`} 
                      alt={movie.title}
                      className="w-10 h-15 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-15 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{movie.title}</p>
                    {movie.release_date && (
                      <p className="text-sm text-gray-500">{formatDate(movie.release_date)}</p>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 