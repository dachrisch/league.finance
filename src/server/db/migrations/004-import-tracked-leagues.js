/**
 * Migration: Import the "Tracker Kontakte Ligen" sheet into
 * associations / contacts / trackedleagues.
 *
 * Idempotent: re-running skips any association/contact already created by
 * a previous run (matched by name) and any tracked league already present
 * for the same associationId + name + year.
 *
 * Set DRY_RUN=true to log intended writes without applying them.
 */
const mongoose = require('mongoose');
const { getMysqlPool } = require('../mysql');

const DRY_RUN = process.env.DRY_RUN === 'true';

// [{ label: the sheet's "Verband" column, contacts: sheet's "Kontakt" column split on '/',
//    leagues: [{ name, year, isYouth, estimatedTeamsCount, estimatedGamedaysCount, status, comment, contact }] }]
const GROUPS = [
  {
    label: 'AFVBy',
    contacts: ['Niko Tzioras', 'Lynn Hoffer'],
    leagues: [
      {
        name: 'Regionalliga + Bayernliga (Erwachsene)', year: 2025, isYouth: false,
        estimatedTeamsCount: '6', estimatedGamedaysCount: '21', status: 'closed_historical',
        comment: '180€ RL (6 Spieltage/6 Teams) + 450€ Bayernliga (15 Spieltage/6 Teams), 50% Rabatt 1. Saison. Vertrag+AVV unterschrieben, bezahlt. Preis: 630€ netto. Rechnung gestellt 23.03.2025 – keine Zahlungsbestätigung in Mails gefunden.',
        contact: 'Niko Tzioras',
      },
      {
        name: 'Bayern Ligen (teambasiert)', year: 2026, isYouth: false,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Erstangebot (Lizenzgebühr-Logik, 100€/Verein) abgelehnt, angepasstes teambasiertes Angebot angenommen 13.04.2026. Rechnung 29.05.2026, bezahlt 09.08.2026 ("Die Zahlung ist bei uns eingegangen"). Betrag nur im PDF-Angebot dokumentiert.',
        contact: 'Niko Tzioras',
      },
    ],
  },
  {
    label: 'AFVH',
    contacts: ['Michael Hanke'],
    leagues: [
      {
        name: 'Regionalliga Hessen (Erwachsene)', year: 2026, isYouth: false,
        estimatedTeamsCount: '9', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Angebot 08.04.2026, abgelehnt weil kein Budget geplant war. Keine Antwort auf Angebot gefunden.',
        contact: 'Michael Hanke',
      },
      {
        name: 'U16 Hessen (Jugend)', year: 2027, isYouth: true,
        estimatedTeamsCount: '16', estimatedGamedaysCount: null, status: 'lead',
        comment: 'Einfach mal für 2027 aufgenommen.',
        contact: 'Michael Hanke',
      },
    ],
  },
  {
    label: 'AFVD',
    contacts: ['Max Keneder'],
    leagues: [
      {
        name: 'DFFL (Bundesliga)', year: 2026, isYouth: false,
        estimatedTeamsCount: '16', estimatedGamedaysCount: null, status: 'offer_in_progress',
        comment: 'Teambasiertes Angebot 20.03.2026, Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF. Ausstehend, nur PDF.',
        contact: 'Max Keneder',
      },
      {
        name: 'DFFL2 (Bundesliga 2)', year: 2026, isYouth: false,
        estimatedTeamsCount: '20', estimatedGamedaysCount: null, status: 'offer_in_progress',
        comment: 'Teambasiertes Angebot 20.03.2026, Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF. Ausstehend, nur PDF.',
        contact: 'Max Keneder',
      },
      {
        name: 'DFFLF (Bundesliga Frauen)', year: 2026, isYouth: false,
        estimatedTeamsCount: '10', estimatedGamedaysCount: null, status: 'offer_in_progress',
        comment: 'Teambasiertes Angebot 20.03.2026, Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF. Ausstehend, nur PDF.',
        contact: 'Max Keneder',
      },
      {
        name: 'DFFLF2 (Bundesliga Frauen)', year: 2027, isYouth: false,
        estimatedTeamsCount: '9', estimatedGamedaysCount: null, status: 'lead',
        comment: 'Teil eines gemeinsamen Angebots für DFFL/DFFL2/DFFLF/DFFLF2. Kein Angebot gemacht.',
        contact: 'Max Keneder',
      },
    ],
  },
  {
    label: 'AFCVNRW',
    contacts: ['Fabian Pawlowski'],
    leagues: [
      {
        name: 'Regionalliga NRW (Erwachsene)', year: 2026, isYouth: false,
        estimatedTeamsCount: '12', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden. Fabian schlug 40–50% der Vereins-Lizenzgebühr vor (~1.740–2.175€ für alle NRW-Ligen zusammen).',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'Oberliga NRW (Erwachsene)', year: 2026, isYouth: false,
        estimatedTeamsCount: '17', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'U10 NRW (Jugend)', year: 2026, isYouth: true,
        estimatedTeamsCount: '6', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'U13 NRW (Jugend)', year: 2026, isYouth: true,
        estimatedTeamsCount: '11', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
      {
        name: 'U16 NRW (Jugend)', year: 2026, isYouth: true,
        estimatedTeamsCount: '9', estimatedGamedaysCount: null, status: 'closed_historical',
        comment: 'Teambasiertes Angebot 19.03.2026, angenommen 09.04.2026. SaaS-Vertrag unterschrieben, Rechnung 29.05.2026, keine Zahlungsbestätigung gefunden.',
        contact: 'Fabian Pawlowski',
      },
    ],
  },
  {
    label: 'Spielverbund Ost', // virtual: AFCVBB, AFVS, AFVSA, AFCVTH, AFCV-MV
    contacts: ['Chris Claussen', 'Melik Seelig', 'Julian Schickfluss'],
    leagues: [
      {
        name: 'Oberliga Ost (5er DFFL)', year: 2026, isYouth: false,
        estimatedTeamsCount: 'max. 6/Spieltag', estimatedGamedaysCount: '20', status: 'closed_historical',
        comment: 'Digitaler Passcheck inklusive. Angebot 21.08.2025 (korrigiert), angenommen 03.11.2025. Vertrag von allen 5 Landesverbänden zu unterschreiben; AFVS-Vertrag unterschrieben zurückgesandt (Jan 2026). Keine Rechnungs-/Zahlungsmail gefunden.',
        contact: 'Chris Claussen',
      },
    ],
  },
  {
    label: 'AFCVBB',
    contacts: [],
    leagues: [
      {
        name: 'Jugendligen U10/U13/U16 (Ober-/Landesliga)', year: 2027, isYouth: true,
        estimatedTeamsCount: '~50 (U10:15, U13:20, U16:15)', estimatedGamedaysCount: '~5 je Liga', status: 'offer_in_progress',
        comment: 'Je Altersklasse 2 Ligen (Oberliga+Landesliga). Anfrage 03.08.2026; 13€/Team genannt (650€, Richtwert), offizielles PDF-Angebot noch ausständig. Preisindikation 09.08.2026, ausstehend.',
        contact: 'Chris Claussen',
      },
    ],
  },
  {
    label: 'AFCV Rheinland-Pfalz',
    contacts: ['Markus Krüger'],
    leagues: [
      {
        name: 'Regionalliga (Senioren) RLP', year: 2026, isYouth: false,
        estimatedTeamsCount: '4', estimatedGamedaysCount: '~20 (vorläufig)', status: 'offer_in_progress',
        comment: '9€/Spieltag/Team Basispreis, halber Preis für Jugend-Teams → 36€/Spieltag bei 4 Teams, Gesamtsumme noch offen. In Vorbereitung (28.01.2026), Spielplan stand noch nicht final fest.',
        contact: 'Markus Krüger',
      },
    ],
  },
  {
    label: 'AFCV Mecklenburg-Vorpommern',
    contacts: ['Andreas Hantschmann'],
    leagues: [
      {
        name: 'Jugendflagliga MV', year: 2025, isYouth: true,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'lead',
        comment: 'Anfrage zur Nutzung der Scorecard-App im Jugendbereich. Nur Termin (06.02.2025) dokumentiert, kein Abschluss auffindbar.',
        contact: 'Andreas Hantschmann',
      },
    ],
  },
  {
    label: 'AFCVBW',
    contacts: ['Kerstin Nittel'],
    leagues: [
      {
        name: 'AFCVBW (allgemein)', year: 2026, isYouth: false,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'rejected_pre_offer',
        comment: 'Interesse über Discord signalisiert -> wohl selber gelöst über Gameday? Nur Infomail verschickt (09.01.2026), keine konkrete Anfrage/Zahlen.',
        contact: 'Kerstin Nittel',
      },
    ],
  },
  {
    label: 'Spielverbund Ost',
    contacts: ['Flavio Kleinwächter'],
    leagues: [
      {
        name: 'Spielverbund Ost (allgemein)', year: 2026, isYouth: false,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'rejected_pre_offer',
        comment: 'Interesse über Discord signalisiert -> gehört zu Melik. Nur Infomail verschickt (09.01.2026), keine konkrete Anfrage/Zahlen.',
        contact: 'Flavio Kleinwächter',
      },
    ],
  },
  {
    label: 'Spielverbund Nord', // virtual: AFCVHH, AFCVN, AFCV Nord (Bremen), AFCVSH
    contacts: [],
    leagues: [
      {
        name: 'Jugend + Erwachsene', year: 2026, isYouth: true,
        estimatedTeamsCount: null, estimatedGamedaysCount: null, status: 'rejected_pre_offer',
        comment: 'Haben ihre eigene leaguesphere Instanz.',
        contact: null,
      },
    ],
  },
];

const VIRTUAL_LABELS = new Set(['Spielverbund Ost', 'Spielverbund Nord']);

async function resolveLeaguesphereAssociation(pool, label) {
  if (VIRTUAL_LABELS.has(label)) return null;
  const [rows] = await pool.query(
    'SELECT id, abbr, name FROM gamedays_association WHERE abbr = ? OR name LIKE ? LIMIT 1',
    [label, `%${label}%`]
  );
  return rows[0] || null;
}

async function up() {
  const db = mongoose.connection.db;
  const associationCollection = db.collection('associations');
  const contactCollection = db.collection('contacts');
  const trackedLeagueCollection = db.collection('trackedleagues');

  const pool = getMysqlPool();

  const contactIdByName = new Map(); // dedupe contacts globally by name (e.g. Chris Claussen appears twice)
  let createdAssociations = 0, createdContacts = 0, createdLeagues = 0, skippedLeagues = 0;

  for (const group of GROUPS) {
    const leaguesphereMatch = await resolveLeaguesphereAssociation(pool, group.label);
    const associationName = leaguesphereMatch ? leaguesphereMatch.name : group.label;

    let association = await associationCollection.findOne({ name: associationName });
    if (!association) {
      const doc = {
        name: associationName,
        address: { street: '', city: '', postalCode: '', country: '' },
        leaguesphereAssociationId: leaguesphereMatch ? leaguesphereMatch.id : null,
        customerNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} association: ${associationName}${leaguesphereMatch ? ` (leaguesphere id ${leaguesphereMatch.id})` : ' (virtual — no leaguesphere match found, review manually)'}`);
      if (!DRY_RUN) {
        const result = await associationCollection.insertOne(doc);
        association = { _id: result.insertedId, ...doc };
      } else {
        association = { _id: `dry-run-${associationName}`, ...doc };
      }
      createdAssociations++;
    }

    for (const contactName of group.contacts) {
      if (contactIdByName.has(contactName)) continue;

      let contact = await contactCollection.findOne({ name: contactName });
      if (!contact) {
        const doc = {
          name: contactName,
          email: '', // sheet has no email addresses — backfill manually
          phone: '',
          associationId: association._id.toString(),
          address: { street: '', city: '', postalCode: '', country: '' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} contact: ${contactName} (associationId: ${associationName}) — NO EMAIL, backfill manually`);
        if (!DRY_RUN) {
          const result = await contactCollection.insertOne(doc);
          contact = { _id: result.insertedId, ...doc };
        } else {
          contact = { _id: `dry-run-${contactName}`, ...doc };
        }
        createdContacts++;
      }
      contactIdByName.set(contactName, contact._id);
    }

    for (const league of group.leagues) {
      const exists = await trackedLeagueCollection.findOne({
        associationId: association._id.toString(),
        name: league.name,
        year: league.year,
      });
      if (exists) {
        skippedLeagues++;
        continue;
      }

      const contactId = league.contact ? contactIdByName.get(league.contact) || null : null;
      const doc = {
        associationId: association._id.toString(),
        contactId: contactId,
        name: league.name,
        year: league.year,
        isYouth: league.isYouth,
        estimatedTeamsCount: league.estimatedTeamsCount,
        estimatedGamedaysCount: league.estimatedGamedaysCount,
        comment: league.comment,
        leaguesphereLeagueId: null,
        linkedOfferId: null,
        status: league.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} tracked league: ${league.name} (${league.year}) for ${associationName} — status ${league.status}`);
      if (!DRY_RUN) {
        await trackedLeagueCollection.insertOne(doc);
      }
      createdLeagues++;
    }
  }

  console.log(`\n✓ ${DRY_RUN ? '[dry-run] would create' : 'Created'} ${createdAssociations} associations, ${createdContacts} contacts, ${createdLeagues} tracked leagues (${skippedLeagues} already existed and were skipped).`);
}

async function down() {
  const db = mongoose.connection.db;
  const trackedLeagueCollection = db.collection('trackedleagues');

  const names = GROUPS.flatMap((g) => g.leagues.map((l) => l.name));
  const result = await trackedLeagueCollection.deleteMany({ name: { $in: names } });
  console.log(`✓ Removed ${result.deletedCount} imported tracked leagues. Associations and contacts created by this migration were left in place — remove them manually if desired.`);
}

module.exports = { up, down };
