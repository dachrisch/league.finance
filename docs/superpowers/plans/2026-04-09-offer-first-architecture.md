# Offer-First Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure leagues.finance from a config-first architecture to an offer-first architecture where Offers are the primary entity, with auto-generated FinancialConfigs and reusable Contacts.

**Architecture:** 
- Data layer: Add Association, Contact, and Offer models; modify FinancialConfig to link to Offer
- API layer: Create TRPC routers for associations, contacts, and offers with full CRUD and auto-config generation
- UI layer: Build 3-step offer creation wizard, offer detail page, associations management, and new primary offers dashboard
- Workflow: Shift from "create config → manage configs" to "create offer → auto-generate configs → send offer"

**Tech Stack:** 
- Backend: Node.js/Express, Mongoose (MongoDB), TRPC, Zod validation
- Frontend: React, Vite, React Router
- Database: MongoDB for Associations/Contacts/Offers, existing MySQL for reference data

---

## Phase 1: Data Models

### Task 1: Create Association Model

**Files:**
- Create: `src/server/models/Association.ts`
- Test: `src/server/models/__tests__/Association.test.ts`

- [ ] **Step 1: Write failing test for Association model**

Create `src/server/models/__tests__/Association.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Association } from '../Association';
import { connect, disconnect } from '../../db/mongo';

describe('Association Model', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an association with all required fields', async () => {
    const doc = await Association.create({
      name: 'Northern Region Leagues',
      description: 'Leagues in the northern region',
      email: 'contact@north.local',
      phone: '555-1234',
    });

    expect(doc.name).toBe('Northern Region Leagues');
    expect(doc.description).toBe('Leagues in the northern region');
    expect(doc.email).toBe('contact@north.local');
    expect(doc.phone).toBe('555-1234');
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    await expect(
      Association.create({
        description: 'Missing name',
        email: 'test@local',
        phone: '555-5555',
      })
    ).rejects.toThrow();
  });

  it('should require email field', async () => {
    await expect(
      Association.create({
        name: 'Test Association',
        description: 'Missing email',
        phone: '555-5555',
      })
    ).rejects.toThrow();
  });

  it('should update association', async () => {
    const doc = await Association.create({
      name: 'Test Assoc',
      description: 'Test',
      email: 'test@local',
      phone: '555-1111',
    });

    const updated = await Association.findByIdAndUpdate(
      doc._id,
      { name: 'Updated Assoc' },
      { returnDocument: 'after' }
    );

    expect(updated?.name).toBe('Updated Assoc');
  });

  it('should delete association', async () => {
    const doc = await Association.create({
      name: 'To Delete',
      description: 'Test',
      email: 'delete@local',
      phone: '555-9999',
    });

    await Association.deleteOne({ _id: doc._id });
    const found = await Association.findById(doc._id);

    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/server/models/__tests__/Association.test.ts
```

Expected output: FAIL - "Cannot find module '../Association'"

- [ ] **Step 3: Create Association model**

Create `src/server/models/Association.ts`:

```typescript
import { Schema, model, Document } from 'mongoose';

export interface IAssociation extends Document {
  name: string;
  description: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssociationSchema = new Schema<IAssociation>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Association = model<IAssociation>('Association', AssociationSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/server/models/__tests__/Association.test.ts
```

Expected output: PASS (all 5 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/server/models/Association.ts src/server/models/__tests__/Association.test.ts
git commit -m "feat(models): add Association model for offer grouping"
```

---

### Task 2: Create Contact Model

**Files:**
- Create: `src/server/models/Contact.ts`
- Test: `src/server/models/__tests__/Contact.test.ts`

- [ ] **Step 1: Write failing test for Contact model**

Create `src/server/models/__tests__/Contact.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Contact } from '../Contact';
import { connect, disconnect } from '../../db/mongo';

