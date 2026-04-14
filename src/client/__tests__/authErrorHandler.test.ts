import { describe, it, expect } from 'vitest';

/**
 * Tests for the global auth error handler logic in main.tsx
 *
 * Regression test for login page redirect loop bug:
 * - Bug: Login page was stuck reloading because UNAUTHORIZED errors
 *   on the login page triggered a redirect to /login, causing infinite reloads
 * - Solution: Check current pathname before redirecting. Don't redirect if
 *   already on a login page (/login or /login/*)
 */

/**
 * Helper function that encapsulates the error handler logic from main.tsx
 * This allows us to test the logic without having to mock window.location
 */
function createErrorHandlerLogic() {
  return {
    shouldRedirect: (error: any, currentPath: string): boolean => {
      if ((error as any)?.data?.code === 'UNAUTHORIZED') {
        // Don't redirect if already on login page
        const isLoginPage = currentPath === '/login' || currentPath.startsWith('/login/');
        return !isLoginPage;
      }
      return false;
    },
  };
}

describe('Global auth error handler - login page redirect prevention', () => {
  const handler = createErrorHandlerLogic();

  describe('when UNAUTHORIZED error occurs', () => {
    const unauthorizedError = { data: { code: 'UNAUTHORIZED' } };

    it('should NOT redirect on /login page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/login')).toBe(false);
    });

    it('should NOT redirect on /login/callback page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/login/callback')).toBe(false);
    });

    it('should redirect on /dashboard page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/dashboard')).toBe(true);
    });

    it('should redirect on /offers page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/offers')).toBe(true);
    });

    it('should redirect on /associations page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/associations')).toBe(true);
    });

    it('should redirect on /settings page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/settings')).toBe(true);
    });

    it('should redirect on /config/new page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/config/new')).toBe(true);
    });

    it('should redirect on /offers/:id page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/offers/123')).toBe(true);
    });

    it('should redirect on /config/:id page', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/config/abc123')).toBe(true);
    });

    it('should handle /login-prefixed routes correctly (not confused with /login)', () => {
      // Routes like /loginconfig should still redirect (not under /login/*/)
      expect(handler.shouldRedirect(unauthorizedError, '/loginconfig')).toBe(true);
    });

    it('should handle /login/prefix/nested correctly', () => {
      // Deep nesting under /login should not redirect
      expect(handler.shouldRedirect(unauthorizedError, '/login/prefix/nested')).toBe(false);
    });
  });

  describe('when other error codes occur', () => {
    it('should NOT redirect on BAD_REQUEST error', () => {
      const badRequestError = { data: { code: 'BAD_REQUEST' } };
      expect(handler.shouldRedirect(badRequestError, '/dashboard')).toBe(false);
    });

    it('should NOT redirect on FORBIDDEN error', () => {
      const forbiddenError = { data: { code: 'FORBIDDEN' } };
      expect(handler.shouldRedirect(forbiddenError, '/dashboard')).toBe(false);
    });

    it('should NOT redirect on SERVER_ERROR', () => {
      const serverError = { data: { code: 'INTERNAL_SERVER_ERROR' } };
      expect(handler.shouldRedirect(serverError, '/dashboard')).toBe(false);
    });
  });

  describe('when error has no data property', () => {
    it('should NOT redirect on plain Error object', () => {
      const error = new Error('Something went wrong');
      expect(handler.shouldRedirect(error, '/dashboard')).toBe(false);
    });

    it('should NOT redirect on null error', () => {
      expect(handler.shouldRedirect(null, '/dashboard')).toBe(false);
    });

    it('should NOT redirect on undefined error', () => {
      expect(handler.shouldRedirect(undefined, '/dashboard')).toBe(false);
    });

    it('should NOT redirect on error with no code', () => {
      const error = { data: {} };
      expect(handler.shouldRedirect(error, '/dashboard')).toBe(false);
    });
  });

  describe('edge cases', () => {
    const unauthorizedError = { data: { code: 'UNAUTHORIZED' } };

    it('should NOT redirect on /login/ (with trailing slash)', () => {
      expect(handler.shouldRedirect(unauthorizedError, '/login/')).toBe(false);
    });

    it('should handle empty pathname', () => {
      // Empty pathname should redirect (not a login page)
      expect(handler.shouldRedirect(unauthorizedError, '')).toBe(true);
    });

    it('should handle root path', () => {
      // Root path should redirect (not a login page)
      expect(handler.shouldRedirect(unauthorizedError, '/')).toBe(true);
    });
  });
});
