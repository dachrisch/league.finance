/**
 * Migration: Fix FinancialConfig index to support multiple offers per league/season
 *
 * The old unique index on { leagueId, seasonId } blocks multiple associations
 * from having offers in the same season. Replace with composite index on
 * { offerId, leagueId, seasonId }.
 */
const mongoose = require('mongoose');

async function up() {
  const db = mongoose.connection.db;
  const collection = db.collection('financialconfigs');

  try {
    // Drop the old global unique index
    await collection.dropIndex('leagueId_1_seasonId_1');
    console.log('✓ Dropped old index: leagueId_1_seasonId_1');
  } catch (err) {
    // Error code 27 is the stable MongoDB IndexNotFound error
    if (err.code === 27 || err.message.includes('index not found')) {
      console.log('✓ Old index already removed');
    } else {
      throw err;
    }
  }

  // Create the new composite index (will be done by Mongoose schema on next startup)
  console.log('✓ Migration complete. New index will be created by Mongoose.');
}

async function down() {
  const db = mongoose.connection.db;
  const collection = db.collection('financialconfigs');

  try {
    // Restore the old index (rollback)
    await collection.createIndex(
      { leagueId: 1, seasonId: 1 },
      { unique: true }
    );
    console.log('✓ Restored old index: leagueId_1_seasonId_1');
  } catch (err) {
    console.error('Failed to restore index:', err);
    throw err;
  }
}

module.exports = { up, down };