describe('Contact Model', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create a contact with name and address', async () => {
    const doc = await Contact.create({
      name: 'John Doe',
      address: {
        street: '123 Main St',
        city: 'Amsterdam',
        postalCode: '1012AB',
        country: 'Netherlands',
      },
    });

    expect(doc.name).toBe('John Doe');
    expect(doc.address.street).toBe('123 Main St');
    expect(doc.address.city).toBe('Amsterdam');
    expect(doc.address.postalCode).toBe('1012AB');
    expect(doc.address.country).toBe('Netherlands');
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    await expect(
      Contact.create({
        address: {
          street: '123 Main St',
          city: 'Amsterdam',
          postalCode: '1012AB',
          country: 'Netherlands',
        },
      })
    ).rejects.toThrow();
  });

  it('should update contact', async () => {
    const doc = await Contact.create({
      name: 'Jane Smith',
      address: {
        street: '456 Oak Ave',
        city: 'Rotterdam',
        postalCode: '3011XA',
        country: 'Netherlands',
      },
    });

    const updated = await Contact.findByIdAndUpdate(
      doc._id,
      { 'address.city': 'The Hague' },
      { returnDocument: 'after' }
    );

    expect(updated?.address.city).toBe('The Hague');
  });

  it('should be reusable across offers', async () => {
    const contact = await Contact.create({
      name: 'Reusable Contact',
      address: {
        street: '789 Pine Rd',
        city: 'Utrecht',
        postalCode: '3584AT',
        country: 'Netherlands',
      },
    });

    // Simulate reuse - just verify we can fetch it again
    const fetched = await Contact.findById(contact._id);
    expect(fetched?.name).toBe('Reusable Contact');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/server/models/__tests__/Contact.test.ts
```

Expected output: FAIL - "Cannot find module '../Contact'"

- [ ] **Step 3: Create Contact model**

Create `src/server/models/Contact.ts`:

```typescript
import { Schema, model, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const Contact = model<IContact>('Contact', ContactSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/server/models/__tests__/Contact.test.ts
```

Expected output: PASS (all 4 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/server/models/Contact.ts src/server/models/__tests__/Contact.test.ts
git commit -m "feat(models): add Contact model for reusable offer recipients"
```

---

### Task 3: Create Offer Model

**Files:**
- Create: `src/server/models/Offer.ts`
- Test: `src/server/models/__tests__/Offer.test.ts`

- [ ] **Step 1: Write failing test for Offer model**

Create `src/server/models/__tests__/Offer.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Offer } from '../Offer';
import { Association } from '../Association';
import { Contact } from '../Contact';
import { connect, disconnect } from '../../db/mongo';

describe('Offer Model', () => {
  let associationId: string;
  let contactId: string;

  beforeAll(async () => {
    await connect();
    const assoc = await Association.create({
      name: 'Test Assoc',
      description: 'Test',
      email: 'test@local',
      phone: '555-1234',
    });
    associationId = assoc._id.toString();

    const contact = await Contact.create({
      name: 'Test Contact',
      address: {
        street: '123 Test St',
        city: 'Test City',
        postalCode: '12345',
        country: 'Test Country',
      },
    });
    contactId = contact._id.toString();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an offer in draft status', async () => {
    const doc = await Offer.create({
      status: 'draft',
      associationId,
      seasonId: 2025,
      leagueIds: [1, 2, 3],
      contactId,
    });

    expect(doc.status).toBe('draft');
    expect(doc.associationId.toString()).toBe(associationId);
    expect(doc.seasonId).toBe(2025);
    expect(doc.leagueIds).toEqual([1, 2, 3]);
    expect(doc.contactId.toString()).toBe(contactId);
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('should transition from draft to sent', async () => {
    const doc = await Offer.create({
      status: 'draft',
      associationId,
      seasonId: 2025,
      leagueIds: [1],
      contactId,
    });

    const updated = await Offer.findByIdAndUpdate(
      doc._id,
      { status: 'sent', sentAt: new Date() },
      { returnDocument: 'after' }
    );

    expect(updated?.status).toBe('sent');
    expect(updated?.sentAt).toBeDefined();
  });

  it('should transition from sent to accepted', async () => {
    const doc = await Offer.create({
      status: 'sent',
      associationId,
      seasonId: 2025,
      leagueIds: [1],
      contactId,
      sentAt: new Date(),
    });

    const updated = await Offer.findByIdAndUpdate(
      doc._id,
      { status: 'accepted', acceptedAt: new Date() },
      { returnDocument: 'after' }
    );

    expect(updated?.status).toBe('accepted');
    expect(updated?.acceptedAt).toBeDefined();
  });

  it('should enforce unique (association, season) pair while draft/sent', async () => {
    // Create first offer
    await Offer.create({
      status: 'draft',
      associationId,
      seasonId: 2026,
      leagueIds: [1],
      contactId,
    });

    // Try to create second offer with same association/season
    await expect(
      Offer.create({
        status: 'draft',
        associationId,
        seasonId: 2026,
        leagueIds: [2],
        contactId,
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/server/models/__tests__/Offer.test.ts
```

Expected output: FAIL - "Cannot find module '../Offer'"

- [ ] **Step 3: Create Offer model**

Create `src/server/models/Offer.ts`:

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  status: 'draft' | 'sent' | 'accepted';
  associationId: Types.ObjectId;
  seasonId: number;
  leagueIds: number[];
  contactId: Types.ObjectId;
  financialConfigId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  acceptedAt?: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted'],
      default: 'draft',
      required: true,
    },
    associationId: { type: Schema.Types.ObjectId, ref: 'Association', required: true },
    seasonId: { type: Number, required: true },
    leagueIds: { type: [Number], required: true, minlength: 1 },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    financialConfigId: { type: Schema.Types.ObjectId, ref: 'FinancialConfig' },
    sentAt: { type: Date },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Enforce unique (association, season) while draft/sent
OfferSchema.index(
  { associationId: 1, seasonId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['draft', 'sent'] } },
  }
);

export const Offer = model<IOffer>('Offer', OfferSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/server/models/__tests__/Offer.test.ts
```

Expected output: PASS (all 4 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/server/models/Offer.ts src/server/models/__tests__/Offer.test.ts
git commit -m "feat(models): add Offer model as primary entity with draft/sent/accepted lifecycle"
```

---

### Task 4: Modify FinancialConfig to Link to Offer

**Files:**
- Modify: `src/server/models/FinancialConfig.ts`
- Test: `src/server/models/__tests__/FinancialConfig.test.ts` (add test)

- [ ] **Step 1: Write test for FinancialConfig with offerId**

Add to existing `src/server/models/__tests__/FinancialConfig.test.ts`:

```typescript
it('should link to parent offer', async () => {
  const assoc = await Association.create({
    name: 'Test Assoc',
    description: 'Test',
    email: 'test@local',
    phone: '555-1234',
  });

  const contact = await Contact.create({
    name: 'Test Contact',
    address: {
      street: '123 Test St',
      city: 'Test City',
      postalCode: '12345',
      country: 'Test Country',
    },
  });

  const offer = await Offer.create({
    status: 'draft',
    associationId: assoc._id,
    seasonId: 2025,
    leagueIds: [1],
    contactId: contact._id,
  });

  const config = await FinancialConfig.create({
    leagueId: 1,
    seasonId: 2025,
    costModel: 'SEASON',
    baseRateOverride: 100,
    expectedTeamsCount: 10,
    expectedGamedaysCount: 0,
    expectedTeamsPerGameday: 0,
    offerId: offer._id,
  });

  expect(config.offerId?.toString()).toBe(offer._id.toString());
});
```

- [ ] **Step 2: Verify test fails (because field doesn't exist)**

```bash
npm test -- src/server/models/__tests__/FinancialConfig.test.ts
```

Expected: FAIL - "offerId is not defined"

- [ ] **Step 3: Add offerId field to schema**

Modify `src/server/models/FinancialConfig.ts`:

```typescript
import { Schema, model, Document, Types } from 'mongoose';

export interface IFinancialConfig extends Document {
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
  offerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialConfigSchema = new Schema<IFinancialConfig>(
  {
    leagueId: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    costModel: { type: String, enum: ['SEASON', 'GAMEDAY'], required: true },
    baseRateOverride: { type: Number, default: null },
    expectedTeamsCount: { type: Number, default: 0, min: 0 },
    expectedGamedaysCount: { type: Number, default: 0, min: 0 },
    expectedTeamsPerGameday: { type: Number, default: 0, min: 0 },
    offerId: { type: Schema.Types.ObjectId, ref: 'Offer' },
  },
  { timestamps: true }
);

FinancialConfigSchema.index({ leagueId: 1, seasonId: 1 }, { unique: true });

export const FinancialConfig = model<IFinancialConfig>('FinancialConfig', FinancialConfigSchema);
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- src/server/models/__tests__/FinancialConfig.test.ts
```

Expected: PASS (new test passes, existing tests still pass)

- [ ] **Step 5: Commit**

```bash
git add src/server/models/FinancialConfig.ts src/server/models/__tests__/FinancialConfig.test.ts
git commit -m "feat(models): add offerId field to FinancialConfig for parent offer linking"
```

---

## Phase 2: Validation Schemas

### Task 5: Create Association Validation Schema

**Files:**
- Create: `shared/schemas/association.ts`

- [ ] **Step 1: Create schema file**

Create `shared/schemas/association.ts`:

```typescript
import { z } from 'zod';

export const CreateAssociationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  email: z.string().email('Valid email required'),
  phone: z.string().max(20).optional(),
});

export const UpdateAssociationSchema = CreateAssociationSchema.partial();

export type CreateAssociation = z.infer<typeof CreateAssociationSchema>;
export type UpdateAssociation = z.infer<typeof UpdateAssociationSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add shared/schemas/association.ts
git commit -m "feat(schemas): add Association validation schema"
```

---

### Task 6: Create Contact Validation Schema

**Files:**
- Create: `shared/schemas/contact.ts`

- [ ] **Step 1: Create schema file**

Create `shared/schemas/contact.ts`:

```typescript
import { z } from 'zod';

const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

export const CreateContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  address: AddressSchema,
});

export const UpdateContactSchema = CreateContactSchema.partial();

export type CreateContact = z.infer<typeof CreateContactSchema>;
export type UpdateContact = z.infer<typeof UpdateContactSchema>;
export type Address = z.infer<typeof AddressSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add shared/schemas/contact.ts
git commit -m "feat(schemas): add Contact validation schema with address"
```

---

### Task 7: Create Offer Validation Schema

**Files:**
- Create: `shared/schemas/offer.ts`

- [ ] **Step 1: Create schema file**

Create `shared/schemas/offer.ts`:

```typescript
import { z } from 'zod';

export const CreateOfferSchema = z.object({
  associationId: z.string().min(1, 'Association is required'),
  seasonId: z.number().int().positive('Season is required'),
  leagueIds: z.array(z.number().int().positive()).min(1, 'At least one league is required'),
  contactId: z.string().min(1, 'Contact is required'),
  costModel: z.enum(['SEASON', 'GAMEDAY']),
  baseRateOverride: z.number().positive().nullable().optional(),
  expectedTeamsCount: z.number().int().nonnegative().optional(),
});

export const UpdateOfferStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted']),
});

export const UpdateOfferContactSchema = z.object({
  contactId: z.string().min(1, 'Contact is required'),
});

export const UpdateOfferLeaguesSchema = z.object({
  leagueIds: z.array(z.number().int().positive()).min(1, 'At least one league is required'),
});

export type CreateOffer = z.infer<typeof CreateOfferSchema>;
export type UpdateOfferStatus = z.infer<typeof UpdateOfferStatusSchema>;
export type UpdateOfferContact = z.infer<typeof UpdateOfferContactSchema>;
export type UpdateOfferLeagues = z.infer<typeof UpdateOfferLeaguesSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add shared/schemas/offer.ts
git commit -m "feat(schemas): add Offer validation schemas for all operations"
```

---

## Phase 3: API Routers

### Task 8: Create Associations Router

**Files:**
- Create: `src/server/routers/finance/associations.ts`
- Test: `src/server/routers/finance/__tests__/associations.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/server/routers/finance/__tests__/associations.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { associationsRouter } from '../associations';
import { createCallerFactory } from '@trpc/server';
import { Association } from '../../../models/Association';
import { connect, disconnect } from '../../../db/mongo';

const createCaller = createCallerFactory()(associationsRouter);

describe('Associations Router', () => {
  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await disconnect();
  });

  it('should create an association', async () => {
    const caller = createCaller({});
    const result = await caller.create({
      name: 'Test League',
      description: 'Test',
      email: 'test@league.local',
      phone: '555-1234',
    });

    expect(result._id).toBeDefined();
    expect(result.name).toBe('Test League');
  });

  it('should list associations', async () => {
    const caller = createCaller({});
    await Association.create({
      name: 'League A',
      description: 'Test',
      email: 'a@league.local',
      phone: '555-1111',
    });

    const result = await caller.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should get association by id', async () => {
    const caller = createCaller({});
    const created = await Association.create({
      name: 'League B',
      description: 'Test',
      email: 'b@league.local',
      phone: '555-2222',
    });

    const result = await caller.getById({ id: created._id.toString() });
    expect(result?.name).toBe('League B');
  });

  it('should update association', async () => {
    const caller = createCaller({});
    const created = await Association.create({
      name: 'League C',
      description: 'Test',
      email: 'c@league.local',
      phone: '555-3333',
    });

    const result = await caller.update({
      id: created._id.toString(),
      data: { name: 'Updated League C' },
    });

    expect(result?.name).toBe('Updated League C');
  });

  it('should delete association', async () => {
    const caller = createCaller({});
    const created = await Association.create({
      name: 'League D',
      description: 'Test',
      email: 'd@league.local',
      phone: '555-4444',
    });

    await caller.delete({ id: created._id.toString() });
    const found = await Association.findById(created._id);
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Verify test fails**

```bash
npm test -- src/server/routers/finance/__tests__/associations.test.ts
```

Expected: FAIL - "Cannot find module '../associations'"

- [ ] **Step 3: Create associations router**

Create `src/server/routers/finance/associations.ts`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateAssociationSchema, UpdateAssociationSchema } from '../../../shared/schemas/association';
import { Association } from '../../models/Association';

export const associationsRouter = router({
  list: protectedProcedure.query(async () => {
    return Association.find().sort({ createdAt: -1 }).lean();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const assoc = await Association.findById(input.id).lean();
      if (!assoc) throw new TRPCError({ code: 'NOT_FOUND' });
      return assoc;
    }),

  create: adminProcedure
    .input(CreateAssociationSchema)
    .mutation(async ({ input }) => {
      const assoc = await Association.create(input);
      return assoc.toObject();
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateAssociationSchema }))
    .mutation(async ({ input }) => {
      const assoc = await Association.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' }).lean();
      if (!assoc) throw new TRPCError({ code: 'NOT_FOUND' });
      return assoc;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await Association.deleteOne({ _id: input.id });
      if (result.deletedCount === 0) throw new TRPCError({ code: 'NOT_FOUND' });
      return { success: true };
    }),
});
```

- [ ] **Step 4: Verify test passes**

```bash
npm test -- src/server/routers/finance/__tests__/associations.test.ts
```

Expected: PASS (all tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/server/routers/finance/associations.ts src/server/routers/finance/__tests__/associations.test.ts
git commit -m "feat(routers): add associations CRUD router"
```

---

### Task 9: Create Contacts Router

**Files:**
- Create: `src/server/routers/finance/contacts.ts`

- [ ] **Step 1: Create contacts router**

Create `src/server/routers/finance/contacts.ts`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateContactSchema, UpdateContactSchema } from '../../../shared/schemas/contact';
import { Contact } from '../../models/Contact';

export const contactsRouter = router({
  list: protectedProcedure.query(async () => {
    return Contact.find().sort({ createdAt: -1 }).lean();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const contact = await Contact.findById(input.id).lean();
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      return contact;
    }),

  create: adminProcedure
    .input(CreateContactSchema)
    .mutation(async ({ input }) => {
      const contact = await Contact.create(input);
      return contact.toObject();
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateContactSchema }))
    .mutation(async ({ input }) => {
      const contact = await Contact.findByIdAndUpdate(input.id, input.data, { returnDocument: 'after' }).lean();
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND' });
      return contact;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await Contact.deleteOne({ _id: input.id });
      if (result.deletedCount === 0) throw new TRPCError({ code: 'NOT_FOUND' });
      return { success: true };
    }),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/server/routers/finance/contacts.ts
git commit -m "feat(routers): add contacts CRUD router"
```

---

### Task 10: Create Offers Router with Auto-Config Generation

**Files:**
- Create: `src/server/routers/finance/offers.ts`
- Create: `src/server/lib/offerCalculations.ts`

- [ ] **Step 1: Create offer calculations utility**

Create `src/server/lib/offerCalculations.ts`:

```typescript
import { Types } from 'mongoose';
import { FinancialConfig } from '../models/FinancialConfig';
import { Offer } from '../models/Offer';

export interface CreateConfigsForOfferInput {
  offerId: Types.ObjectId;
  leagueIds: number[];
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
}

/**
 * Auto-generate FinancialConfig records when offer is created.
 * Creates one config per selected league.
 */
export async function createConfigsForOffer(input: CreateConfigsForOfferInput): Promise<void> {
  const { offerId, leagueIds, seasonId, costModel, baseRateOverride, expectedTeamsCount } = input;

  for (const leagueId of leagueIds) {
    await FinancialConfig.create({
      leagueId,
      seasonId,
      costModel,
      baseRateOverride,
      expectedTeamsCount,
      expectedGamedaysCount: costModel === 'GAMEDAY' ? 0 : undefined,
      expectedTeamsPerGameday: costModel === 'GAMEDAY' ? 0 : undefined,
      offerId,
    });
  }
}

/**
 * Delete all FinancialConfigs associated with an offer.
 */
export async function deleteConfigsForOffer(offerId: Types.ObjectId): Promise<void> {
  await FinancialConfig.deleteMany({ offerId });
}

/**
 * Update FinancialConfigs when offer leagues change.
 * Removes configs for leagues no longer selected, adds new ones.
 */
export async function updateConfigsForOffer(
  offerId: Types.ObjectId,
  newLeagueIds: number[],
  seasonId: number,
  costModel: 'SEASON' | 'GAMEDAY',
  baseRateOverride: number | null,
  expectedTeamsCount: number
): Promise<void> {
  const existingConfigs = await FinancialConfig.find({ offerId }).lean();
  const existingLeagueIds = existingConfigs.map((c) => c.leagueId);

  // Delete configs for removed leagues
  const removedLeagueIds = existingLeagueIds.filter((id) => !newLeagueIds.includes(id));
  if (removedLeagueIds.length > 0) {
    await FinancialConfig.deleteMany({ offerId, leagueId: { $in: removedLeagueIds } });
  }

  // Create configs for new leagues
  const newLeagueIdsList = newLeagueIds.filter((id) => !existingLeagueIds.includes(id));
  if (newLeagueIdsList.length > 0) {
    await createConfigsForOffer({
      offerId,
      leagueIds: newLeagueIdsList,
      seasonId,
      costModel,
      baseRateOverride,
      expectedTeamsCount,
    });
  }
}
```

- [ ] **Step 2: Create offers router**

Create `src/server/routers/finance/offers.ts`:

```typescript
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, adminProcedure } from '../../trpc';
import { CreateOfferSchema, UpdateOfferStatusSchema, UpdateOfferContactSchema, UpdateOfferLeaguesSchema } from '../../../shared/schemas/offer';
import { Offer } from '../../models/Offer';
import { FinancialConfig } from '../../models/FinancialConfig';
import { Association } from '../../models/Association';
import { Contact } from '../../models/Contact';
import { createConfigsForOffer, deleteConfigsForOffer, updateConfigsForOffer } from '../../lib/offerCalculations';

export const offersRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'sent', 'accepted']).optional(),
        associationId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const filter: any = {};
      if (input.status) filter.status = input.status;
      if (input.associationId) filter.associationId = input.associationId;

      return Offer.find(filter)
        .populate('associationId')
        .populate('contactId')
        .sort({ createdAt: -1 })
        .lean();
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const offer = await Offer.findById(input.id)
        .populate('associationId')
        .populate('contactId')
        .lean();

      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      const configs = await FinancialConfig.find({ offerId: input.id }).lean();

      return { offer, configs };
    }),

  create: adminProcedure
    .input(CreateOfferSchema)
    .mutation(async ({ input }) => {
      // Verify association exists
      const assoc = await Association.findById(input.associationId);
      if (!assoc) throw new TRPCError({ code: 'NOT_FOUND', message: 'Association not found' });

      // Verify contact exists
      const contact = await Contact.findById(input.contactId);
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });

      // Check for existing draft/sent offer
      const existing = await Offer.findOne({
        associationId: input.associationId,
        seasonId: input.seasonId,
        status: { $in: ['draft', 'sent'] },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An active offer already exists for this association and season',
        });
      }

      try {
        // Create offer
        const offer = await Offer.create({
          associationId: input.associationId,
          seasonId: input.seasonId,
          leagueIds: input.leagueIds,
          contactId: input.contactId,
          status: 'draft',
        });

        // Auto-create configs
        await createConfigsForOffer({
          offerId: offer._id,
          leagueIds: input.leagueIds,
          seasonId: input.seasonId,
          costModel: input.costModel,
          baseRateOverride: input.baseRateOverride ?? null,
          expectedTeamsCount: input.expectedTeamsCount ?? 0,
        });

        // Fetch created offer with populated data
        const result = await Offer.findById(offer._id)
          .populate('associationId')
          .populate('contactId')
          .lean();

        return result;
      } catch (err: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to create offer: ${err.message}`,
        });
      }
    }),

  updateStatus: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateOfferStatusSchema }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      const updates: any = { status: input.data.status };

      if (input.data.status === 'sent' && !offer.sentAt) {
        updates.sentAt = new Date();
      } else if (input.data.status === 'accepted' && !offer.acceptedAt) {
        updates.acceptedAt = new Date();
      }

      const updated = await Offer.findByIdAndUpdate(input.id, updates, { returnDocument: 'after' })
        .populate('associationId')
        .populate('contactId')
        .lean();

      return updated;
    }),

  updateContact: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateOfferContactSchema }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      if (offer.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only edit contact on draft offers',
        });
      }

      const contact = await Contact.findById(input.data.contactId);
      if (!contact) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found' });

      const updated = await Offer.findByIdAndUpdate(input.id, { contactId: input.data.contactId }, { returnDocument: 'after' })
        .populate('associationId')
        .populate('contactId')
        .lean();

      return updated;
    }),

  updateLeagues: adminProcedure
    .input(z.object({ id: z.string(), data: UpdateOfferLeaguesSchema }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      if (offer.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only edit leagues on draft offers',
        });
      }

      // Get current config to preserve settings
      const existingConfig = await FinancialConfig.findOne({ offerId: input.id }).lean();
      if (!existingConfig) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No config found for offer',
        });
      }

      // Update configs
      await updateConfigsForOffer(
        offer._id,
        input.data.leagueIds,
        offer.seasonId,
        existingConfig.costModel as 'SEASON' | 'GAMEDAY',
        existingConfig.baseRateOverride,
        existingConfig.expectedTeamsCount
      );

      // Update league IDs
      const updated = await Offer.findByIdAndUpdate(input.id, { leagueIds: input.data.leagueIds }, { returnDocument: 'after' })
        .populate('associationId')
        .populate('contactId')
        .lean();

      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const offer = await Offer.findById(input.id);
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND' });

      if (offer.status !== 'draft') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Can only delete draft offers',
        });
      }

      // Delete associated configs
      await deleteConfigsForOffer(offer._id);

      // Delete offer
      await Offer.deleteOne({ _id: input.id });

      return { success: true };
    }),
});
```

- [ ] **Step 3: Commit both files**

```bash
git add src/server/lib/offerCalculations.ts src/server/routers/finance/offers.ts
git commit -m "feat(routers): add offers CRUD router with auto-config generation"
```

---

### Task 11: Register New Routers in Index

**Files:**
- Modify: `src/server/routers/index.ts`

- [ ] **Step 1: Update router registration**

Modify `src/server/routers/index.ts` to add the new routers:

```typescript
import { router } from '../trpc';
import { authRouter } from './auth';
import { teamsRouter } from './teams';
import { settingsRouter } from './finance/settings';
import { configsRouter } from './finance/configs';
import { discountsRouter } from './finance/discounts';
import { dashboardRouter } from './finance/dashboard';
import { calculateRouter } from './finance/calculate';
import { associationsRouter } from './finance/associations';
import { contactsRouter } from './finance/contacts';
import { offersRouter } from './finance/offers';
import { healthRouter } from './health';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  teams: teamsRouter,
  finance: router({
    settings: settingsRouter,
    configs: configsRouter,
    discounts: discountsRouter,
    dashboard: dashboardRouter,
    calculate: calculateRouter,
    associations: associationsRouter,
    contacts: contactsRouter,
    offers: offersRouter,
  }),
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 2: Commit**

