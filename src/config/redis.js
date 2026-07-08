/**
 * Redis Configuration
 * Provides an ioredis client that degrades gracefully when Redis is unavailable.
 * Every consumer should check `redisClient.status === 'ready'` before use.
 */
import Redis from 'ioredis';

let redisClient;

try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        console.warn('⚠️  Redis: max retries reached – giving up.');
        return null; // stop retrying
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true, // don't connect until first command or explicit .connect()
  });

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (err) =>
    console.warn(`⚠️  Redis error (non-fatal): ${err.message}`)
  );
  redisClient.on('close', () => console.log('⚠️  Redis connection closed'));

  // Attempt connection – failures are caught so the app keeps running
  redisClient.connect().catch(() => {
    console.warn('⚠️  Redis unavailable – caching disabled');
  });
} catch (err) {
  console.warn(`⚠️  Redis init failed (non-fatal): ${err.message}`);
  // Provide a stub so callers don't crash
  redisClient = {
    status: 'end',
    get: async () => null,
    set: async () => null,
    del: async () => null,
    setex: async () => null,
  };
}

export default redisClient;
