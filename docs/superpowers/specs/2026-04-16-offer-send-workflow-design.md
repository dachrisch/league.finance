# Offer Send Workflow Design
## PDF Generation, Google Drive Upload, and Gmail Integration

**Date:** 2026-04-16  
**Status:** Draft  
**Author:** Claude Code

---

## Overview

Currently, offers are created in the app and marked as "sent" but are not actually sent and not placed into Google Drive. This feature implements a complete workflow to:

1. Generate professional PDF offers (matching existing template format)
2. Upload PDFs to the user's Google Drive (user-selected folder)
3. Send emails via the user's Gmail account
4. Track delivery status with retry logic for failures

The implementation uses a background job queue (Bull + Redis) to handle these operations asynchronously, ensuring a responsive UI and reliable delivery with automatic retries.

---

## User Experience Flow

### Current State
- User creates offer in wizard
- Clicks "Mark as Sent" button
- Status changes to "sent" but nothing actually happens

### New Flow
1. User completes offer in wizard and clicks "Send Offer"
2. Modal opens showing:
   - Recipient email and offer summary
   - "Select Drive Folder" button (opens Google Drive picker)
   - Progress indicator (hidden initially)
3. User selects destination folder in Drive
4. User clicks "Send" button
5. Progress appears: "Generating PDF..." → "Uploading to Drive..." → "Sending email..."
6. On success: Toast notification with Drive link, offer status → "sent", email metadata saved
7. On failure: Error message with "Retry" button, status stays "draft"

---

## Data Model Changes

### Offer Schema Extensions
```typescript
enum OfferStatus {
  draft = 'draft',
  sending = 'sending',        // NEW: background job in progress
  sent = 'sent',
  accepted = 'accepted',
}

interface Offer {
  _id: ObjectId;
  status: OfferStatus;
  sentAt?: Date;
  acceptedAt?: Date;
  
  // NEW: Email & PDF metadata
  emailMetadata?: {
    sentVia: 'gmail';           // Track which email service
    messageId?: string;         // Gmail message ID for tracking
    driveFileId?: string;       // PDF file ID in Drive
    driveFolderId?: string;     // Folder where PDF was stored
    driveLink?: string;         // Shareable Drive link
    recipientEmail: string;
    sentAt: Date;
    lastSendAttempt?: Date;
    failureReason?: string;
  };
  
  // NEW: Job tracking
  sendJobId?: string;           // Bull job ID for reference
  sendJobAttempts: number;      // Track retry attempts (0-3)
}
```