```bash
git add src/server/routers/index.ts
git commit -m "feat(routers): register associations, contacts, and offers routers"
```

---

## Phase 4: UI - Associations Management

### Task 12: Create Associations Management Page

**Files:**
- Create: `src/client/pages/AssociationsPage.tsx`

- [ ] **Step 1: Create associations page**

Create `src/client/pages/AssociationsPage.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function AssociationsPage() {
  const navigate = useNavigate();
  const { data: associations, isLoading, refetch } = trpc.finance.associations.list.useQuery();
  const createAssoc = trpc.finance.associations.create.useMutation({ onSuccess: () => refetch() });
  const deleteAssoc = trpc.finance.associations.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createAssoc.mutate(formData, {
      onSuccess: () => {
        setFormData({ name: '', description: '', email: '', phone: '' });
        setShowForm(false);
      },
    });
  }

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Associations</h1>
        <button onClick={() => navigate('/offers')} className="btn btn-primary">
          View Offers
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Name</span>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ padding: '8px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Description</span>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ padding: '8px', minHeight: '80px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Email</span>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ padding: '8px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Phone</span>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ padding: '8px' }}
              />
            </label>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={createAssoc.isPending}
                style={{
                  padding: '10px 20px',
                  background: '#0d6efd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {createAssoc.isPending ? 'Creating…' : 'Create Association'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
            {createAssoc.isError && <p style={{ color: 'red' }}>{createAssoc.error.message}</p>}
          </form>
        </div>
      )}

      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn btn-primary" style={{ marginBottom: '2rem' }}>
          + New Association
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {associations?.map((assoc: any) => (
          <div key={assoc._id} style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>{assoc.name}</h3>
            <p style={{ color: '#666', fontSize: 14, margin: '0.5rem 0' }}>{assoc.description}</p>
            <p style={{ fontSize: 14, margin: '0.5rem 0' }}>
              <strong>Email:</strong> {assoc.email}
            </p>
            <p style={{ fontSize: 14, margin: '0.5rem 0' }}>
              <strong>Phone:</strong> {assoc.phone || '—'}
            </p>
            <button
              onClick={() => deleteAssoc.mutate({ id: assoc._id })}
              disabled={deleteAssoc.isPending}
              style={{
                marginTop: '1rem',
                padding: '8px 12px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/pages/AssociationsPage.tsx
git commit -m "feat(ui): add associations management page"
```

