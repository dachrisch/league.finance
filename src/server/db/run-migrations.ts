import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// Track applied migrations
const MigrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
});
const MigrationModel = mongoose.model('Migration', MigrationSchema);

async function runMigrations() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGO_URI environment variable is not set.');
    console.error('Usage: MONGO_URI=mongodb://... npm run migrate');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    // Check if migration already applied
    const existing = await MigrationModel.findOne({ name: file });
    if (existing) {
      console.log(`⊘ Already applied: ${file}`);
      continue;
    }

    console.log(`\n→ Running migration: ${file}`);
    const migration = require(path.join(migrationsDir, file));
    try {
      await migration.up();

      // Record that this migration was applied
      await MigrationModel.create({ name: file });
      console.log(`✓ Migration ${file} completed and recorded`);
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
