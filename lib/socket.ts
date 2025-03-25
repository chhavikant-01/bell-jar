/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { NextApiRequest } from 'next';
import { redis } from './redis';
import { verifyToken } from './auth';
import { createAdapter } from '@socket.io/redis-adapter';

// Extended NextAPI request with socket server
export interface SocketNextApiRequest extends Omit<NextApiRequest, 'socket'> {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
}

// This is a singleton to avoid creating multiple socket servers
export const getSocketIO = (req: SocketNextApiRequest) => {
  try {
    // Check if server already exists
    if (req.socket.server.io) {
      console.log("Reusing existing Socket.IO server");
      return req.socket.server.io;
    }
    
    console.log("Creating new Socket.IO server instance");
    
    // Create Redis clients for adapter
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    
    // Create a new Socket.IO server
    const io = new SocketIOServer(req.socket.server, {
      path: '/api/socket',
      transports: ['polling'],
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
      },
      connectTimeout: 10000,
      pingTimeout: 5000,
      pingInterval: 10000,
      upgradeTimeout: 5000, 
      allowUpgrades: false, // Disable WebSocket upgrades in serverless environment
      cookie: false // Disable socket.io cookie in serverless environment
    });
    
    // Set up Socket.IO Redis adapter
    io.adapter(createAdapter(pubClient, subClient));
    
    // Create a dedicated Redis client for pub/sub
    const redisSub = redis.duplicate();
    
    // Set up Redis pub/sub for cross-instance messaging
    redisSub.on('error', (err) => {
      console.error('Redis subscription error:', err);
    });
    
    // Clear any existing subscriptions to avoid duplicate messages
    redisSub.unsubscribe().catch((err) => {
      console.log('Unsubscribe error (can be ignored):', err.message);
    });
    
    // Subscribe to the global chat channel
    redisSub.subscribe('chat:messages').then(() => {
      console.log('[REDIS] Successfully subscribed to chat:messages channel');
    }).catch(err => {
      console.error('[REDIS] Failed to subscribe to chat channel:', err);
    });
    
    // Global handler for Redis messages
    redisSub.on('messageBuffer', (channel, message) => {
      const channelStr = channel.toString();
      const messageStr = message.toString();
      console.log(`[REDIS] Received raw message on channel ${channelStr}`);
      
      try {
        const data = JSON.parse(messageStr);
        
        if (channelStr === 'chat:messages' && data && data.roomId && data.messageData) {
          console.log(`[REDIS] Processing message for room ${data.roomId}`);
          
          // Skip messages from the same socket to avoid duplicates
          const socketId = data.sourceSocketId || null;
          
          // Get all sockets in the room
          const roomSockets = io.sockets.adapter.rooms.get(data.roomId);
          if (roomSockets) {
            console.log(`[REDIS] Broadcasting to ${roomSockets.size} clients in room ${data.roomId}`);
            
            // Send to each socket in the room (except source if specified)
            for (const sid of roomSockets) {
              if (sid !== socketId) {
                console.log(`[REDIS] Sending to socket ${sid}`);
                const socket = io.sockets.sockets.get(sid);
                if (socket) {
                  socket.emit('message', data.messageData);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('[REDIS] Error processing message:', error);
      }
    });
    
    // Store io instance on the server
    req.socket.server.io = io;

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.onAny((event) => {
        console.log(`Received event: ${event}`);
      });
      
      // Authenticate socket connection
      socket.on('authenticate', async (token: string) => {
        try {
          if (!token || typeof token !== 'string') {
            console.error(`Invalid token format received from socket ${socket.id}`);
            socket.emit('auth_error', { message: 'Invalid token format' });
            return;
          }
          
          const decoded = verifyToken(token);
          
          if (!decoded) {
            console.error(`Authentication failed for socket ${socket.id}: Invalid token`);
            socket.emit('auth_error', { message: 'Invalid token' });
            return;
          }
          
          // Attach user info to socket
          socket.data.user = {
            id: decoded.userId,
            username: decoded.username,
          };
          
          socket.emit('authenticated', { success: true });
          console.log(`User ${decoded.username} (${decoded.userId}) authenticated on socket ${socket.id}`);
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Authentication failed: ' + ((error as Error).message || 'Unknown error') });
        }
      });
      
      // Join a chat room
      socket.on('join_room', async (chatRoomId: string) => {
        try {
          if (!chatRoomId || typeof chatRoomId !== 'string') {
            console.error(`Invalid chatRoomId format received from socket ${socket.id}`);
            socket.emit('error', { message: 'Invalid chat room ID format' });
            return;
          }
          
          if (!socket.data.user) {
            console.error(`Unauthenticated user tried to join room ${chatRoomId} from socket ${socket.id}`);
            socket.emit('error', { message: 'Authentication required' });
            return;
          }
          
          const { id: userId, username } = socket.data.user;
          console.log(`User ${username} (${userId}) attempting to join room ${chatRoomId}`);
          
          // Check if user is part of this chat room
          const userActiveChatId = await redis.get(`user:${userId}:active_chat`);
          
          if (!userActiveChatId || userActiveChatId !== chatRoomId) {
            console.error(`User ${userId} is not part of chat room ${chatRoomId}`);
            socket.emit('error', { message: 'You are not part of this chat room' });
            return;
          }
          
          // Join the room
          socket.join(chatRoomId);
          console.log(`User ${username} (${userId}) joined room ${chatRoomId}`);
          
          // Get chat room info
          const chatRoom = await redis.hgetall(`chat_room:${chatRoomId}`);
          if (!chatRoom || Object.keys(chatRoom).length === 0) {
            console.error(`Chat room ${chatRoomId} not found in Redis`);
            socket.emit('error', { message: 'Chat room not found' });
            return;
          }
          
          // Get host information (which port this instance is running on)
          let host = 'unknown';
          if (req.headers && typeof req.headers.host === 'string') {
            host = req.headers.host;
          }
          
          // Notify other users in the room
          socket.to(chatRoomId).emit('user_joined', {
            userId,
            username: socket.data.user.username,
          });
          
          // Create a system message about this join
          const systemMessage = {
            id: `system-${Date.now()}-${socket.id}`,
            userId: 'system',
            username: 'System',
            text: `${username} joined the chat from port ${host}`,
            timestamp: Date.now(),
          };
          
          // Store system message
          await redis.lpush(`messages:${chatRoomId}`, JSON.stringify(systemMessage));
          
          // Publish the system message to all instances
          await redis.publish('chat:messages', JSON.stringify({
            roomId: chatRoomId,
            messageData: systemMessage
          }));
          
          // Also publish to a room-specific channel for redundancy
          await redis.publish(`chat:room:${chatRoomId}`, JSON.stringify({
            messageData: systemMessage
          }));
          
          // Subscribe to the room-specific channel too
          redisSub.subscribe(`chat:room:${chatRoomId}`).then(() => {
            console.log(`Subscribed to room channel chat:room:${chatRoomId}`);
          }).catch(err => {
            console.error(`Failed to subscribe to room channel:`, err);
          });
          
          // Get recent messages (last 30)
          const recentMessages = await redis.lrange(`messages:${chatRoomId}`, 0, 29);
          let messages = [];
          
          try {
            messages = recentMessages.map((msg) => JSON.parse(msg));
          } catch (err) {
            console.error(`Error parsing messages for room ${chatRoomId}:`, err);
          }
          
          console.log(`Sending chat history to user ${username} - ${messages.length} messages`);
          
          // Send chat history to user
          socket.emit('chat_history', {
            chatRoomId,
            messages: messages.reverse(), // Show newest last
            movieId: Number(chatRoom.movieId || 0),
          });
          
          console.log(`User ${username} successfully connected to chat room ${chatRoomId} on port ${host}`);
          
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', { message: 'Failed to join chat room' });
        }
      });
      
      // Handle direct messages between clients
      socket.on('chat_message', async (data: any) => {
        try {
          if (!socket.data.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }
          
          const { id: userId, username } = socket.data.user;
          const { chatRoomId, text } = data;
          
          if (!chatRoomId || !text) {
            socket.emit('error', { message: 'Invalid message data' });
            return;
          }
          
          console.log(`[CHAT] User ${username} sending message to room ${chatRoomId}: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
          
          // Create message
          const message = {
            id: require('crypto').randomBytes(8).toString('hex'),
            userId,
            username,
            text,
            timestamp: Date.now(),
          };
          
          // Store in Redis for message history
          await redis.lpush(`messages:${chatRoomId}`, JSON.stringify(message));
          await redis.ltrim(`messages:${chatRoomId}`, 0, 49);
          await redis.expire(`messages:${chatRoomId}`, 14400);
          console.log(`[CHAT] Stored message ${message.id} in Redis history`);
          
          // First, send directly to the sender for immediate feedback
          socket.emit('message', message);
          console.log(`[CHAT] Sent message directly to sender socket ${socket.id}`);
          
          // Then, broadcast to other clients in the same room on this instance
          socket.to(chatRoomId).emit('message', message);
          console.log(`[CHAT] Broadcasted message to other clients in room ${chatRoomId} on this instance`);
          
          // Publish to Redis for other server instances
          console.log(`[CHAT] Publishing message to Redis for room ${chatRoomId}`);
          await redis.publish('chat:messages', JSON.stringify({
            roomId: chatRoomId,
            messageData: message,
            sourceSocketId: socket.id
          }));
          
          console.log(`[CHAT] Message handling complete for ${message.id}`);
        } catch (error) {
          console.error('[CHAT ERROR] Error handling chat message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });
      
      // Leave a chat room
      socket.on('leave_room', async (chatRoomId: string) => {
        if (socket.data.user) {
          const { id: userId, username } = socket.data.user;
          console.log(`User ${username} (${userId}) leaving room ${chatRoomId}`);
          
          // Notify others in the room that this user is leaving
          socket.to(chatRoomId).emit('chat_ended', {
            message: 'The other user has ended the chat.',
            userId,
            username
          });
        }
        
        socket.leave(chatRoomId);
        console.log(`Client ${socket.id} left room ${chatRoomId}`);
      });
      
      // Add a direct message handler for debugging
      socket.on('direct_message', async (data: any) => {
        try {
          if (!socket.data.user) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }
          
          const { id: userId, username } = socket.data.user;
          const { targetSocketId, text } = data;
          
          if (!targetSocketId || !text) {
            socket.emit('error', { message: 'Invalid direct message data' });
            return;
          }
          
          console.log(`[DIRECT] User ${username} sending direct message to socket ${targetSocketId}`);
          
          // Create message
          const message = {
            id: require('crypto').randomBytes(8).toString('hex'),
            userId,
            username,
            text: `DIRECT: ${text}`,
            timestamp: Date.now(),
            direct: true
          };
          
          // Send to the target socket directly
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit('message', message);
            console.log(`[DIRECT] Successfully sent direct message to socket ${targetSocketId}`);
            
            // Also confirm to the sender
            socket.emit('direct_message_sent', { success: true, message: message });
            
            // Log all sockets in the server
            if (io.sockets.sockets) {
              console.log(`[DEBUG] Total connected sockets: ${io.sockets.sockets.size}`);
              for (const [id, s] of io.sockets.sockets.entries()) {
                console.log(`[DEBUG] Socket: ${id}, User: ${s.data?.user?.username || 'unknown'}`);
              }
            }
          } else {
            console.log(`[DIRECT] Target socket ${targetSocketId} not found`);
            socket.emit('direct_message_sent', { success: false, error: 'Target socket not found' });
          }
        } catch (error) {
          console.error('[DIRECT] Error handling direct message:', error);
          socket.emit('error', { message: 'Failed to send direct message' });
        }
      });
      
      // Add a handler to get socket IDs in a room
      socket.on('get_sockets_in_room', (data, callback) => {
        try {
          const { chatRoomId } = data;
          
          if (!socket.data.user) {
            callback({ error: 'Authentication required' });
            return;
          }
          
          if (!chatRoomId) {
            callback({ error: 'Chat room ID is required' });
            return;
          }
          
          console.log(`[DEBUG] Getting sockets in room ${chatRoomId}`);
          
          const socketsInRoom = io.sockets.adapter.rooms.get(chatRoomId);
          let sockets: string[] = [];
          
          if (socketsInRoom) {
            sockets = Array.from(socketsInRoom);
            console.log(`[DEBUG] Found ${sockets.length} sockets in room ${chatRoomId}:`, sockets);
            
            // Log detailed information about each socket
            sockets.forEach(socketId => {
              const s = io.sockets.sockets.get(socketId);
              console.log(`[DEBUG] Socket ${socketId}: ${s?.data?.user?.username || 'unknown user'}`);
            });
          } else {
            console.log(`[DEBUG] No sockets found in room ${chatRoomId}`);
          }
          
          callback({
            sockets,
            count: sockets.length,
            yourSocketId: socket.id
          });
        } catch (error) {
          console.error('[DEBUG] Error getting sockets in room:', error);
          callback({ error: 'Failed to get sockets in room' });
        }
      });
      
      // Handle errors
      socket.on('error', (err) => {
        console.error(`Socket ${socket.id} error:`, err);
      });
      
      // Disconnect handling
      socket.on('disconnect', (reason) => {
        console.log(`Client ${socket.id} disconnected. Reason: ${reason}`);
      });
    });
    
    return io;
  } catch (error) {
    console.error("Error initializing Socket.IO server:", error);
    return null;
  }
};