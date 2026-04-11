import type { Assertion } from 'vitest';
import type * as matchers from '@testing-library/jest-dom/matchers';

declare global {
  namespace Vi {
    interface Assertion<T = any> extends ReturnType<typeof matchers> {}
    interface AsymmetricMatchersContaining extends ReturnType<typeof matchers> {}
  }
}
