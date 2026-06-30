# File Offer in Drive — Design

> Status: approved design (brainstorm 2026-06-30). Supersedes the email step of
> `2026-04-16-offer-send-workflow-design.md`.

## Goal

Replace the "send offer" action (generate PDF → upload to Drive → **email the
link**) with "file offer in Drive": generate the PDF and place it in a
user-chosen Drive folder, with **no email**. Everything that existed only to
serve the email step is removed.

## Background / current state

The live path (client → server):

- Client `SendOfferDialog.tsx` calls `finance.offersSend.sendOffer` and polls
  `finance.offersSend.getOfferSendStatus`. Folder picker uses
  `google.listFolders`, prefilled from `FinancialSettings.defaultDriveFolderId`.
- `offers-send.ts#sendOffer` queues a Bull job (`offerSendQueue`) with
  `{ offerId, userId, driveFolderId, recipientEmail, accessToken }` and sets
  `offer.status = 'sending'`.
- `jobs/SendOfferJob.ts` runs three steps: (1) `PdfService.generateOfferPdf`
  (Puppeteer renders inline HTML to a PDF buffer), (2) `DriveService.uploadFile`
  (validates folder, uploads PDF, returns `fileId` + `webViewLink`),
  (3) `GmailService.sendEmail` (emails the link). On success sets
  `status='sent'`, `sentAt`, and `emailMetadata`.

Dead/!broken code found during investigation (cleaned up here because it is
entangled with this flow):

- `offers.ts` contains its own `sendOffer` / `getOfferSendStatus` /
  `retryOfferSend` — a duplicate the client does **not** use.
- `client/hooks/useSendOfferJob.ts` calls `/trpc/offersSend.*` **without** the
  `finance.` prefix (wrong path; not used by any page).

## Decisions (from brainstorm)

- **Template:** reuse the existing Puppeteer HTML in `PdfService`. No external
  Google Docs/Sheets template. Artifact stays a **PDF**.
- **Folder:** chosen in the UI per offer (default prefilled). No auto
  folder-structure creation.
- **Execution:** keep the async Bull job + status polling (least churn).
- **Naming:** clean rename to Drive-filing semantics.
- **Status:** keep the `Offer.status` enum; `sent` is **relabeled in the UI** to
  mean "filed in Drive". No new enum value.

## Validated prerequisites (2026-06-30)

The Drive dependency was validated on prod against the real OAuth token before
planning implementation:

- **Drive API must be enabled** on GCP project `391372270100`. It was disabled
  (every Drive call failed); now enabled. This is an environment prerequisite,
  not code.
- `google.listFolders` returns folders (read OK via `drive.readonly`).
- `files.create` with `parents=[<existing folder the app did not create>]`
  **succeeds** with the `drive.file` scope (verified by write-then-delete). So
  the current scopes are sufficient; no `drive` scope upgrade needed.

## Design

### Server

**`jobs/SendOfferJob.ts`** (the pipeline)
- Remove Step 3 (GmailService). The job ends after a successful Drive upload.
- Remove `recipientEmail` and the Gmail import from the handler. Still fetch
  contact + association + configs + league names for the PDF content.
- Progress phases: `generating-pdf` (20) → `uploading` (40) → done (100).
  Remove the `sending-email` phase.
- On success: `status='sent'`, `sentAt=now`, write **`driveMetadata`** (see Data
  model), clear `sendJobId`, reset `sendJobAttempts=0`.
- On failure: keep existing behavior but write the reason under
  `driveMetadata.failureReason` + `driveMetadata.lastAttempt`; rethrow so Bull
  records the failure.
- Rename the handler symbol to `FileOfferJobHandler` and the file to
  `jobs/FileOfferJob.ts`. (Fresh deploy, so there are no in-flight Redis jobs to
  preserve — the Bull queue is renamed too; see queue note.)

**`jobs/queue.ts`**
- Rename the exported queue to `offerDriveQueue` and the Bull queue name to
  `'offer-drive'`. Job data type `FileOfferJobData = { offerId, userId,
  driveFolderId, accessToken }` (no `recipientEmail`).

