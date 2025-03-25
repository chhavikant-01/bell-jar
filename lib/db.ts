/* eslint-disable no-var */
import { PrismaClient } from '@prisma/client';

// Add prisma to the global type
declare global {
  var prisma: PrismaClient | undefined;
}

// Create a singleton instance of PrismaClient to avoid too many connections in development
export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma; 