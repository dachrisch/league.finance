import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

async function runMigrations() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leagues-finance';
  
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.js')).sort();

  for (const file of files) {
    console.log(`\n→ Running migration: ${file}`);
    const migration = require(path.join(migrationsDir, file));
    try {
      await migration.up();
      console.log(`✓ Migration ${file} completed`);
    } catch (err) {
      console.error(`✗ Migration ${file} failed:`, err);
      throw err;
    }
  }

  await mongoose.disconnect();
  console.log('\n✓ All migrations completed');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
