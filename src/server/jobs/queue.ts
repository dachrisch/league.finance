import Bull from 'bull';
import type { RedisOptions } from 'ioredis';

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
        const REDIS_URL = process.env.REDIS_URL;
        let queue: Bull.Queue;

        if (REDIS_URL) {
          queue = new Bull('offer-send', REDIS_URL);
        } else {
          const port = parseInt(process.env.REDIS_PORT || '6379', 10);
          const redisConfig: RedisOptions = {
            host: process.env.REDIS_HOST || 'localhost',
            port: isNaN(port) ? 6379 : port,
          };
          queue = new Bull('offer-send', { redis: redisConfig });
        }

        // Global error handlers
        queue.on('error', (err) => {
          console.error('[offer-send-queue] Queue error:', err.message || err);
        });

        queue.on('failed', (job, err) => {
          console.error(`[offer-send-queue] Job ${job.id} failed: ${err.message}`);
        });

        return queue;
      })();

export async function closeQueues() {
  await (offerSendQueue as any).close();
}