---

## Phase 5: UI - Offer Creation Wizard

### Task 13: Create Offer Creation Wizard - Step 1

**Files:**
- Create: `src/client/pages/OfferCreatePage.tsx`

- [ ] **Step 1: Create offer creation page with Step 1**

Create `src/client/pages/OfferCreatePage.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

type Step = 1 | 2 | 3;

interface OfferFormData {
  associationId: string;
  seasonId: string;
  contactId: string;
  leagueIds: number[];
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: string;
  expectedTeamsCount: string;
}

export function OfferCreatePage() {
  const navigate = useNavigate();
  const { data: associations } = trpc.finance.associations.list.useQuery();
  const { data: seasons } = trpc.teams.seasons.useQuery();
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const { data: contacts } = trpc.finance.contacts.list.useQuery();
  const createOffer = trpc.finance.offers.create.useMutation({
    onSuccess: (offer: any) => navigate(`/offers/${offer._id}`),
  });

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<OfferFormData>({
    associationId: '',
    seasonId: '',
    contactId: '',
    leagueIds: [],
    costModel: 'SEASON',
    baseRateOverride: '',
    expectedTeamsCount: '0',
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const createContact = trpc.finance.contacts.create.useMutation({
    onSuccess: (contact: any) => {
      setForm({ ...form, contactId: contact._id });
      setShowContactForm(false);
      setContactForm({ name: '', street: '', city: '', postalCode: '', country: '' });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    createOffer.mutate({
      associationId: form.associationId,
      seasonId: Number(form.seasonId),
      contactId: form.contactId,
      leagueIds: form.leagueIds,
      costModel: form.costModel,
      baseRateOverride: form.baseRateOverride ? Number(form.baseRateOverride) : null,
      expectedTeamsCount: Number(form.expectedTeamsCount),
    });
  }

  function handleCreateContact(e: React.FormEvent) {
    e.preventDefault();
    createContact.mutate({
      name: contactForm.name,
      address: {
        street: contactForm.street,
        city: contactForm.city,
        postalCode: contactForm.postalCode,
        country: contactForm.country,
      },
    });
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <button
        onClick={() => navigate('/offers')}
        className="btn-danger-text"
        style={{ marginBottom: '1rem', color: '#0d6efd', padding: 0, display: 'block' }}
      >
        ← Back to Offers
      </button>

      <h1 style={{ marginBottom: '2rem' }}>Create New Offer</h1>

      {/* Step Indicator */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{
            padding: '0.5rem 1rem',
            background: step === s ? '#0d6efd' : '#ddd',
            color: step === s ? '#fff' : '#000',
            borderRadius: 6,
            fontWeight: 'bold',
            cursor: 'pointer',
          }} onClick={() => s < step && setStep(s as Step)}>
            Step {s}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        {/* STEP 1: Association & Season */}
        {step === 1 && (
          <>
            <h2>Step 1: Select Association & Season</h2>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Association</span>
              <select
                value={form.associationId}
                onChange={(e) => setForm({ ...form, associationId: e.target.value })}
                required
                style={{ padding: '8px' }}
              >
                <option value="">— select —</option>
                {associations?.map((a: any) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Season</span>
              <select
                value={form.seasonId}
                onChange={(e) => setForm({ ...form, seasonId: e.target.value })}
                required
                style={{ padding: '8px' }}
              >
                <option value="">— select —</option>
                {seasons?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!form.associationId || !form.seasonId}
              style={{
                marginTop: '1rem',
                padding: '12px',
                background: '#0d6efd',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: form.associationId && form.seasonId ? 1 : 0.5,
              }}
            >
              Next: Select Contact
            </button>
          </>
        )}

        {/* STEP 2: Contact */}
        {step === 2 && (
          <>
            <h2>Step 2: Select or Create Contact</h2>

            {showContactForm ? (
              <>
                <h3>Create New Contact</h3>
                <input
                  type="text"
                  placeholder="Name"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  style={{ padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Street"
                  required
                  value={contactForm.street}
                  onChange={(e) => setContactForm({ ...contactForm, street: e.target.value })}
                  style={{ padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={contactForm.city}
                  onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                  style={{ padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  required
                  value={contactForm.postalCode}
                  onChange={(e) => setContactForm({ ...contactForm, postalCode: e.target.value })}
                  style={{ padding: '8px' }}
                />
                <input
                  type="text"
                  placeholder="Country"
                  required
                  value={contactForm.country}
                  onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                  style={{ padding: '8px' }}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleCreateContact}
                    disabled={createContact.isPending}
                    style={{
                      padding: '10px 20px',
                      background: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    Create Contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#6c757d',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  {contacts?.map((c: any) => (
                    <div
                      key={c._id}
                      onClick={() => setForm({ ...form, contactId: c._id })}
                      style={{
                        padding: '1rem',
                        border: form.contactId === c._id ? '2px solid #0d6efd' : '1px solid #ddd',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: form.contactId === c._id ? '#f0f8ff' : '#fff',
                      }}
                    >
                      <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{c.name}</p>
                      <p style={{ fontSize: 12, margin: 0, color: '#666' }}>{c.address.street}, {c.address.city}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactForm(true)}
                  style={{
                    padding: '10px 20px',
                    background: '#17a2b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    marginBottom: '1rem',
                  }}
                >
                  + Create New Contact
                </button>
              </>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!form.contactId}
                style={{
                  padding: '10px 20px',
                  background: '#0d6efd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  opacity: form.contactId ? 1 : 0.5,
                }}
              >
                Next: Set Pricing & Leagues
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Pricing & Leagues */}
        {step === 3 && (
          <>
            <h2>Step 3: Set Pricing & Select Leagues</h2>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Cost Model</span>
              <select
                value={form.costModel}
                onChange={(e) => setForm({ ...form, costModel: e.target.value as 'SEASON' | 'GAMEDAY' })}
                style={{ padding: '8px' }}
              >
                <option value="SEASON">Cost per team in season (Flat Fee)</option>
                <option value="GAMEDAY">Cost per team per gameday (Usage-based)</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Base Rate Override (€)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                value={form.baseRateOverride}
                onChange={(e) => setForm({ ...form, baseRateOverride: e.target.value })}
                style={{ padding: '8px' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>Expected Teams Count</span>
              <input
                type="number"
                min="0"
                value={form.expectedTeamsCount}
                onChange={(e) => setForm({ ...form, expectedTeamsCount: e.target.value })}
                style={{ padding: '8px' }}
              />
            </label>

            <fieldset style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: 6 }}>
              <legend style={{ fontWeight: 'bold' }}>Select Leagues</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                {leagues?.map((l: any) => (
                  <label key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={form.leagueIds.includes(l.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setForm({ ...form, leagueIds: [...form.leagueIds, l.id] });
                        } else {
                          setForm({ ...form, leagueIds: form.leagueIds.filter((id) => id !== l.id) });
                        }
                      }}
                    />
                    <span>{l.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={createOffer.isPending || form.leagueIds.length === 0}
                style={{
                  padding: '10px 20px',
                  background: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  opacity: form.leagueIds.length > 0 ? 1 : 0.5,
                }}
              >
                {createOffer.isPending ? 'Creating…' : 'Create Offer (Draft)'}
              </button>
            </div>

            {createOffer.isError && <p style={{ color: 'red', marginTop: '1rem' }}>{createOffer.error.message}</p>}
          </>
        )}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/pages/OfferCreatePage.tsx
git commit -m "feat(ui): add 3-step offer creation wizard"
```

