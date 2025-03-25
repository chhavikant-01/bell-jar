import Redis from 'ioredis';

const globalRedis = globalThis as unknown as {
  redis: Redis | undefined;
  pubClient: Redis | undefined;
  subClient: Redis | undefined;
};

// Redis connection URL
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis clients with improved configuration
const createRedisClient = (name: string) => {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis ${name} retry attempt ${times} with delay ${delay}ms`);
      return delay;
    },
    reconnectOnError: (err) => {
      console.error(`Redis ${name} connection error:`, err);
      return true; // Always try to reconnect
    }
  });
  
  client.on('error', (error) => {
    console.error(`Redis ${name} error:`, error);
  });
  
  client.on('connect', () => {
    console.log(`Redis ${name} connected successfully`);
  });
  
  client.on('reconnecting', () => {
    console.log(`Redis ${name} reconnecting...`);
  });
  
  return client;
};

// Create a singleton Redis client instance
export const redis = 
  globalRedis.redis ||
  createRedisClient('main');

// Override the duplicate method to create reliable pub/sub clients
const originalDuplicate = redis.duplicate.bind(redis);
redis.duplicate = function() {
  const duplicateClient = originalDuplicate();
  
  // Add event handlers for better debugging
  duplicateClient.on('error', (error) => {
    console.error('Redis duplicate client error:', error);
  });
  
  duplicateClient.on('connect', () => {
    console.log('Redis duplicate client connected successfully');
  });
  
  duplicateClient.on('reconnecting', () => {
    console.log('Redis duplicate client reconnecting...');
  });
  
  return duplicateClient;
};

// In development, we want to reuse the same connection
if (process.env.NODE_ENV !== 'production') {
  globalRedis.redis = redis;
}

export default redis; 