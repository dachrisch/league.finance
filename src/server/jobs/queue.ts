import Bull from 'bull';

// In-memory mock queue for development
class MockQueue {
  private jobs = new Map<string, any>();
  private jobId = 0;
  private eventHandlers: { [key: string]: Function[] } = {};

  async add(data: any, _options?: any) {
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

  process(_handler: Function) {
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

function createDriveQueue(name: string): Bull.Queue | MockQueue {
  if (process.env.NODE_ENV === 'development') {
    return new MockQueue();
  }

  const REDIS_URL = process.env.REDIS_URL;
  let queue: Bull.Queue;

  if (REDIS_URL) {
    queue = new Bull(name, REDIS_URL);
  } else {
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: isNaN(port) ? 6379 : port,
    };
    queue = new Bull(name, { redis: redisConfig });
  }

  queue.on('error', (err) => {
    console.error(`[${name}-queue] Queue error:`, err.message || err);
  });

  queue.on('failed', (job, err) => {
    console.error(`[${name}-queue] Job ${job.id} failed: ${err.message}`);
  });

  return queue;
}

export const offerDriveQueue = createDriveQueue('offer-drive');
export const invoiceDriveQueue = createDriveQueue('invoice-drive');

export async function closeQueues() {
  await (offerDriveQueue as any).close();
  await (invoiceDriveQueue as any).close();
}