---

### Task 14: Create Offer Detail Page

**Files:**
- Create: `src/client/pages/OfferDetailPage.tsx`

- [ ] **Step 1: Create offer detail page**

Create `src/client/pages/OfferDetailPage.tsx`:

```typescript
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, refetch } = trpc.finance.offers.getById.useQuery({ id: id! }, { enabled: !!id });
  const { data: leagues } = trpc.teams.leagues.useQuery();
  const updateStatus = trpc.finance.offers.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteOffer = trpc.finance.offers.delete.useMutation({
    onSuccess: () => navigate('/offers'),
  });

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p>Offer not found.</p>;

  const { offer, configs } = data;
  const leagueNames: Record<number, string> = Object.fromEntries((leagues ?? []).map((l: any) => [l.id, l.name]));

  return (
    <div className="container">
      <button
        onClick={() => navigate('/offers')}
        className="btn-danger-text"
        style={{ marginBottom: '1rem', color: '#0d6efd', padding: 0, display: 'block' }}
      >
        ← Back to Offers
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Offer Details</h1>
        <span
          style={{
            padding: '0.5rem 1rem',
            background: offer.status === 'draft' ? '#ffc107' : offer.status === 'sent' ? '#17a2b8' : '#28a745',
            color: '#fff',
            borderRadius: 6,
            fontWeight: 'bold',
            textTransform: 'capitalize',
          }}
        >
          {offer.status}
        </span>
      </div>

      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2>Offer Summary</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Association</p>
            <p style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>{(offer.associationId as any)?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Season</p>
            <p style={{ fontWeight: 'bold', margin: '0.5rem 0 ' }}>{offer.seasonId}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Contact</p>
            <p style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>{(offer.contactId as any)?.name}</p>
          </div>
          <div>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Leagues ({offer.leagueIds.length})</p>
            <p style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>
              {offer.leagueIds.map((id) => leagueNames[id]).join(', ')}
            </p>
          </div>
        </div>

        {offer.sentAt && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Sent At</p>
            <p style={{ fontWeight: 'bold' }}>{new Date(offer.sentAt).toLocaleDateString()}</p>
          </div>
        )}

        {offer.acceptedAt && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Accepted At</p>
            <p style={{ fontWeight: 'bold' }}>{new Date(offer.acceptedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
        <h2>Financial Configurations ({configs.length})</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {configs.map((config: any) => (
            <div key={config._id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 6 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>League</p>
                  <p style={{ fontWeight: 'bold' }}>{leagueNames[config.leagueId]}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Cost Model</p>
                  <p style={{ fontWeight: 'bold' }}>{config.costModel}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Base Rate</p>
                  <p style={{ fontWeight: 'bold' }}>€{config.baseRateOverride ?? '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {offer.status === 'draft' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => updateStatus.mutate({ id: offer._id, data: { status: 'sent' } })}
            disabled={updateStatus.isPending}
            className="btn btn-primary"
          >
            Send Offer
          </button>
          <button
            onClick={() => deleteOffer.mutate({ id: offer._id })}
            disabled={deleteOffer.isPending}
            className="btn btn-danger"
          >
            Delete Offer
          </button>
        </div>
      )}

      {offer.status === 'sent' && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => updateStatus.mutate({ id: offer._id, data: { status: 'accepted' } })}
            disabled={updateStatus.isPending}
            className="btn btn-primary"
          >
            Mark Accepted
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/pages/OfferDetailPage.tsx
git commit -m "feat(ui): add offer detail page with lifecycle actions"
```

