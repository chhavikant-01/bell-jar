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
    
    // Get the chat room ID from the query
    const url = new URL(request.url);
    const chatRoomId = url.searchParams.get('chatRoomId');
    
    if (!chatRoomId) {
      return NextResponse.json(
        { error: 'Chat room ID is required' },
        { status: 400 }
      );
    }
    
    // Verify that the chat room exists
    const chatRoomExists = await redis.exists(`chat_room:${chatRoomId}`);
    if (!chatRoomExists) {
      return NextResponse.json({
        valid: false,
        reason: 'Chat room does not exist'
      });
    }
    
    // Get chat room data
    const chatRoom = await redis.hgetall(`chat_room:${chatRoomId}`);
    
    // Check that it has both users
    if (!chatRoom || !chatRoom.user1 || !chatRoom.user2) {
      return NextResponse.json({
        valid: false,
        reason: 'Chat room is invalid (missing users)'
      });
    }
    
    // Verify that this user is part of the chat room
    if (chatRoom.user1 !== user.id && chatRoom.user2 !== user.id) {
      return NextResponse.json({
        valid: false,
        reason: 'User is not part of this chat room'
      });
    }
    
    // Verify that the other user has an active chat reference 
    const otherUserId = chatRoom.user1 === user.id ? chatRoom.user2 : chatRoom.user1;
    const otherUserActiveChatId = await redis.get(`user:${otherUserId}:active_chat`);
    
    if (!otherUserActiveChatId || otherUserActiveChatId !== chatRoomId) {
      return NextResponse.json({
        valid: false,
        reason: 'Other user is not actively in this chat room'
      });
    }
    
    // Chat room is valid
    return NextResponse.json({
      valid: true,
      chatRoomId,
      movieId: Number(chatRoom.movieId || 0)
    });
  } catch (error) {
    console.error('Chat validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 