import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

export interface TokenPayload {
  userId: string;
  username: string;
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Compare password with hash
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign(payload, secret, { expiresIn });
};

// Verify JWT token
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Middleware to verify authentication
export const getUserFromToken = async (token: string | undefined): Promise<any | null> => {
  if (!token) return null;
  
  try {
    // Verify the token
    const decoded = verifyToken(token.replace('Bearer ', ''));
    if (!decoded) return null;
    
    // Get the user from the database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        username: true,
        createdAt: true,
        // Do not include password
      }
    });
    
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}; 