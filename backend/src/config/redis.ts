import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisReady = false;

const initRedis = async () => {
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    client.on('error', (err) => {
      if (redisReady) {
        console.error('[Redis] Connection lost:', err.message);
        redisReady = false;
      }
    });

    client.on('ready', () => {
      redisReady = true;
      console.log('[Redis] ✅ Connected');
    });

    await client.connect();
    redisClient = client as RedisClientType;
  } catch (err) {
    console.warn('[Redis] ⚠️ Could not connect to Redis. Token blacklisting disabled for local dev.');
    redisClient = null;
    redisReady = false;
  }
};

// Fire-and-forget on import
initRedis();

/**
 * Safe wrapper — returns null if Redis is not available.
 */
export const safeRedisGet = async (key: string): Promise<string | null> => {
  if (!redisClient || !redisReady) return null;
  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
};

export const safeRedisSetEx = async (key: string, ttl: number, value: string): Promise<void> => {
  if (!redisClient || !redisReady) return;
  try {
    await redisClient.setEx(key, ttl, value);
  } catch {
    // silently skip if Redis is not available
  }
};

// Keep a named export for backward compat, but the safe wrappers are preferred
export { redisClient };
