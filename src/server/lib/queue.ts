import Queue from 'bull';
import Redis from 'ioredis';

// In-memory mock queue for development
class MockQueue {
  private jobs = new Map<string, any>();
  private jobId = 0;
  private eventHandlers: { [key: string]: Function[] } = {};

  async add(data: any, options?: any) {
    const id = String(++this.jobId);
    this.jobs.set(id, {
      id,
      state: 'completed' as const,
      progress: () => 100,
      getState: async () => 'completed' as const,
      failedReason: undefined,
      data,
    });
    return { id: parseInt(id) };
  }

  async getJob(id: string) {
    return this.jobs.get(id) || null;
  }

  process(handler: Function) {
    // Mock processor - jobs complete immediately
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  async close() {
    this.jobs.clear();
  }
}

// Create queue - use mock in development, Redis in production
export const offerSendQueue =
  process.env.NODE_ENV === 'development'
    ? new MockQueue()
    : (() => {
        const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

        // Use ioredis for the underlying connection
        const client = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
        const subscriber = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

        return new Queue('offer-send', {
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
      })();

console.log('Bull queue "offer-send" initialized');
