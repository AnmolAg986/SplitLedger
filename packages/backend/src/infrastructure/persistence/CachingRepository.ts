import { safeRedisGet, safeRedisSetEx } from '../../config/redis';

/**
 * Method decorator for caching the result of static or instance methods.
 * @param keyPrefix A string prefix for the cache key (e.g., 'group:balances')
 * @param keyGenerator A function that takes the method arguments and returns the rest of the cache key.
 * @param ttlSeconds Time to live in seconds.
 */
export function Cacheable(
  keyPrefix: string,
  keyGenerator: (...args: any[]) => string,
  ttlSeconds: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const suffix = keyGenerator(...args);
      const cacheKey = `${keyPrefix}:${suffix}`;

      // 1. Try Cache
      const cached = await safeRedisGet(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.warn(`[Cacheable] Failed to parse cached value for ${cacheKey}`);
        }
      }

      // 2. Cache Miss -> Execute Original Method
      const result = await originalMethod.apply(this, args);

      // 3. Set Cache
      if (result !== undefined && result !== null) {
        await safeRedisSetEx(cacheKey, ttlSeconds, JSON.stringify(result));
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Utility to manually invalidate a cache key (useful alongside Cacheable)
 */
export async function invalidateCache(keyPrefix: string, suffix: string) {
  const { safeRedisDel } = await import('../../config/redis');
  await safeRedisDel(`${keyPrefix}:${suffix}`);
}
