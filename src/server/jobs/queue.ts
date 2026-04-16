import Bull from 'bull';
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 0,
});

// Create queues
export const offerSendQueue = new Bull('offer-send', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Global error handlers
offerSendQueue.on('error', (err) => {
  console.error('[offer-send-queue] Queue error:', err);
});

offerSendQueue.on('failed', (job, err) => {
  console.error(`[offer-send-queue] Job ${job.id} failed:`, err.message);
});

export async function closeQueues() {
  await offerSendQueue.close();
  redisClient.quit();
}
