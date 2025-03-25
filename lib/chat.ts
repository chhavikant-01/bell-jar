import { redis } from './redis';
import { prisma } from './db';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Generate a unique chat room ID
export const generateChatRoomId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

// Chat message interface
export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

// User interested in a movie
export interface InterestedUser {
  userId: string;
  username: string;
  movieId: number;
  timestamp: number;
}

// Find a match for a user interested in a movie
export const findMatch = async (
  userId: string,
  username: string,
  movieId: number
): Promise<string | null> => {
  try {
    // Check if the user already has an active chat
    const existingChat = await redis.get(`user:${userId}:active_chat`);
    if (existingChat) {
      console.log(`User ${userId} already has an active chat: ${existingChat}. Cleaning up before looking for a new match.`);
      await redis.del(`user:${userId}:active_chat`);
    }
    
    // Store this user's interest
    const userInterestKey = `interest:${movieId}:${userId}`;
    const userInterest: InterestedUser = {
      userId,
      username,
      movieId,
      timestamp: Date.now(),
    };
    
    // Store user interest for 1 hour
    await redis.set(userInterestKey, JSON.stringify(userInterest), 'EX', 3600);
    
    // Check for other interested users (excluding self)
    const interestPattern = `interest:${movieId}:*`;
    const interestedUserKeys = await redis.keys(interestPattern);
    
    console.log(`Found ${interestedUserKeys.length} interest keys for movie ${movieId}`);
    
    // No other users interested
    if (interestedUserKeys.length <= 1) {
      console.log(`No other users interested in movie ${movieId}, adding user ${userId} to waiting pool`);
      return null;
    }
    
    // Find an available user
    for (const key of interestedUserKeys) {
      // Skip self
      if (key === userInterestKey) continue;
      
      // Get interested user data
      const interestedUserJson = await redis.get(key);
      if (!interestedUserJson) continue;
      
      try {
        const interestedUser: InterestedUser = JSON.parse(interestedUserJson);
        
        // Skip if it's the same user (just to be extra safe)
        if (interestedUser.userId === userId) continue;
        
        console.log(`Found interested user ${interestedUser.userId} for movie ${movieId}`);
        
        // Check if the user is already in an active chat
        const isInActiveChat = await redis.get(`user:${interestedUser.userId}:active_chat`);
        if (isInActiveChat) {
          console.log(`User ${interestedUser.userId} is already in an active chat, skipping`);
          continue;
        }
        
        // Create a chat room
        const chatRoomId = generateChatRoomId();
        
        console.log(`Creating chat room ${chatRoomId} between user ${userId} and ${interestedUser.userId}`);
        
        // Set both users as in active chat
        await Promise.all([
          redis.set(`user:${userId}:active_chat`, chatRoomId, 'EX', 3600),
          redis.set(`user:${interestedUser.userId}:active_chat`, chatRoomId, 'EX', 3600),
          
          // Create chat room with movie context
          redis.hset(`chat_room:${chatRoomId}`, {
            movieId: movieId.toString(),
            user1: userId,
            user2: interestedUser.userId,
            startTime: Date.now().toString(),
          }),
          
          // Set TTL for chat room data (4 hours)
          redis.expire(`chat_room:${chatRoomId}`, 14400),
        ]);
        
        // Save active chats to database for both users
        await Promise.all([
          prisma.activeChat.create({
            data: {
              userId,
              chatRoomId,
              movieId,
              isActive: true,
            },
          }),
          prisma.activeChat.create({
            data: {
              userId: interestedUser.userId,
              chatRoomId,
              movieId,
              isActive: true,
            },
          }),
        ]);
        
        // Delete the interest keys now that they're matched
        await Promise.all([
          redis.del(userInterestKey),
          redis.del(key),
        ]);
        
        return chatRoomId;
      } catch (error) {
        console.error('Error parsing interested user:', error);
        continue;
      }
    }
    
    // No match found
    return null;
  } catch (error) {
    console.error('Error finding chat match:', error);
    return null;
  }
};