---

### Task 15: Create Offers List Page (Primary Dashboard)

**Files:**
- Create: `src/client/pages/OffersPage.tsx`

- [ ] **Step 1: Create offers list page**

Create `src/client/pages/OffersPage.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function OffersPage() {
  const navigate = useNavigate();
  const { data: offers, isLoading, refetch } = trpc.finance.offers.list.useQuery({});
  const { data: associations } = trpc.finance.associations.list.useQuery();
  const [filterStatus, setFilterStatus] = useState<'draft' | 'sent' | 'accepted' | 'all'>('all');

  const assocNames: Record<string, string> = Object.fromEntries((associations ?? []).map((a: any) => [a._id, a.name]));

  const filtered = offers?.filter((o: any) => filterStatus === 'all' || o.status === filterStatus) ?? [];

  if (isLoading) return <p>Loading…</p>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Offers</h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/offers/create')} className="btn btn-primary">
            + New Offer
          </button>
          <button onClick={() => navigate('/associations')} className="btn btn-secondary">
            Associations
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['all', 'draft', 'sent', 'accepted'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            style={{
              padding: '0.5rem 1rem',
              background: filterStatus === status ? '#0d6efd' : '#e9ecef',
              color: filterStatus === status ? '#fff' : '#000',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'capitalize',
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p>No offers found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filtered.map((offer: any) => (
            <div
              key={offer._id}
              onClick={() => navigate(`/offers/${offer._id}`)}
              style={{
                background: '#fff',
                padding: '1.5rem',
                borderRadius: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                borderLeft: offer.status === 'draft' ? '4px solid #ffc107' : offer.status === 'sent' ? '4px solid #17a2b8' : '4px solid #28a745',
                transition: 'box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>{assocNames[offer.associationId]}</h3>
                  <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Season {offer.seasonId}</p>
                </div>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    background: offer.status === 'draft' ? '#ffc107' : offer.status === 'sent' ? '#17a2b8' : '#28a745',
                    color: '#fff',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                >
                  {offer.status}
                </span>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Contact</p>
                <p style={{ fontWeight: 'bold', margin: 0 }}>{(offer.contactId as any)?.name}</p>
              </div>

              <div>
                <p style={{ fontSize: 12, color: '#666', margin: 0 }}>Leagues ({offer.leagueIds.length})</p>
                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {offer.leagueIds.slice(0, 3).map((id: number) => (
                    <span key={id} style={{ fontSize: 11, background: '#e9ecef', padding: '0.25rem 0.5rem', borderRadius: 4 }}>
                      League {id}
                    </span>
                  ))}
                  {offer.leagueIds.length > 3 && <span style={{ fontSize: 11, color: '#666' }}>+{offer.leagueIds.length - 3} more</span>}
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#999', margin: '1rem 0 0 0' }}>
                Created {new Date(offer.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/pages/OffersPage.tsx
git commit -m "feat(ui): add offers list as primary dashboard entry point"
```