**`routers/finance/offers-send.ts` → `routers/finance/offers-drive.ts`**
- Router key `offersSend` → **`offersDrive`** in `routers/index.ts`.
- `sendOffer` → **`fileOfferInDrive`**: input `{ offerId, driveFolderId }`.
  Drops the contact-email lookup. Requires `ctx.accessToken` (Drive). Queues the
  job, sets `status='sending'`, returns `{ jobId, status:'queued' }`.
- `getOfferSendStatus` → **`getOfferDriveStatus`**: same shape minus the
  `sending-email` phase; returns `driveLink` from `driveMetadata`.
- `retryOfferSend` → **`retryOfferFiling`**: reads `driveMetadata.driveFolderId`
  for the retry folder; no email.

**Cleanup**
- Delete `sendOffer` / `getOfferSendStatus` / `retryOfferSend` from `offers.ts`.
- Delete `services/GmailService.ts`, `lib/emailTemplate.ts`, and their tests.
- Remove the `gmail.send` reference from the job; leave OAuth scopes unchanged
  (see Out of scope).

### Client

**`components/Offer/SendOfferDialog.tsx` → `FileOfferDialog.tsx`**
- Keep folder picker (`google.listFolders`) + `defaultDriveFolderId` prefill.
- Call `finance.offersDrive.fileOfferInDrive`; poll
  `finance.offersDrive.getOfferDriveStatus`.
- Remove `'sending-email'` from the `JobStatus` type and the "Sending email…"
  label. Phase labels: "Generating PDF…", "Uploading to Drive…", "Done".
- Success state: show "Open in Drive" linking `driveLink`. Title/button:
  "Create offer in Drive".
- Update the call site that renders the dialog (button text "Send" → "File in
  Drive").

**`hooks/useSendOfferJob.ts`**
- Remove (broken, unused). If a hook is still wanted, fold its logic into the
  dialog. Remove its tests.

### Data model — `models/Offer.ts`
- Replace `emailMetadata` with **`driveMetadata`**:
  ```ts
  driveMetadata?: {
    driveFileId?: string;
    driveFolderId?: string;
    driveLink?: string;
    filedAt?: Date;
    lastAttempt?: Date;
    failureReason?: string;
  }
  ```
- Drop email-only fields (`sentVia`, `messageId`, `recipientEmail`). Status enum
  unchanged. (No data migration needed: only test data exists.)

## Out of scope (future)
- Per-association/season auto folder structure.
- OAuth scope reduction (`gmail.send`, `drive.readonly` become unused; removing
  them forces user re-consent — defer).
- Converting the artifact to an editable Google Doc.

## Testing (TDD)
- `FileOfferJob.test.ts`: asserts PDF generated + `DriveService.uploadFile`
  called; **no** Gmail call; success writes `driveMetadata` and `status='sent'`;
  upload failure writes `driveMetadata.failureReason` and rethrows.
- `offers-drive` router tests: `fileOfferInDrive` rejects non-draft / missing
  token; queues with `{ offerId, driveFolderId }`.
- `FileOfferDialog` tests: folder prefill, calls `fileOfferInDrive`, renders
  Drive link on completion, no email UI.
- Delete `GmailService.test.ts`, `emailTemplate.test.ts`,
  `useSendOfferJob.test.ts`.
- Remove email assertions from any remaining tests.

## Acceptance criteria
1. Filing a draft offer produces a PDF in the chosen Drive folder and **sends no
   email**.
2. The dialog shows progress (generating → uploading → done) and a working
   "Open in Drive" link; offer ends in `status='sent'` with `driveMetadata`.
3. Retry re-files into the same folder.
4. No remaining references to Gmail/email in the offer flow; duplicate
   `offers.ts` send procedures and broken `useSendOfferJob` removed.
5. `black`-equivalent: `npm run eslint` and `npm run test:run` pass.
