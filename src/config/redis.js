/**
 * Redis Configuration
 * Provides an ioredis client that degrades gracefully when Redis is unavailable.
 *
 * IMPORTANT: ioredis requires a redis:// or rediss:// URL.
 * If REDIS_URL is an https:// Upstash REST URL (not a Redis URL),
 * we skip ioredis entirely and return a no-op stub so the app keeps running.
 */
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || '';

// Detect invalid URL format (Upstash REST URL vs actual Redis URL)
const isValidRedisUrl =
  redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://');

let redisClient;

if (!redisUrl || !isValidRedisUrl) {
  // No valid Redis URL — use a no-op stub so consumers don't crash
  if (redisUrl) {
    console.warn(
      '⚠️  REDIS_URL looks like an HTTP URL, not a Redis URL (expected redis:// or rediss://).',
      'Caching is disabled.'
    );
  }
  redisClient = {
    status: 'end',
    get: async () => null,
    set: async () => null,
    del: async () => null,
    setex: async () => null,
  };
} else {
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️  Redis: max retries reached — giving up.');
          return null; // stop retrying
        }
        return Math.min(times * 300, 1000);
      },
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) =>
      console.warn(`⚠️  Redis error (non-fatal): ${err.message}`)
    );
    redisClient.on('close', () => console.log('⚠️  Redis connection closed'));

    redisClient.connect().catch(() => {
      console.warn('⚠️  Redis unavailable — caching disabled');
    });
  } catch (err) {
    console.warn(`⚠️  Redis init failed (non-fatal): ${err.message}`);
    redisClient = {
      status: 'end',
      get: async () => null,
      set: async () => null,
      del: async () => null,
      setex: async () => null,
    };
  }
}

export default redisClient;
