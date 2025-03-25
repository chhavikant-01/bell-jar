import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/chat';
import { getUserFromToken } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for messages
const messageSchema = z.object({
  chatRoomId: z.string(),
  text: z.string().min(1).max(1000),
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
    const result = messageSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { chatRoomId, text } = result.data;
    
    // Send message
    const message = await sendMessage(chatRoomId, user.id, user.username, text);
    
    if (!message) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Chat message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 