// Send a message to a chat room
export const sendMessage = async (
  chatRoomId: string,
  userId: string,
  username: string,
  text: string
): Promise<ChatMessage | null> => {
  try {
    // Check if chat room exists
    const chatRoomExists = await redis.exists(`chat_room:${chatRoomId}`);
    if (!chatRoomExists) {
      console.error(`Chat room ${chatRoomId} does not exist`);
      return null;
    }
    
    // Create message
    const message: ChatMessage = {
      id: crypto.randomBytes(8).toString('hex'),
      userId,
      username,
      text,
      timestamp: Date.now(),
    };
    
    console.log(`Sending message in chat:${chatRoomId}`, { id: message.id, text: text.substring(0, 30) });
    
    // Store message in Redis for history and reconnections
    // Limited to 50 messages per chat
    await redis.lpush(`messages:${chatRoomId}`, JSON.stringify(message));
    await redis.ltrim(`messages:${chatRoomId}`, 0, 49);
    
    // Set TTL for messages (4 hours)
    await redis.expire(`messages:${chatRoomId}`, 14400);
    
    // Also publish to Redis for any other services that might be listening
    await redis.publish(`chat:${chatRoomId}`, JSON.stringify(message));
    
    return message;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

// End a chat session
export const endChatSession = async (
  chatRoomId: string,
  userId: string
): Promise<boolean> => {
  try {
    // Get chat room info
    const chatRoom = await redis.hgetall(`chat_room:${chatRoomId}`);
    if (!chatRoom || (!chatRoom.user1 && !chatRoom.user2)) {
      return false;
    }
    
    // Check if user is part of this chat room
    if (chatRoom.user1 !== userId && chatRoom.user2 !== userId) {
      return false;
    }
    
    // Get the other user's ID
    const otherUserId = chatRoom.user1 === userId ? chatRoom.user2 : chatRoom.user1;
    
    // Send system message that this user has left
    const message: ChatMessage = {
      id: crypto.randomBytes(8).toString('hex'),
      userId: 'system',
      username: 'System',
      text: `Chat ended by user.`,
      timestamp: Date.now(),
    };
    
    await redis.publish(`chat:${chatRoomId}`, JSON.stringify(message));
    
    // Get all chat messages for this room to save to a file
    const chatMessages = await redis.lrange(`messages:${chatRoomId}`, 0, -1);
    
    // Create directory for chat logs if it doesn't exist
    const chatLogDir = path.join(process.cwd(), 'chat_logs');
    if (!fs.existsSync(chatLogDir)) {
      fs.mkdirSync(chatLogDir, { recursive: true });
    }
    
    // Format the chat messages as a readable text file
    const formattedMessages = chatMessages.map(msgJson => {
      try {
        const msg = JSON.parse(msgJson);
        const date = new Date(msg.timestamp).toLocaleString();
        if (msg.userId === 'system') {
          return `[${date}] SYSTEM: ${msg.text}`;
        } else {
          return `[${date}] ${msg.username}: ${msg.text}`;
        }
      } catch (err) {
        console.error('Error parsing message:', err);
        return `[Error parsing message]`;
      }
    }).reverse().join('\n');
    
    // Add chat metadata at the beginning of the file
    const chatMetadata = [
      `Chat Room: ${chatRoomId}`,
      `Movie ID: ${chatRoom.movieId || 'Unknown'}`,
      `Movie Title: ${chatRoom.movieTitle || 'Unknown'}`,
      `Started: ${new Date(parseInt(chatRoom.createdAt || '0')).toLocaleString()}`,
      `Ended: ${new Date().toLocaleString()}`,
      `Users: ${chatRoom.user1_username || 'Unknown'}, ${chatRoom.user2_username || 'Unknown'}`,
      `\n--- CHAT HISTORY ---\n`
    ].join('\n');
    
    // Save the chat history to a file
    const chatLogPath = path.join(chatLogDir, `chat_${chatRoomId}_${Date.now()}.txt`);
    fs.writeFileSync(chatLogPath, chatMetadata + formattedMessages);
    console.log(`Chat history saved to ${chatLogPath}`);
    
    // Clear user's active chat
    await redis.del(`user:${userId}:active_chat`);
    
    // Also clear the other user's active chat
    if (otherUserId) {
      await redis.del(`user:${otherUserId}:active_chat`);
    }
    
    // Update database for both users
    await prisma.activeChat.updateMany({
      where: {
        chatRoomId,
      },
      data: {
        isActive: false,
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error ending chat session:', error);
    return false;
  }
}; 