/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MovieSearch } from '../ui/MovieSearch';
import { Button } from '../ui/button';
import { ChatInterface } from '../Chat/ChatInterface';

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  overview?: string;
}

interface User {
  id: string;
  username: string;
}

interface ChatMatchResult {
  matched: boolean;
  chatRoomId?: string;
}

const DashboardContent: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [waitingForMatch, setWaitingForMatch] = useState(false);
  const [matchResult, setMatchResult] = useState<ChatMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const matchPollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check if user is authenticated when component loads
  useEffect(() => {
    const storedUser = localStorage.getItem('belljar_user');
    const token = localStorage.getItem('belljar_token');
    
    if (!storedUser || !token) {
      router.push('/auth');
    } else {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('belljar_user');
        localStorage.removeItem('belljar_token');
        console.error('Error parsing user data:', e);
        router.push('/auth');
      }
    }
    
    setIsLoading(false);
  }, [router]);
  
  // Handle movie selection
  const handleMovieSelect = (movie: Movie) => {
    setSelectedMovie(movie);
    setMatchResult(null);
    setError(null);
  };
  
  // Handle finding a chat match
  const findChatMatch = async () => {
    if (!selectedMovie) return;
    
    setWaitingForMatch(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('belljar_token');
      
      const response = await axios.post(
        '/api/chat/match',
        { movieId: selectedMovie.id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const { matched, chatRoomId } = response.data;
      setMatchResult({ matched, chatRoomId });
      
      // If not matched immediately, start polling for matches
      if (!matched) {
        startPollingForMatch();
      }
    } catch (error: any) {
      console.error('Error finding match:', error);
      setError(error.response?.data?.error || 'Failed to find match. Please try again.');
      setWaitingForMatch(false);
    }
  };
  
  // Poll for match status
  const startPollingForMatch = () => {
    // Clear previous interval if exists
    if (matchPollingIntervalRef.current) {
      clearInterval(matchPollingIntervalRef.current);
      matchPollingIntervalRef.current = null;
    }
    
    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('belljar_token');
        
        // Use a simple endpoint to check if user has been matched
        const response = await axios.get('/api/chat/status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const { isMatched, chatRoomId } = response.data;
        
        if (isMatched && chatRoomId) {
          console.log('Match found! Chat room ID:', chatRoomId);
          
          // Validate the chat room to ensure it's a proper match
          try {
            // Make a request to check that the chat room exists with valid data
            const validateResponse = await axios.get(`/api/chat/validate?chatRoomId=${chatRoomId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (validateResponse.data.valid) {
              setMatchResult({ matched: true, chatRoomId });
              setWaitingForMatch(false);
              
              if (matchPollingIntervalRef.current) {
                clearInterval(matchPollingIntervalRef.current);
                matchPollingIntervalRef.current = null;
              }
            } else {
              console.error('Invalid chat room:', validateResponse.data.reason);
              // Clear the invalid match state
              await axios.post('/api/chat/reset', null, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
            }
          } catch (validationError) {
            console.error('Error validating chat room:', validationError);
          }
        }
      } catch (error) {
        console.error('Error polling for match:', error);
      }
    }, 3000); // Poll every 3 seconds
    
    // Store interval ID in ref
    matchPollingIntervalRef.current = pollInterval;
    
    // Clear interval after 2 minutes to prevent endless polling
    setTimeout(() => {
      if (matchPollingIntervalRef.current) {
        clearInterval(matchPollingIntervalRef.current);
        matchPollingIntervalRef.current = null;
      }
      
      if (waitingForMatch) {
        setWaitingForMatch(false);
        setError('No match found. Please try again or select a different movie.');
      }
    }, 120000);
  };
  
  // Handle ending a chat and cleanup
  const handleEndChat = () => {
    setMatchResult(null);
    setSelectedMovie(null);
    setWaitingForMatch(false);
    
    // Clear any existing polling interval
    if (matchPollingIntervalRef.current) {
      clearInterval(matchPollingIntervalRef.current);
      matchPollingIntervalRef.current = null;
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('belljar_user');
    localStorage.removeItem('belljar_token');
    router.push('/auth');
  };
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (matchPollingIntervalRef.current) {
        clearInterval(matchPollingIntervalRef.current);
      }
    };
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }
  
  // If a chat match is found and active, show the chat interface
  if (matchResult?.matched && matchResult.chatRoomId && selectedMovie) {
    return (
      <ChatInterface
        chatRoomId={matchResult.chatRoomId}
        movieId={selectedMovie.id}
        movieTitle={selectedMovie.title}
        onEndChat={handleEndChat}
      />
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome section */}
      <div className="glass-card rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome, {user?.username}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Find a movie to discuss with other cinephiles
            </p>
          </div>
          <Button onClick={handleLogout} variant="secondary">
            Logout  
          </Button>
        </div>
      </div>
      
      {/* Movie search section */}
      <div className="glass-card rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          What would you like to discuss?
        </h2>
        
        <MovieSearch onSelect={handleMovieSelect} className="mb-6" />
        
        {/* Selected movie */}
        <AnimatePresence>
          {selectedMovie && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-4 bg-white/20 dark:bg-gray-800/20 rounded-lg p-4 mt-4"
            >
              {selectedMovie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`}
                  alt={selectedMovie.title}
                  className="h-32 object-cover rounded-md"
                />
              ) : (
                <div className="w-20 h-32 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
                  No Image
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {selectedMovie.title}
                </h3>
                {selectedMovie.release_date && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(selectedMovie.release_date).getFullYear()}
                  </p>
                )}
                {selectedMovie.overview && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                    {selectedMovie.overview}
                  </p>
                )}
                
                <div className="mt-4">
                  <Button
                    onClick={findChatMatch}
                    disabled={waitingForMatch}
                    variant="primary"
                  >
                    {waitingForMatch ? (
                      <span className="flex items-center">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Looking for a match...
                      </span>
                    ) : (
                      'Find Someone to Chat With'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Match status messages */}
        <AnimatePresence>
          {matchResult && !matchResult.matched && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30 rounded-md p-4 mt-4"
            >
              <p className="text-purple-700 dark:text-purple-300 text-center">
                Waiting for someone else who wants to discuss this movie... 
                <br />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  (You can wait or try a different movie)
                </span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-md p-4 mt-4"
            >
              <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Popular movies suggestion */}
      <div className="glass-card rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Need inspiration?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Here are some popular movies being discussed right now:
        </p>
        
        {/* This would pull from your API, but we'll put skeleton placeholders for now */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="bg-white/20 dark:bg-gray-800/20 rounded-md aspect-[2/3] animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardContent; 