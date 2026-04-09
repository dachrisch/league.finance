import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';
import { expect, test, vi } from 'vitest';

// Mock the global variables
vi.stubGlobal('__GIT_COMMIT__', 'abc1234');
vi.stubGlobal('__VERSION__', 'v0.1.1');

test('renders footer with version, git hash and copyright', () => {
  render(<Footer />);
  expect(screen.getByText('v0.1.1')).toBeDefined();
  expect(screen.getByText('abc1234')).toBeDefined();
  expect(screen.getByText(/2026 bumbleflies UG/)).toBeDefined();
  expect(screen.getByText(/Made in 🥨 with ♥️/)).toBeDefined();
});
