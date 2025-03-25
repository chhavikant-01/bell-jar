/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { getSocketIO } from '@/lib/socket';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Use a global variable to track if we've set up event listeners
let isSocketEventsSetup = false;
let socketIOInstance: SocketIOServer | null = null;

export default async function handler(
  req: NextApiRequest & { socket: { server: NetServer } },
  res: NextApiResponse
) {
  try {
    // Get or create Socket.IO server with better error handling
    const io = getSocketIO(req as any);
    
    if (!io) {
      console.error('Failed to initialize Socket.IO server');
      return res.status(500).json({ error: 'Failed to initialize Socket.IO server' });
    }
    
    if (io && !socketIOInstance) {
      socketIOInstance = io;
      
      // Set up event listeners once
      if (!isSocketEventsSetup) {
        isSocketEventsSetup = true;
        
        // Log connection information
        io.engine.on("connection", (socket: any) => {
          console.log(`Socket ${socket.id} connected via ${socket.transport} transport (port: ${req.headers.host})`);
          
          socket.on("upgrade", (transport: any) => {
            console.log(`Socket ${socket.id} upgraded to ${transport.name} transport`);
          });
          
          socket.on("error", (error: any) => {
            console.error(`Socket engine error for ${socket.id}:`, error);
          });
        });
        
        // Handle server-level errors
        io.engine.on("error", (error: any) => {
          console.error('Socket.IO engine error:', error);
        });
        
        console.log(`Socket.IO server is ready and listening for connections on ${req.headers.host}`);
      }
    }
    
    // Needed for Socket.IO to work with Next.js API routes
    if (socketIOInstance) {
      console.log(`Socket.IO already running on ${req.headers.host}`);
    }
    
    // Send a simple response to confirm socket server is running
    res.status(200).end();
  } catch (error) {
    console.error('Socket server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}