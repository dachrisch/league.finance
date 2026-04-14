/**
 * Migration: Update Association and Contact schemas
 *
 * Association changes:
 * - Add address fields (street, city, postalCode, country)
 * - Remove email, phone, description (migrated to Contact)
 *
 * Contact changes:
 * - Add email field (required)
 * - Add phone field (optional)
 */
const mongoose = require('mongoose');

async function up() {
  const db = mongoose.connection.db;
  const associationCollection = db.collection('associations');
  const contactCollection = db.collection('contacts');

  console.log('Updating associations schema...');
  // Add address to associations, remove email/phone/description
  const assocResult = await associationCollection.updateMany(
    {},
    {
      $set: {
        address: {
          street: '',
          city: '',
          postalCode: '',
          country: '',
        },
      },
      $unset: {
        email: 1,
        phone: 1,
        description: 1,
      },
    }
  );
  console.log(`✓ Updated ${assocResult.modifiedCount} associations`);

  console.log('Updating contacts schema...');
  // Add email and phone fields to contacts if not present
  const contactResult = await contactCollection.updateMany(
    { email: { $exists: false } },
    {
      $set: {
        email: '',
        phone: '',
      },
    }
  );
  console.log(`✓ Updated ${contactResult.modifiedCount} contacts`);
}

async function down() {
  const db = mongoose.connection.db;
  const associationCollection = db.collection('associations');
  const contactCollection = db.collection('contacts');

  console.log('Rolling back associations schema...');
  // Restore associations to old schema
  const assocResult = await associationCollection.updateMany(
    {},
    {
      $unset: {
        address: 1,
      },
      $set: {
        email: '',
        phone: '',
        description: '',
      },
    }
  );
  console.log(`✓ Rolled back ${assocResult.modifiedCount} associations`);

  console.log('Rolling back contacts schema...');
  // Remove email and phone from contacts
  const contactResult = await contactCollection.updateMany(
    {},
    {
      $unset: {
        email: 1,
        phone: 1,
      },
    }
  );
  console.log(`✓ Rolled back ${contactResult.modifiedCount} contacts`);
}

module.exports = { up, down };