### Job Schema (Redis/Bull)
The SendOfferJob will store:
- offerId
- userId (who initiated the send)
- driveFolderId (user's selected destination)
- recipientEmail
- status: 'pending' | 'generating-pdf' | 'uploading' | 'sending-email' | 'completed' | 'failed'
- error?: string

---

## Architecture

### Components

#### 1. **SendOfferJob Worker** (`src/server/jobs/SendOfferJob.ts`)
Orchestrates the three-step process:
1. Generate PDF from offer data
2. Upload to Drive
3. Send via Gmail

Handles retries (max 3 attempts) with exponential backoff.

#### 2. **PDF Generation Service** (`src/server/services/PdfService.ts`)
- Uses `puppeteer` or `pdfkit` to generate professional PDFs
- Template matches the example offer format:
  - bumbleflies header with logo
  - Recipient information
  - Offer details (association, season, contact)
  - Service description
  - League-by-league pricing breakdown
  - Total price (with VAT note)
  - Company footer with signature line
- Filename format: `Angebot_YYYYMMDD-{offerId}_short-name.pdf`

#### 3. **Google Drive Service** (`src/server/services/DriveService.ts`)
- Uses `google-auth-library` and `googleapis` client
- Requires user's Google OAuth token (obtain from context)
- Methods:
  - `uploadFile(fileBuffer, filename, folderId, accessToken)` — uploads PDF to specified folder
  - `createShareableLink(fileId, accessToken)` — generates public/shareable link

#### 4. **Gmail Service** (`src/server/services/GmailService.ts`)
- Uses `googleapis` Gmail API
- Requires user's Google OAuth token
- Methods:
  - `sendEmail(to, subject, htmlBody, pdfLink, accessToken)` — sends offer email with Drive link
- Uses existing `emailTemplate.ts` functions for subject/body

#### 5. **Send Offer Route** (new tRPC procedure)
```typescript
sendOffer: protectedProcedure
  .input({
    offerId: z.string(),
    driveFolderId: z.string(),
    recipientEmail: z.string().email(),
  })
  .mutation(async ({ input, ctx }) => {
    // Queue the job
    // Return job status
  })
```

#### 6. **Job Status Route** (new tRPC procedure)
```typescript
getOfferSendStatus: protectedProcedure
  .input({ offerId: z.string() })
  .query(async ({ input }) => {
    // Poll job progress from queue
    // Return current status
  })
```

---

## Data Flow

### Happy Path
```
User clicks "Send Offer"
    ↓
UI opens folder picker (Google Drive)
    ↓
User selects folder
    ↓
User clicks "Send" (calls sendOffer mutation)
    ↓
Server queues SendOfferJob with offerId, driveFolderId, recipientEmail
    ↓
Server returns { jobId, status: 'pending' }
    ↓
UI polls getOfferSendStatus every 1 second
    ↓
Job starts: generates PDF
    ↓
Job progress: uploads to Drive
    ↓
Job progress: sends email
    ↓
Job completes: saves emailMetadata to offer, status → 'sent'
    ↓
UI shows success toast with Drive link
```

### Error Path
```
Job fails at any stage (PDF generation, Drive upload, Gmail send)
    ↓
Job saves error reason to Offer.emailMetadata.failureReason
    ↓
Offer.status stays 'draft'
    ↓
UI shows error message with "Retry" button
    ↓
User clicks "Retry"
    ↓
New job queued (sendJobAttempts incremented)
    ↓
If 3 attempts reached: stop retrying, user must investigate
```

---

## Implementation Details

### PDF Generation Template
Use `puppeteer` with HTML/CSS to generate the PDF. Template structure:
```
[bumbleflies logo header]
[Recipient details: name, address, email]
[Offer title with offer ID and date]
[Service description]
[League-by-league pricing table]
[Total price and VAT note]
[Offer validity period]
[Company footer with IBAN, website, email]
```

Data comes from:
- Offer document (associationId, seasonId, leagueIds, contactId)
- FinancialConfig documents (pricing per league)
- Contact document (recipient name, email, address)
- Association document (organization name)
- Season document (season name)

### Google Drive Integration
- Use `google-auth-library` to refresh user's OAuth tokens
- Store `accessToken` in request context (from JWT)
- Upload with MIME type `application/pdf`
- Generate shareable link (viewable without login)

### Gmail Integration
- Use Gmail API `messages.send` endpoint
- Send as raw MIME message (includes HTML body + attachment reference)
- Recipients: contact's email address
- Subject: `Offer: {associationName} - {seasonName} Season`
- Body: Use `generateOfferEmailBody()` from existing emailTemplate.ts
- Include Drive link in email body

### Retry Strategy
- Bull queue with exponential backoff: 1 min, 5 min, 15 min delays
- Max 3 attempts per job
- Each attempt increments `Offer.sendJobAttempts`
- Failure reasons logged to `Offer.emailMetadata.failureReason`

---

## API Changes

### New tRPC Procedures

#### `offers.sendOffer`
```typescript
Input: {
  offerId: string;           // MongoDB _id
  driveFolderId: string;     // Google Drive folder ID
  recipientEmail: string;    // Where to send email
}

Output: {
  jobId: string;
  status: 'queued';
  estimatedTime: number;     // ms until completion estimate
}

Errors:
- NOT_FOUND: offer doesn't exist
- INVALID_STATE: offer is not in 'draft' status
- MISSING_OAUTH: user doesn't have Gmail/Drive OAuth scopes
```

#### `offers.getOfferSendStatus`
```typescript
Input: {
  offerId: string;
}

Output: {
  jobId?: string;
  status: 'pending' | 'generating-pdf' | 'uploading' | 'sending-email' | 'completed' | 'failed' | 'none';
  progress: 0-100;           // 0, 33, 66, 100 for the three stages
  error?: string;
  driveLink?: string;        // Set when complete
  completedAt?: Date;
}
```

#### `offers.retryOfferSend`
```typescript
Input: {
  offerId: string;
}

Output: {
  jobId: string;
  status: 'queued';
}

Errors:
- MAX_RETRIES: already attempted 3 times
- NOT_ALLOWED: offer status is not 'draft'
```

---

## Error Handling

### Job-Level Errors
- **PDF generation fails** → log error, mark job failed, do not attempt Drive upload
- **Drive upload fails** → log error, mark job failed, do not attempt email
- **Gmail send fails** → log error, mark job failed (PDF was uploaded, but user not notified)

### User-Level Errors
- Missing Google Drive scope → show UI error before sending
- Missing Gmail scope → show UI error before sending
- Offer already sent → prevent retry, show message
- Network errors → automatically retry per Bull backoff strategy

### Logging
- Job start/progress/completion logged to console
- All errors logged with jobId and offerId for debugging
- Drive file ID and Drive link logged on success

---

## UI Components

### "Send Offer" Dialog
- Shows offer summary (recipient, association, season, total price)
- "Select Folder" button → opens Google Drive folder picker
- "Send" button (disabled until folder selected)
- Progress bar (hidden until send starts)
- Status text: "Generating PDF...", "Uploading to Drive...", "Sending email..."
- Success state: "Sent! View on Drive" link
- Error state: Error message + "Retry" button

### Progress Polling
- Client-side poll `getOfferSendStatus` every 1 second while job is in progress
- Stop polling when status is 'completed' or 'failed'
- Update progress bar and status text in real time

---

## Security & Permissions

### OAuth Scopes
Extend existing Google OAuth config to request:
- `https://www.googleapis.com/auth/drive.file` — create/upload files to Drive
- `https://www.googleapis.com/auth/gmail.send` — send emails
- `https://www.googleapis.com/auth/drive.readonly` — read folder structure for picker

### Authorization
- Only authenticated users (role: 'admin') can send offers
- Users can only send using their own Gmail/Drive account
- No sharing of credentials between users
- PDF files uploaded to user's selected Drive folder (user controls access)

### Data Stored
- Email metadata stored in Offer.emailMetadata (includes recipient email, Drive link, message ID)
- No plaintext passwords stored
- Google OAuth tokens refreshed automatically by auth library

---

## Testing Strategy

### Unit Tests
- **PdfService**: Test PDF generation with various offer data
- **DriveService**: Mock googleapis client, test upload and link generation
- **GmailService**: Mock googleapis client, test email composition and sending

### Integration Tests
- **SendOfferJob**: End-to-end job with mocked Google APIs
- **Error scenarios**: PDF generation fails, Drive upload fails, Gmail send fails
- **Retries**: Job retried on failure, succeeds on second attempt

### Manual Testing
- Send offer through UI
- Verify PDF appears in Drive with correct filename
- Verify email arrives in recipient's inbox
- Verify offer status changed to 'sent'
- Verify Drive link is clickable and shows PDF
- Test error scenarios (network down, invalid folder ID)

---

## Dependencies

### New Packages
- `bull` — job queue library
- `redis` — in-memory store for job queue
- `puppeteer` or `pdfkit` — PDF generation
- `googleapis` — Google Drive and Gmail APIs (likely already available)

### Infrastructure
- Redis instance (local for dev, managed for production)
- Already have Google OAuth configured
- Already have gmail/drive scopes needed

---

## Implementation Phases

### Phase 1: Foundation
- Set up Bull queue with Redis
- Create PdfService with template
- Create DriveService and GmailService wrappers
- Create SendOfferJob worker

### Phase 2: Backend API
- Implement `offers.sendOffer` tRPC procedure
- Implement `offers.getOfferSendStatus` tRPC procedure
- Implement `offers.retryOfferSend` tRPC procedure
- Add Offer schema extensions for emailMetadata

### Phase 3: Frontend UI
- Create SendOfferDialog component
- Integrate Google Drive folder picker
- Add progress polling logic
- Update OfferTable to show send status

### Phase 4: Testing & Refinement
- Unit tests for services
- Integration tests for job
- Manual testing with real Gmail/Drive
- Error scenario testing

---

## Known Limitations & Future Enhancements

### Phase 1 Limitations
- No email templates customization (fixed template)
- No batch sending (one offer at a time)
- Drive folder picker uses Google's native widget (limited styling)
- No tracking of email opens/reads (basic delivery only)

### Future Enhancements
- Customize email body per offer before sending
- Batch send multiple offers at once
- Track email opens/link clicks
- Store PDF versions for audit trail
- Template versioning (save offer PDF snapshot)
- Automatic reminders if not accepted after 30 days

---

## Open Questions

- Should PDFs be stored permanently in user's Drive, or only as references?
- Should admins be able to send on behalf of other users?
- Should we track which user sent each offer (for audit)?

