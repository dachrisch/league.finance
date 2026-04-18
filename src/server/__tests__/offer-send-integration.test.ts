import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { Types } from 'mongoose';
import { Offer } from '../models/Offer';
import { Contact } from '../models/Contact';
import { FinancialConfig } from '../models/FinancialConfig';
import { connectMongo, disconnectMongo } from '../db/mongo';

describe('Offer Send Workflow Integration', () => {
  let testContact: any;

  beforeAll(async () => {
    await connectMongo();
    await Offer.init();

    // Create a test contact for all tests
    testContact = await Contact.create({
      name: 'Integration Test Contact',
      email: 'integration@example.com',
      address: {
        street: '999 Integration St',
        city: 'TestCity',
        postalCode: '12345',
        country: 'TestLand',
      },
    });
  });

  afterEach(async () => {
    await Offer.deleteMany({});
    await FinancialConfig.deleteMany({});
  });

  afterAll(async () => {
    await Contact.deleteMany({});
    await disconnectMongo();
  });

  it('creates offer with correct initial status', async () => {
    const offer = await Offer.create({
      status: 'draft',
      associationId: 'assoc-1',
      seasonId: 2026,
      leagueIds: [1, 2],
      contactId: testContact._id,
    });

    expect(offer.status).toBe('draft');
    expect(!offer.emailMetadata?.sentVia).toBeTruthy();
    expect(!offer.emailMetadata?.messageId).toBeTruthy();
    expect(!offer.emailMetadata?.failureReason).toBeTruthy();
    expect(offer.sendJobId).toBeUndefined();
    expect(offer.sendJobAttempts).toBe(0);
    expect(offer.sentAt).toBeUndefined();
  });

  it('offer transitions to sending when job queued', async () => {
    const offer = await Offer.create({
      status: 'draft',
      associationId: 'assoc-2',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
    });

    expect(offer.status).toBe('draft');

    // Simulate sendOffer mutation queuing job
    offer.status = 'sending';
    offer.sendJobId = 'job-123';
    await offer.save();

    const updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('sending');
    expect(updated?.sendJobId).toBe('job-123');
    expect(updated?.sendJobAttempts).toBe(0);
  });

  it('offer transitions to sent with complete metadata', async () => {
    const offer = await Offer.create({
      status: 'sending',
      associationId: 'assoc-3',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sendJobId: 'job-123',
    });

    expect(offer.status).toBe('sending');

    // Simulate successful job completion (from SendOfferJob)
    const sentTime = new Date();
    offer.status = 'sent';
    offer.sentAt = sentTime;
    offer.emailMetadata = {
      sentVia: 'gmail',
      messageId: 'msg-456',
      driveFileId: 'file-789',
      driveFolderId: 'folder-000',
      driveLink: 'https://drive.google.com/file/d/file-789',
      recipientEmail: 'recipient@example.com',
      sentAt: sentTime,
    };
    offer.sendJobId = undefined;
    offer.sendJobAttempts = 0;
    await offer.save();

    const updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('sent');
    expect(updated?.emailMetadata?.sentVia).toBe('gmail');
    expect(updated?.emailMetadata?.driveLink).toBe('https://drive.google.com/file/d/file-789');
    expect(updated?.emailMetadata?.messageId).toBe('msg-456');
    expect(updated?.emailMetadata?.recipientEmail).toBe('recipient@example.com');
    expect(updated?.sentAt).toBeDefined();
    expect(updated?.sendJobId).toBeUndefined();
  });

  it('offer maintains draft status on job failure with failure metadata', async () => {
    const offer = await Offer.create({
      status: 'sending',
      associationId: 'assoc-4',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sendJobId: 'job-failed',
    });

    expect(offer.status).toBe('sending');

    // Simulate job failure (from SendOfferJob error handler)
    const attemptTime = new Date();
    offer.status = 'draft';
    offer.emailMetadata = {
      failureReason: 'Failed to upload to Drive: folder not found',
      lastSendAttempt: attemptTime,
    };
    offer.sendJobAttempts = 1;
    offer.sendJobId = undefined;
    await offer.save();

    const updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('draft');
    expect(updated?.emailMetadata?.failureReason).toContain('folder not found');
    expect(updated?.emailMetadata?.lastSendAttempt).toBeDefined();
    expect(updated?.sendJobAttempts).toBe(1);
    expect(updated?.sendJobId).toBeUndefined();
  });

  it('tracks retry attempts correctly', async () => {
    const offer = await Offer.create({
      status: 'draft',
      associationId: 'assoc-5',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sendJobAttempts: 0,
    });

    expect(offer.sendJobAttempts).toBe(0);

    // First retry attempt
    offer.sendJobAttempts = 1;
    await offer.save();
    let retrieved = await Offer.findById(offer._id);
    expect(retrieved?.sendJobAttempts).toBe(1);

    // Second retry attempt
    offer.sendJobAttempts = 2;
    await offer.save();
    retrieved = await Offer.findById(offer._id);
    expect(retrieved?.sendJobAttempts).toBe(2);

    // Third retry attempt - max reached
    offer.sendJobAttempts = 3;
    await offer.save();
    retrieved = await Offer.findById(offer._id);
    expect(retrieved?.sendJobAttempts).toBe(3);
  });

  it('offers can be queried by status including sending', async () => {
    // Create draft offer
    const draft = await Offer.create({
      status: 'draft',
      associationId: 'assoc-6a',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
    });

    // Create sending offer
    const sending = await Offer.create({
      status: 'sending',
      associationId: 'assoc-6b',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sendJobId: 'job-456',
    });

    // Create sent offer
    const sent = await Offer.create({
      status: 'sent',
      associationId: 'assoc-6c',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sentAt: new Date(),
    });

    // Query by status
    const draftOffers = await Offer.find({ status: 'draft' });
    const sendingOffers = await Offer.find({ status: 'sending' });
    const sentOffers = await Offer.find({ status: 'sent' });

    expect(draftOffers.length).toBe(1);
    expect(draftOffers[0]._id).toEqual(draft._id);

    expect(sendingOffers.length).toBe(1);
    expect(sendingOffers[0]._id).toEqual(sending._id);

    expect(sentOffers.length).toBe(1);
    expect(sentOffers[0]._id).toEqual(sent._id);
  });

  it('emailMetadata structure is preserved through updates', async () => {
    const sentTime = new Date();
    const metadata = {
      sentVia: 'gmail' as const,
      messageId: 'msg-xyz',
      driveFileId: 'file-xyz',
      driveFolderId: 'folder-xyz',
      driveLink: 'https://drive.google.com/file/d/file-xyz',
      recipientEmail: 'test@example.com',
      sentAt: sentTime,
    };

    const offer = await Offer.create({
      status: 'sent',
      associationId: 'assoc-7',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      emailMetadata: metadata,
      sentAt: sentTime,
    });

    const retrieved = await Offer.findById(offer._id);
    expect(retrieved?.emailMetadata?.sentVia).toBe('gmail');
    expect(retrieved?.emailMetadata?.messageId).toBe('msg-xyz');
    expect(retrieved?.emailMetadata?.driveLink).toBe('https://drive.google.com/file/d/file-xyz');
    expect(retrieved?.emailMetadata?.recipientEmail).toBe('test@example.com');
    expect(retrieved?.emailMetadata?.driveFileId).toBe('file-xyz');
    expect(retrieved?.emailMetadata?.driveFolderId).toBe('folder-xyz');
  });

  it('complete workflow: draft -> sending -> sent with all metadata', async () => {
    // Step 1: Create initial draft offer
    const offer = await Offer.create({
      status: 'draft',
      associationId: 'assoc-8',
      seasonId: 2026,
      leagueIds: [1, 2, 3],
      contactId: testContact._id,
    });

    expect(offer.status).toBe('draft');

    // Step 2: Queue send job - transition to sending
    offer.status = 'sending';
    offer.sendJobId = 'job-workflow-123';
    await offer.save();

    let updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('sending');
    expect(updated?.sendJobId).toBe('job-workflow-123');

    // Step 3: Job completes successfully - transition to sent with metadata
    const sentTime = new Date();
    offer.status = 'sent';
    offer.sentAt = sentTime;
    offer.emailMetadata = {
      sentVia: 'gmail',
      messageId: 'msg-workflow-789',
      driveFileId: 'file-workflow-456',
      driveFolderId: 'folder-workflow-789',
      driveLink: 'https://drive.google.com/file/d/file-workflow-456',
      recipientEmail: 'contact@league.org',
      sentAt: sentTime,
    };
    offer.sendJobId = undefined;
    offer.sendJobAttempts = 0;
    await offer.save();

    updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('sent');
    expect(updated?.sentAt).toBeDefined();
    expect(updated?.emailMetadata?.messageId).toBe('msg-workflow-789');
    expect(updated?.emailMetadata?.driveFileId).toBe('file-workflow-456');
    expect(updated?.emailMetadata?.recipientEmail).toBe('contact@league.org');
    expect(updated?.sendJobId).toBeUndefined();
  });

  it('offer with sent status can transition to accepted', async () => {
    const sentTime = new Date();
    const offer = await Offer.create({
      status: 'sent',
      associationId: 'assoc-9',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sentAt: sentTime,
      emailMetadata: {
        sentVia: 'gmail',
        messageId: 'msg-acceptance-456',
        driveLink: 'https://drive.google.com/file/d/file-acceptance',
        recipientEmail: 'contact@org.com',
        sentAt: sentTime,
      },
    });

    expect(offer.status).toBe('sent');

    // Simulate acceptance
    const acceptedTime = new Date();
    offer.status = 'accepted';
    offer.acceptedAt = acceptedTime;
    await offer.save();

    const updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('accepted');
    expect(updated?.acceptedAt).toBeDefined();
    expect(updated?.sentAt).toBeDefined();
    // Metadata should still be present
    expect(updated?.emailMetadata?.messageId).toBe('msg-acceptance-456');
  });

  it('failed send can be retried maintaining attempt count', async () => {
    // First attempt - fails
    const offer = await Offer.create({
      status: 'sending',
      associationId: 'assoc-10',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sendJobId: 'job-retry-1',
    });

    const failureTime = new Date();
    offer.status = 'draft';
    offer.emailMetadata = {
      failureReason: 'Network timeout',
      lastSendAttempt: failureTime,
    };
    offer.sendJobAttempts = 1;
    offer.sendJobId = undefined;
    await offer.save();

    let updated = await Offer.findById(offer._id);
    expect(updated?.sendJobAttempts).toBe(1);
    expect(updated?.status).toBe('draft');

    // Retry - queue again
    offer.status = 'sending';
    offer.sendJobId = 'job-retry-2';
    await offer.save();

    updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('sending');
    expect(updated?.sendJobId).toBe('job-retry-2');
    expect(updated?.sendJobAttempts).toBe(1); // Attempt count preserved

    // Retry fails again
    const secondFailureTime = new Date();
    offer.status = 'draft';
    offer.emailMetadata = {
      failureReason: 'Drive API error: invalid token',
      lastSendAttempt: secondFailureTime,
    };
    offer.sendJobAttempts = 2;
    offer.sendJobId = undefined;
    await offer.save();

    updated = await Offer.findById(offer._id);
    expect(updated?.sendJobAttempts).toBe(2);
    expect(updated?.emailMetadata?.failureReason).toContain('invalid token');
  });

  it('multiple offers for different associations can have different statuses', async () => {
    // Create offers for different associations in different states
    const assoc1Draft = await Offer.create({
      status: 'draft',
      associationId: 'assoc-group-1',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
    });

    const assoc2Sending = await Offer.create({
      status: 'sending',
      associationId: 'assoc-group-2',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sendJobId: 'job-group-2',
    });

    const assoc3Sent = await Offer.create({
      status: 'sent',
      associationId: 'assoc-group-3',
      seasonId: 2026,
      leagueIds: [1],
      contactId: testContact._id,
      sentAt: new Date(),
    });

    // Verify each can be queried independently
    const draft = await Offer.findById(assoc1Draft._id);
    expect(draft?.status).toBe('draft');
    expect(draft?.associationId).toBe('assoc-group-1');

    const sending = await Offer.findById(assoc2Sending._id);
    expect(sending?.status).toBe('sending');
    expect(sending?.associationId).toBe('assoc-group-2');
    expect(sending?.sendJobId).toBe('job-group-2');

    const sent = await Offer.findById(assoc3Sent._id);
    expect(sent?.status).toBe('sent');
    expect(sent?.associationId).toBe('assoc-group-3');
  });

  it('offer with financial configs maintains integrity through send workflow', async () => {
    // Create offer
    const offer = await Offer.create({
      status: 'draft',
      associationId: 'assoc-with-config',
      seasonId: 2026,
      leagueIds: [1, 2],
      contactId: testContact._id,
    });

    // Create linked financial configs
    const configs = await Promise.all([
      FinancialConfig.create({
        leagueId: 1,
        seasonId: 2026,
        costModel: 'SEASON',
        baseRateOverride: 50,
        expectedTeamsCount: 15,
        expectedGamedaysCount: 0,
        expectedTeamsPerGameday: 0,
        offerId: offer._id,
      }),
      FinancialConfig.create({
        leagueId: 2,
        seasonId: 2026,
        costModel: 'SEASON',
        baseRateOverride: 60,
        expectedTeamsCount: 20,
        expectedGamedaysCount: 0,
        expectedTeamsPerGameday: 0,
        offerId: offer._id,
      }),
    ]);

    // Transition to sending
    offer.status = 'sending';
    offer.sendJobId = 'job-config-test';
    await offer.save();

    // Verify configs are still linked
    let linkedConfigs = await FinancialConfig.find({ offerId: offer._id });
    expect(linkedConfigs.length).toBe(2);

    // Complete send
    const sentTime = new Date();
    offer.status = 'sent';
    offer.sentAt = sentTime;
    offer.emailMetadata = {
      sentVia: 'gmail',
      messageId: 'msg-config-123',
      driveLink: 'https://drive.google.com/file/d/file-config',
      recipientEmail: 'admin@assoc.com',
      sentAt: sentTime,
    };
    offer.sendJobId = undefined;
    await offer.save();

    // Verify configs remain linked after successful send
    linkedConfigs = await FinancialConfig.find({ offerId: offer._id });
    expect(linkedConfigs.length).toBe(2);
    expect(linkedConfigs.every((c) => c.offerId?.equals(offer._id))).toBe(true);

    const updated = await Offer.findById(offer._id);
    expect(updated?.status).toBe('sent');
  });
});
