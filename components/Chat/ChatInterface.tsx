/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { Input } from '../ui/Input';
import { Button } from '../ui/button';  

interface Message {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

interface ChatProps {
  chatRoomId: string;
  movieId: number;
  movieTitle: string;
  onEndChat: () => void;
}

const discussionQuestions = [
  "What did you think about the main character's development throughout the film?",
  "Did you find the ending satisfying? Why or why not?",
  "Which scene had the most impact on you and why?",
  "How would you compare this film to others in the same genre?",
  "If you could change one thing about the movie, what would it be?"
];

export const ChatInterface: React.FC<ChatProps> = ({
  chatRoomId,
  movieTitle,
  onEndChat,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [otherUser, setOtherUser] = useState<{ userId: string; username: string } | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [canEndChat, setCanEndChat] = useState(false);
  const [showEndChatConfirm, setShowEndChatConfirm] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // Connect to WebSocket and setup handlersend
  useEffect(() => {
    const token = localStorage.getItem('belljar_token');
    if (!token) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    console.log('Initializing socket connection...');
    
    // Disable any previous socket connection attempt
    if (socket) {
      socket.disconnect();
    }
    
    // Initialize socket connection with improved configuration
    const newSocket = io({
      path: '/api/socket',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // Using only polling for better reliability
      transports: ['polling']
    });

    // Setup connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);
      setIsConnected(true);
      setIsLoading(false);
      setError(''); // Clear any previous errors
      
      // Send authenticate event with token
      newSocket.emit('authenticate', token);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      let errorMessage = 'Unknown error';
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = err.message as string;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(`Connection error: ${errorMessage}`);
      setIsLoading(false);
    });
    
    newSocket.on('error', (err) => {
      console.error('Socket error:', err);
      let errorMessage = 'Unknown error';
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object') {
        errorMessage = err.message || JSON.stringify(err);
      }
      
      setError(`Socket error: ${errorMessage}`);
      setIsLoading(false);
    });

    newSocket.on('authenticated', () => {
      // Join the chat room after authentication
      newSocket.emit('join_room', chatRoomId);
    });

    newSocket.on('auth_error', (data) => {
      setError(data.message || 'Authentication failed');
      setIsLoading(false);
    });

    newSocket.on('chat_history', (data) => {
      if (data.chatRoomId === chatRoomId) {
        console.log('Received chat history:', data.messages);
        setMessages(data.messages || []);
        setIsLoading(false);
      }
    });

    newSocket.on('user_joined', (data) => {
      if (data.userId && data.username) {
        setOtherUser({
          userId: data.userId,
          username: data.username,
        });
        
        // Add system message about user joining
        const systemMessage: Message = {
          id: `system-${Date.now()}`,
          userId: 'system',
          username: 'System',
          text: `${data.username} has joined the chat.`,
          timestamp: Date.now(),
        };
        
        setMessages((prev) => [...prev, systemMessage]);
      }
    });

    newSocket.on('message', (message: Message) => {
      console.log('Received message from server:', message);
      
      // Check if we already have this message (in case of duplicates)
      setMessages((prev) => {
        // If we have a temporary message with the same text from the same user, replace it
        if (message.userId === JSON.parse(localStorage.getItem('belljar_user') || '{}').id) {
          const tempIndex = prev.findIndex(msg => 
            msg.id.startsWith('temp-') && 
            msg.text === message.text &&
            msg.userId === message.userId
          );
          
          if (tempIndex >= 0) {
            console.log('Replacing temporary message with server message');
            const newMessages = [...prev];
            newMessages[tempIndex] = message;
            return newMessages;
          }
        }
        
        // Check if this message ID already exists to avoid duplicates
        if (prev.some(msg => msg.id === message.id)) {
          console.log('Duplicate message detected, ignoring:', message.id);
          return prev; 
        }
        
        // Otherwise, add the new message
        return [...prev, message];
      });
      
      // If this is a user message (not system), check for answered questions
      if (message.userId !== 'system') {
        // Simple check if message contains meaningful response to the question
        if (message.text.length > 15) {
          // Consider the current question answered
          const updatedAnsweredQuestions = new Set(answeredQuestions);
          updatedAnsweredQuestions.add(currentQuestionIndex);
          setAnsweredQuestions(updatedAnsweredQuestions);
          
          // If at least 3 questions answered, allow ending chat
          if (updatedAnsweredQuestions.size >= 3) {
            setCanEndChat(true);
          }
        }
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });
    
    newSocket.on('chat_ended', (data) => {
      console.log('Chat ended by other user:', data);
      
      // Add a system message that the other user ended the chat
      const systemMessage: Message = {
        id: `system-${Date.now()}-ended`,
        userId: 'system',
        username: 'System',
        text: `Chat ended by ${data.username}.`,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, systemMessage]);
      
      // Show a notification and redirect after a short delay
      setTimeout(() => {
        alert('The other user has ended the chat.');
        onEndChat();
      }, 1500);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        newSocket.emit('leave_room', chatRoomId);
        newSocket.disconnect();
      }
    };
  }, [chatRoomId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const sendMessage = async () => {
    if (!inputMessage.trim() || !isConnected || !socket) return;
    
    try {
      const messageText = inputMessage.trim();
      
      // Clear the input right away for better UX
      setInputMessage('');
      
      // Before sending to server, show an optimistic update for better UX
      // This message will appear immediately while we wait for the server response
      const tempMessage: Message = {
        id: `temp-${Date.now()}`, // Temporary ID that will be replaced
        userId: JSON.parse(localStorage.getItem('belljar_user') || '{}').id,
        username: JSON.parse(localStorage.getItem('belljar_user') || '{}').username,
        text: messageText,
        timestamp: Date.now(),
      };
      
      // Add the temporary message to the UI
      setMessages(prev => [...prev, tempMessage]);
      
      // Send message via socket
      console.log('Sending message via socket:', messageText);
      socket.emit('chat_message', {
        chatRoomId,
        text: messageText
      });
      
      // Note: The server will send the message back with a proper ID
      // When we receive it, we'll update our messages state
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    }
  };

  // Handle ending the chat
  const handleEndChat = async () => {
    try {
      const token = localStorage.getItem('belljar_token');
      await axios.post(
        '/api/chat/end',
        { chatRoomId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (socket) {
        socket.emit('leave_room', chatRoomId);
      }
      
      onEndChat();
    } catch (error) {
      console.error('Error ending chat:', error);
      setError('Failed to end chat. Please try again.');
    }
  };

  // Open confirmation dialog for ending chat
  const openEndChatConfirm = () => {
    setShowEndChatConfirm(true);
  };

  // Close confirmation dialog without ending chat
  const cancelEndChat = () => {
    setShowEndChatConfirm(false);
  };

  // Confirm and end the chat
  const confirmEndChat = () => {
    setShowEndChatConfirm(false);
    handleEndChat();
  };

  // Handle keypress event for message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Show next discussion question
  const showNextQuestion = () => {
    setCurrentQuestionIndex((prevIndex) => (prevIndex + 1) % discussionQuestions.length);
  };

  // Add a function to send direct messages (for debugging)
  const sendDirectMessage = () => {
    if (!socket || !otherUser) return;
    
    // Get other socket IDs in the room
    console.log("Attempting to send direct debug message");
    
    // Emit a special event asking for active socket IDs in the room
    socket.emit('get_sockets_in_room', { chatRoomId }, (response: any) => {
      console.log("Socket IDs in room:", response);
      
      if (response && response.sockets && response.sockets.length > 0) {
        // Find sockets that don't belong to the current user
        const otherSockets = response.sockets.filter((socketId: string) => socketId !== socket.id);
        
        if (otherSockets.length > 0) {
          // Send to the first other socket
          const targetSocketId = otherSockets[0];
          console.log(`Sending direct message to socket ${targetSocketId}`);
          
          socket.emit('direct_message', {
            targetSocketId,
            text: `Debug message from ${JSON.parse(localStorage.getItem('belljar_user') || '{}').username} at ${new Date().toLocaleTimeString()}`
          });
        } else {
          console.log("No other sockets found in room");
        }
      } else {
        console.log("No active sockets found");
      }
    });
  };

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

  if (error) {
    return (
      <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={onEndChat} variant="secondary" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh] max-h-screen border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden bg-white/10 backdrop-blur-md">
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
        <div>
          <h3 className="font-medium text-lg">Discussing: {movieTitle}</h3>
          {otherUser && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Chatting with {otherUser.username}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={showNextQuestion}
            variant="secondary"
            className="text-xs py-1 px-3 h-8"
          >
            Next Topic
          </Button>
          <Button
            onClick={sendDirectMessage}
            variant="secondary"
            className="text-xs py-1 px-3 h-8"
          >
            Debug
          </Button>
          <Button
            onClick={openEndChatConfirm}
            variant="primary"
            className="text-xs py-1 px-3 h-8"
          >
            End Chat
          </Button>
        </div>
      </div>

      {/* Discussion question */}
      <div className="p-3 bg-pink-50 dark:bg-pink-900/20 border-b border-pink-200 dark:border-pink-800">
        <p className="text-sm font-medium text-pink-800 dark:text-pink-300">
          Discussion Topic: {discussionQuestions[currentQuestionIndex]}
        </p>
        <div className="mt-1 flex">
          {discussionQuestions.map((_, index) => (
            <div
              key={index}
              className={`h-1 w-5 rounded mr-1 ${
                answeredQuestions.has(index)
                  ? 'bg-green-500 dark:bg-green-400'
                  : index === currentQuestionIndex
                  ? 'bg-pink-500 dark:bg-pink-400'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={chatAreaRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-white/5 to-white/20 dark:from-gray-900/10 dark:to-gray-900/20"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                message.userId === 'system'
                  ? 'justify-center'
                  : message.userId === JSON.parse(localStorage.getItem('belljar_user') || '{}').id
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              {message.userId === 'system' ? (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-500 dark:text-gray-400 max-w-[80%]">
                  {message.text}
                </div>
              ) : (
                <div 
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    message.userId === JSON.parse(localStorage.getItem('belljar_user') || '{}').id
                      ? 'bg-purple-500 text-white rounded-br-none'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{message.username}</span>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="mt-1 break-words">{message.text}</p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="p-3 border-t border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
        <div className="flex gap-2">
          <Input
            fullWidth
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={!isConnected}
            className="bg-white dark:bg-gray-800"
          />
          <Button
            onClick={sendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            variant="primary"
          >
            Send
          </Button>
        </div>
        {!isConnected && (
          <p className="text-xs text-red-500 mt-1">
            Disconnected. Trying to reconnect...
          </p>
        )}
        {canEndChat ? (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            You&apos;ve discussed enough topics! You can end the chat or continue talking.
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">
            Discuss at least 3 topics before ending the chat.
          </p>
        )}
      </div>

      {/* End Chat Confirmation Dialog */}
      {showEndChatConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">End Chat?</h3>
            <p className="mb-6">
              Are you sure you want to end this chat? This will end the conversation for both users,
              and the chat history will be saved.
            </p>
            <div className="flex justify-end gap-3">
              <Button onClick={cancelEndChat} variant="secondary">
                Cancel
              </Button>
              <Button onClick={confirmEndChat} variant="primary">
                End Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 