/**
 * Applies a human-confirmed backfill proposal (association/contact addresses
 * and historical Offer/FinancialConfig bundles) found by searching Google
 * Drive for old offer/contract documents.
 *
 * This is deliberately NOT a numbered migration: Drive contents and address
 * data are fluid, re-searched fresh each run, not a fixed one-time snapshot
 * like migration 004's sheet import. See the "backfilling-tracked-leagues-
 * from-sheet" skill for how the input JSON gets produced (an agent searches
 * Drive, extracts candidates, and a human confirms them before this script
 * ever runs).
 *
 * Usage:
 *   npx tsx src/server/scripts/applyDriveBackfill.ts --input=./proposal.json [--dry-run]
 *
 * Point MONGO_URI at the test environment first, confirm the log output,
 * re-run for real, then repeat against production — same test-first
 * discipline as every other data-writing operation in this repo.
 */
import fs from 'fs';
import { connectMongo, disconnectMongo } from '../db/mongo';
import { Association } from '../models/Association';
import { Contact } from '../models/Contact';
import { Offer } from '../models/Offer';
import { FinancialConfig } from '../models/FinancialConfig';
import { TrackedLeague } from '../models/TrackedLeague';
import { buildFinancialConfigDocs, type OfferBundleLeague } from '../lib/offerBundleConfigs';

interface AddressUpdate {
  collection: 'associations' | 'contacts';
  id: string;
  address: { street: string; city: string; postalCode: string; country: string };
  source: string; // Drive file name/link, for the audit trail in the log
}

interface OfferBundle {
  associationId: string;
  contactId: string;
  seasonId: number;
  status: 'draft' | 'sending' | 'sent' | 'accepted' | 'rejected';
  costModel: 'SEASON' | 'GAMEDAY';
  leagues: OfferBundleLeague[];
  source: string;
}

interface BackfillProposal {
  addressUpdates?: AddressUpdate[];
  offerBundles?: OfferBundle[];
}

async function applyAddressUpdates(updates: AddressUpdate[], dryRun: boolean) {
  for (const update of updates) {
    const doc = update.collection === 'associations'
      ? await Association.findById(update.id)
      : await Contact.findById(update.id);
    if (!doc) {
      console.warn(`Skipping address update: ${update.collection} ${update.id} not found`);
      continue;
    }

    const current = doc.address;
    const isEmpty = !current?.street && !current?.city && !current?.postalCode;
    if (!isEmpty) {
      console.log(`Skipping ${update.collection} ${update.id} — address already set, not overwriting`);
      continue;
    }

    console.log(`${dryRun ? '[dry-run] would set' : 'Setting'} address for ${update.collection} ${update.id} from "${update.source}"`);
    if (!dryRun) {
      doc.address = update.address;
      await doc.save();
    }
  }
}

async function applyOfferBundles(bundles: OfferBundle[], dryRun: boolean) {
  for (const bundle of bundles) {
    const trackedLeagueIds = bundle.leagues.map((l) => l.trackedLeagueId);
    const alreadyLinked = await TrackedLeague.findOne({
      _id: { $in: trackedLeagueIds },
      linkedOfferId: { $ne: null },
    });
    if (alreadyLinked) {
      console.log(`Skipping bundle for association ${bundle.associationId} / season ${bundle.seasonId} — already linked to an offer`);
      continue;
    }

    console.log(`${dryRun ? '[dry-run] would create' : 'Creating'} offer for association ${bundle.associationId}, season ${bundle.seasonId}, ${bundle.leagues.length} league(s) — source: "${bundle.source}"`);
    if (dryRun) continue;

    const offer = await Offer.create({
      status: bundle.status,
      associationId: bundle.associationId,
      seasonId: bundle.seasonId,
      leagueIds: bundle.leagues.map((l) => l.leaguesphereLeagueId),
      contactId: bundle.contactId,
    });

    await FinancialConfig.insertMany(
      buildFinancialConfigDocs(offer._id, bundle.seasonId, bundle.costModel, bundle.leagues)
    );

    await TrackedLeague.updateMany(
      { _id: { $in: trackedLeagueIds } },
      { $set: { linkedOfferId: offer._id } }
    );
  }
}

async function main() {
  const inputArg = process.argv.find((a) => a.startsWith('--input='));
  if (!inputArg) {
    console.error('Usage: tsx src/server/scripts/applyDriveBackfill.ts --input=./proposal.json [--dry-run]');
    process.exit(1);
  }
  const dryRun = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  const proposal: BackfillProposal = JSON.parse(fs.readFileSync(inputArg.split('=')[1], 'utf-8'));

  await connectMongo();
  try {
    await applyAddressUpdates(proposal.addressUpdates || [], dryRun);
    await applyOfferBundles(proposal.offerBundles || [], dryRun);
    console.log(`\n✓ ${dryRun ? '[dry-run] done' : 'Backfill applied'}.`);
  } finally {
    await disconnectMongo();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
