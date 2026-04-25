import Redis from 'ioredis';

let redisClient: Redis | null = null;
let redisReady = false;

const initRedis = () => {
  try {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy(times) {
        if (times > 5) {
          console.warn('[Redis] ⚠️ Retries exhausted. Caching disabled for local dev.');
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 3,
    });

    client.on('error', (err) => {
      if (redisReady) {
        console.error('[Redis] Connection lost:', err.message);
        redisReady = false;
      }
    });

    client.on('ready', () => {
      redisReady = true;
      console.log('[Redis] ✅ Connected via ioredis');
    });

    redisClient = client;
  } catch (err) {
    console.warn('[Redis] ⚠️ Could not connect to Redis. Caching disabled.');
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
    await redisClient.setex(key, ttl, value);
  } catch {
    // silently skip if Redis is not available
  }
};

export const safeRedisDel = async (key: string): Promise<void> => {
  if (!redisClient || !redisReady) return;
  try {
    await redisClient.del(key);
  } catch {
    // silently skip
  }
};

// Keep a named export for backward compat, but the safe wrappers are preferred
export { redisClient };