---

## Phase 6: Route Integration

### Task 16: Add Routes to App

**Files:**
- Modify: `src/client/App.tsx`

- [ ] **Step 1: Add offer routes**

Modify `src/client/App.tsx` to include new routes. Read the file first to understand current structure:

```bash
# Check current routing structure
head -100 src/client/App.tsx
```

Then add these routes (exact location depends on current structure):

```typescript
import { OffersPage } from './pages/OffersPage';
import { OfferDetailPage } from './pages/OfferDetailPage';
import { OfferCreatePage } from './pages/OfferCreatePage';
import { AssociationsPage } from './pages/AssociationsPage';

// Add to route array/configuration:
{
  path: '/offers',
  element: <OffersPage />,
},
{
  path: '/offers/:id',
  element: <OfferDetailPage />,
},
{
  path: '/offers/create',
  element: <OfferCreatePage />,
},
{
  path: '/associations',
  element: <AssociationsPage />,
},
```

- [ ] **Step 2: Verify routes load**

```bash
npm run dev
# Navigate to http://localhost:5173/offers and verify page loads
```

- [ ] **Step 3: Commit**

```bash
git add src/client/App.tsx
git commit -m "feat(routing): add offers, associations, and offer creation routes"
```

---

### Task 17: Update Dashboard Navigation

