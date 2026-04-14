import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';
import { expect, test, vi } from 'vitest';

// Mock the global variables
vi.stubGlobal('__GIT_COMMIT__', 'abc1234');
vi.stubGlobal('__VERSION__', 'v0.1.1');

test('renders footer with version, git hash and copyright', () => {
  render(<Footer />);
  const versionLink = screen.getByRole('link', { name: 'v0.1.1' });
  expect(versionLink).toBeDefined();
  expect(versionLink).toHaveAttribute('title', 'abc1234');
  expect(screen.getByText(/2026 bumbleflies UG/)).toBeDefined();
  expect(screen.getByText(/Made in 🥨 with ♥️/)).toBeDefined();
});
