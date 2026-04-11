/// <reference types="vitest/globals" />
/// <reference types="vite/client" />

import type * as matchers from '@testing-library/jest-dom/matchers';

declare global {
  import type { Assertion } from 'vitest';

  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void | Promise<void>): void;
  function test(name: string, fn: () => void | Promise<void>): void;
  function expect<T = any>(value: T): Assertion<T>;
  const vi: typeof import('vitest').vi;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  function beforeAll(fn: () => void | Promise<void>): void;
  function afterAll(fn: () => void | Promise<void>): void;

  namespace Vi {
    interface Assertion<T = any> extends ReturnType<typeof matchers> {}
    interface AsymmetricMatchersContaining extends ReturnType<typeof matchers> {}
  }
}
