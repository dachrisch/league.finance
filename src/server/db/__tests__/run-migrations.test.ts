import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { connectMongo, disconnectMongo } from '../mongo';
import { runMigrations } from '../run-migrations';

describe('runMigrations', () => {
  let tempDir: string;

  beforeAll(async () => {
    await connectMongo();
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-test-'));
    await mongoose.connection.db!.collection('_migrations').deleteMany({});
  });

  it('runs a migration once and records it as applied', async () => {
    const migrationPath = path.join(tempDir, '001-test.js');
    fs.writeFileSync(
      migrationPath,
      "let callCount = 0;\nmodule.exports = { up: async () => { callCount++; }, getCallCount: () => callCount };\n"
    );

    await runMigrations(tempDir);

    const mod = require(migrationPath);
    expect(mod.getCallCount()).toBe(1);
  });

  it('does not re-run a migration on a second invocation (simulating a restart)', async () => {
    const migrationPath = path.join(tempDir, '001-test.js');
    fs.writeFileSync(
      migrationPath,
      "let callCount = 0;\nmodule.exports = { up: async () => { callCount++; }, getCallCount: () => callCount };\n"
    );

    await runMigrations(tempDir);
    await runMigrations(tempDir);

    const mod = require(migrationPath);
    expect(mod.getCallCount()).toBe(1);
  });

  it('still runs a genuinely new migration that was added after an earlier one already ran', async () => {
    const firstPath = path.join(tempDir, '001-first.js');
    fs.writeFileSync(
      firstPath,
      "let callCount = 0;\nmodule.exports = { up: async () => { callCount++; }, getCallCount: () => callCount };\n"
    );
    await runMigrations(tempDir);

    const secondPath = path.join(tempDir, '002-second.js');
    fs.writeFileSync(
      secondPath,
      "let callCount = 0;\nmodule.exports = { up: async () => { callCount++; }, getCallCount: () => callCount };\n"
    );
    await runMigrations(tempDir);

    expect(require(firstPath).getCallCount()).toBe(1);
    expect(require(secondPath).getCallCount()).toBe(1);
  });
});
