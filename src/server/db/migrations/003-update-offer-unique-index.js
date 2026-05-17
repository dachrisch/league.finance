// Migration: Update offer indexes to support multiple offers per association-season
// The unique constraint has been moved from the database level to the application layer

module.exports = {
  async up(db) {
    const collection = db.collection('offers');

    // Drop the old unique index
    try {
      await collection.dropIndex('associationId_1_seasonId_1_status_1');
    } catch (err) {
      // Index may not exist, ignore
    }

    // Create a new non-unique index for queries
    await collection.createIndex(
      { associationId: 1, seasonId: 1, status: 1 }
    );
  },

  async down(db) {
    const collection = db.collection('offers');

    // Drop the new index
    try {
      await collection.dropIndex('associationId_1_seasonId_1_status_1');
    } catch (err) {
      // Index may not exist, ignore
    }

    // Restore the old unique index
    await collection.createIndex(
      { associationId: 1, seasonId: 1, status: 1 },
      {
        partialFilterExpression: { status: { $in: ['draft', 'sending', 'sent'] } },
        unique: true,
      }
    );
  },
};
