import { NextRequest, NextResponse } from 'next/server';
import { endChatSession } from '@/lib/chat';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for ending chat
const endChatSchema = z.object({
  chatRoomId: z.string().min(1),
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
    const result = endChatSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { chatRoomId } = result.data;
    
    // End chat session
    const success = await endChatSession(chatRoomId, user.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to end chat session' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('End chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 