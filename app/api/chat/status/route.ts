import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
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
    
    // Check if user has an active chat
    const chatRoomId = await redis.get(`user:${user.id}:active_chat`);
    
    if (chatRoomId) {
      // Verify the chat room actually exists
      const chatRoomExists = await redis.exists(`chat_room:${chatRoomId}`);
      
      if (!chatRoomExists) {
        console.log(`Found stale chat reference for user ${user.id}, chat room ${chatRoomId} doesn't exist`);
        // Clean up the stale reference
        await redis.del(`user:${user.id}:active_chat`);
        
        return NextResponse.json({
          isMatched: false,
        });
      }
      
      // Get chat room info to verify it's a valid room with two users
      const chatRoom = await redis.hgetall(`chat_room:${chatRoomId}`);
      
      if (!chatRoom || !chatRoom.user1 || !chatRoom.user2) {
        console.log(`Invalid chat room ${chatRoomId} for user ${user.id}, missing user info`);
        // Clean up the reference
        await redis.del(`user:${user.id}:active_chat`);
        
        return NextResponse.json({
          isMatched: false,
        });
      }
      
      // User has been matched with someone
      return NextResponse.json({
        isMatched: true,
        chatRoomId,
      });
    } else {
      // User is not matched yet
      return NextResponse.json({
        isMatched: false,
      });
    }
  } catch (error) {
    console.error('Chat status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 