import Bull from 'bull';
import type { RedisOptions } from 'ioredis';

// Redis configuration for Bull v4
const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Validate port parsing
if (isNaN(redisConfig.port)) {
  throw new Error(`Invalid REDIS_PORT: ${process.env.REDIS_PORT}`);
}

// Create queue - pass redis config via QueueOptions
export const offerSendQueue = new Bull('offer-send', { redis: redisConfig });

// Global error handlers
offerSendQueue.on('error', (err) => {
  console.error('[offer-send-queue] Queue error:', err.message || err);
});

offerSendQueue.on('failed', (job, err) => {
  console.error(`[offer-send-queue] Job ${job.id} failed: ${err.message}`);
});

export async function closeQueues() {
  await offerSendQueue.close();
}
