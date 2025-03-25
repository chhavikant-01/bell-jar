import { NextRequest, NextResponse } from 'next/server';
import { findMatch } from '@/lib/chat';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';
import { redis } from '@/lib/redis';

// Validation schema for matching
const matchSchema = z.object({
  movieId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization') || undefined;
    const user = await getUserFromToken(authHeader);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Validate input
    const result = matchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { movieId } = result.data;
    
    // Check if user already has an active chat, and clean it up if needed
    const existingChatId = await redis.get(`user:${user.id}:active_chat`);
    if (existingChatId) {
      console.log(`User ${user.id} already has an active chat ${existingChatId}, cleaning up before matching...`);
      // Clean up the active chat to avoid stuck states
      await redis.del(`user:${user.id}:active_chat`);
    }
    
    // Find a match
    const chatRoomId = await findMatch(user.id, user.username, movieId);
    
    // If a match is found, return the chat room ID
    if (chatRoomId) {
      // Double-check that the chat room exists
      const chatRoomExists = await redis.exists(`chat_room:${chatRoomId}`);
      if (!chatRoomExists) {
        console.error(`Match created chat room ${chatRoomId} but it doesn't exist in Redis`);
        return NextResponse.json({
          success: false,
          error: 'Failed to create chat room',
        }, { status: 500 });
      }
      
      console.log(`Match found! User ${user.id} matched in chat room ${chatRoomId}`);
      return NextResponse.json({
        success: true,
        matched: true,
        chatRoomId,
      });
    }
    
    // If no match is found, the user has been added to the waiting pool
    console.log(`No match found for user ${user.id}, added to waiting pool for movie ${movieId}`);
    return NextResponse.json({
      success: true,
      matched: false,
      message: 'Added to waiting pool for matching',
    });
  } catch (error) {
    console.error('Chat matching error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 