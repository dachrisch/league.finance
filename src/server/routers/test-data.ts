import { router, protectedProcedure } from '../trpc';
import { getMysqlPool } from '../db/mysql';
import { Association } from '../models/Association';
import { Contact } from '../models/Contact';

export const testDataRouter = router({
  seedTestData: protectedProcedure.mutation(async () => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Test data seeding only available in development');
    }

    const pool = getMysqlPool();
    const results = [];

    // Seed test leagues
    const testLeagues = [
      { slug: 'e2e-test-league-1', name: 'E2E Test League 1' },
      { slug: 'e2e-test-league-2', name: 'E2E Test League 2' },
    ];

    for (const league of testLeagues) {
      try {
        const [result] = await pool.query(
          'INSERT INTO gamedays_league (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?',
          [league.slug, league.name, league.name]
        );
        results.push({ type: 'league', name: league.name, status: 'created' });
      } catch (err: any) {
        results.push({ type: 'league', name: league.name, status: 'error', error: err.message });
      }
    }

    // Seed test seasons
    const testSeasons = [
      { slug: 'e2e-test-2026', name: '2026' },
      { slug: 'e2e-test-2025', name: '2025' },
    ];

    for (const season of testSeasons) {
      try {
        const [result] = await pool.query(
          'INSERT INTO gamedays_season (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?',
          [season.slug, season.name, season.name]
        );
        results.push({ type: 'season', name: season.name, status: 'created' });
      } catch (err: any) {
        results.push({ type: 'season', name: season.name, status: 'error', error: err.message });
      }
    }

    // Create season-league associations (many-to-many)
    try {
      const [leagues] = await pool.query(
        'SELECT id FROM gamedays_league WHERE slug LIKE "e2e-test-%"'
      );
      const [seasons] = await pool.query(
        'SELECT id FROM gamedays_season WHERE slug LIKE "e2e-test-%"'
      );

      for (const league of leagues as any[]) {
        for (const season of seasons as any[]) {
          try {
            await pool.query(
              'INSERT IGNORE INTO gamedays_seasonleagueteam (league_id, season_id) VALUES (?, ?)',
              [league.id, season.id]
            );
          } catch (err) {
            // Silently continue on duplicate
          }
        }
      }
    } catch (err: any) {
      results.push({ type: 'relationship', status: 'error', error: err.message });
    }

    // Seed test associations
    const testAssociations = [
      {
        name: 'Test Association',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          postalCode: '12345',
          country: 'Germany'
        }
      }
    ];

    let testAssocId: string | undefined;
    for (const assoc of testAssociations) {
      try {
        const created = await Association.findOneAndUpdate(
          { name: assoc.name },
          assoc,
          { upsert: true, new: true }
        );
        testAssocId = created._id.toString();
        results.push({ type: 'association', name: assoc.name, status: 'created' });
      } catch (err: any) {
        results.push({ type: 'association', name: assoc.name, status: 'error', error: err.message });
      }
    }

    // Seed test contacts for the association
    if (testAssocId) {
      const testContacts = [
        {
          name: 'Test Contact',
          email: 'test@example.com',
          phone: '+49 1234 567890',
          associationId: testAssocId
        }
      ];

      for (const contact of testContacts) {
        try {
          await Contact.findOneAndUpdate(
            { name: contact.name, associationId: contact.associationId },
            contact,
            { upsert: true, new: true }
          );
          results.push({ type: 'contact', name: contact.name, status: 'created' });
        } catch (err: any) {
          results.push({ type: 'contact', name: contact.name, status: 'error', error: err.message });
        }
      }
    }

    return { success: true, results };
  }),

  clearTestData: protectedProcedure.mutation(async () => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Test data clearing only available in development');
    }

    const pool = getMysqlPool();

    try {
      // Delete test season-league associations
      await pool.query(
        'DELETE FROM gamedays_seasonleagueteam WHERE season_id IN (SELECT id FROM gamedays_season WHERE slug LIKE "e2e-test-%")'
      );

      // Delete test leagues
      await pool.query('DELETE FROM gamedays_league WHERE slug LIKE "e2e-test-%"');

      // Delete test seasons
      await pool.query('DELETE FROM gamedays_season WHERE slug LIKE "e2e-test-%"');

      return { success: true };
    } catch (err: any) {
      throw new Error(`Failed to clear test data: ${err.message}`);
    }
  }),
});
