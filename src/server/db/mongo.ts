import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export async function connectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    return; // already connected or connecting
  }

  const uri = process.env.MONGO_URI;

  if (uri) {
    await mongoose.connect(uri);
    const host = new URL(uri).host;
    console.log('MongoDB connected:', host);
  } else {
    mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log('MongoDB in-memory server started');
  }
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
