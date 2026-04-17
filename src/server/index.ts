import 'dotenv/config';
import { connectMongo } from './db/mongo';
import { setDbStatus } from './health';
import { createApp } from './app';
import { offerSendQueue } from './lib/queue';
import { processSendOfferJob } from './jobs/SendOfferJob';

// Initialize workers
offerSendQueue.process(processSendOfferJob);

declare global {
  namespace Express {
    interface User extends InstanceType<typeof import('./models/User').User> {}
  }
}

const app = createApp();
const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

connectMongo()
  .then(() => { setDbStatus('connected'); })
  .catch(err => console.error('MongoDB connection failed:', err));
