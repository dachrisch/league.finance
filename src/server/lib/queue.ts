import Queue from 'bull';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Use ioredis for the underlying connection
const client = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
const subscriber = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const offerSendQueue = new Queue('offer-send', {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return client;
      case 'subscriber':
        return subscriber;
      default:
        return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    }
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    removeOnComplete: true,
  },
});

console.log('Bull queue "offer-send" initialized');
