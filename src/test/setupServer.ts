import { beforeAll, afterAll } from 'vitest';
import { connectMongo, disconnectMongo } from '../server/db/mongo';

// Connect to MongoDB before all tests
beforeAll(async () => {
  await connectMongo();
});

// Disconnect from MongoDB after all tests
afterAll(async () => {
  await disconnectMongo();
});
