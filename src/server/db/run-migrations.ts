import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

interface AppliedMigration {
  _id: string;
  appliedAt: Date;
}

/**
 * Runs every migration in migrationsDir whose filename isn't already recorded
 * in the `_migrations` collection, then records it. Without this tracking, a
 * migration that mutates data (e.g. resetting a field introduced by an old
 * schema change) would re-run — and re-apply that mutation — on every
 * process restart, since entrypoint.sh runs this on every container start.
 */
export async function runMigrations(migrationsDir: string): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('runMigrations requires an active Mongoose connection');
  const appliedMigrations = db.collection<AppliedMigration>('_migrations');

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort();

  for (const file of files) {
    const alreadyApplied = await appliedMigrations.findOne({ _id: file });
    if (alreadyApplied) {
      console.log(`⏭  Skipping already-applied migration: ${file}`);
      continue;
    }

    console.log(`\n→ Running migration: ${file}`);
    const migration = require(path.join(migrationsDir, file));
    try {
      await migration.up();
      await appliedMigrations.insertOne({ _id: file, appliedAt: new Date() });
      console.log(`✓ Migration ${file} completed`);
    } catch (err) {
      console.error(`✗ Migration ${file} failed:`, err);
      throw err;
    }
  }

  console.log('\n✓ All migrations completed');
}

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/leagues-finance';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
  try {
    await runMigrations(path.join(__dirname, 'migrations'));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
