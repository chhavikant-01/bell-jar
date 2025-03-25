import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { redis } from '@/lib/redis';
import { prisma } from '@/lib/db';

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
    
    // Get current active chat if any
    const activeChatId = await redis.get(`user:${user.id}:active_chat`);
    
    // Clear active chat state
    if (activeChatId) {
      // Clear Redis active chat reference
      await redis.del(`user:${user.id}:active_chat`);
      
      // Update database
      await prisma.activeChat.updateMany({
        where: {
          userId: user.id,
          chatRoomId: activeChatId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
      
      console.log(`Reset active chat for user ${user.id} (chat room: ${activeChatId})`);
    }
    
    // Clear any interest keys for this user
    const interestPattern = `interest:*:${user.id}`;
    const interestKeys = await redis.keys(interestPattern);
    
    if (interestKeys.length > 0) {
      await Promise.all(interestKeys.map(key => redis.del(key)));
      console.log(`Cleared ${interestKeys.length} interest keys for user ${user.id}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Chat state reset successfully',
    });
  } catch (error) {
    console.error('Error resetting chat state:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 