**Files:**
- Modify: `src/client/pages/DashboardPage.tsx`

- [ ] **Step 1: Add navigation to offers**

Modify `src/client/pages/DashboardPage.tsx` to add a navigation button to offers:

```typescript
// In the button section where "+ New Config" is shown, add:
<button onClick={() => navigate('/offers')} className="btn btn-primary">
  Offers
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/client/pages/DashboardPage.tsx
git commit -m "feat(ui): add navigation link to offers from dashboard"
```

---

## Phase 7: Final Verification

### Task 18: Run Full Test Suite

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass (models, routers, schemas)

- [ ] **Step 2: Check for TypeScript errors**

```bash
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Verify dev server runs**

```bash
npm run dev
```

Expected: Dev server starts at `http://localhost:5173`

- [ ] **Step 4: Test offer creation workflow**

Manual verification:
1. Navigate to http://localhost:5173/offers
2. Click "+ New Offer"
3. Follow 3-step wizard (select association, contact, pricing/leagues)
4. Click "Create Offer (Draft)"
5. Verify offer detail page loads
6. Verify leagues and configs are shown
7. Navigate back to /offers and verify offer appears in list

- [ ] **Step 5: Commit verification checkpoint**

```bash
git add .
git commit -m "feat: complete offer-first architecture redesign

- Add Association, Contact, Offer models with proper relationships
- Add FinancialConfig modification with offerId linking
- Create validation schemas for all new entities
- Add TRPC routers for associations, contacts, offers with full CRUD
- Implement auto-config generation on offer creation
- Build 3-step offer creation wizard UI
- Add offer detail page with lifecycle management
- Add offers list as primary dashboard entry point
- Add associations management page
- Integrate routing and navigation
- All tests passing, TypeScript clean, ready for deployment"
```

---

## Implementation Notes

**Key Points for Implementation:**

1. **TDD Approach:** Each model and router follows RED → GREEN → REFACTOR pattern
2. **Validation:** Zod schemas validate all inputs before processing
3. **Relationships:** Offers link to Associations, Contacts, and auto-generated FinancialConfigs
4. **Workflow:** Draft → Sent → Accepted lifecycle with status-based edit restrictions
5. **Auto-Creation:** FinancialConfigs are created automatically when offers are created, one per selected league
6. **Reusability:** Contacts are fully reusable across multiple offers
7. **Backward Compatibility:** FinancialConfig modification is backward-compatible (offerId is optional)

**Testing Strategy:**

- Unit tests for models verify schema enforcement
- Router tests verify CRUD operations and business logic
- Integration tests verify multi-step workflows (already built into router tests)
- Manual UI tests verify 3-step wizard and navigation

**Deployment Readiness:**

- All new models export TypeScript interfaces
- All routers use proper error handling (TRPCError)
- All mutations are idempotent where possible
- Unique indexes prevent duplicate offers
- Cascade deletions (configs deleted when offer deleted)

---

## Success Criteria

✅ Offer is primary entity on dashboard (OffersPage)  
✅ Associations are separate, reusable entities with management UI  
✅ Contacts are separate, reusable entities created inline or selected  
✅ Offers auto-generate FinancialConfigs on creation (one per league)  
✅ 3-step creation wizard (Association→Contact→Pricing/Leagues)  
✅ Offer lifecycle (Draft→Sent→Accepted) with status-based restrictions  
✅ Offer detail page shows configs and allows lifecycle transitions  
✅ All CRUD operations working with proper validation  
✅ All tests passing, TypeScript clean  
✅ Navigation integrated (Dashboard→Offers, Offers→Associations, etc.)
