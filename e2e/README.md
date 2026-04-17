# Playwright E2E Tests

End-to-end tests for the Leagues Finance application using Playwright.

## Tests Included

### 1. Frontend Offer Creation (`test-frontend-create-offer.spec.ts`)
Tests the complete user journey of creating an offer through the UI:
- Navigate to "Create New Offer"
- Fill out the form with association, leagues, season, and pricing
- Submit the form
- Verify the offer appears in the offers list with "draft" status
- Verify navigation to offer detail page

### 2. Backend Offer Creation (`test-backend-create-offer.spec.ts`)
Tests offer creation via the API and verification in the dashboard:
- Create an offer using the TRPC API
- Verify the offer appears in the offers list API response
- Navigate to the dashboard
- Verify the offer is visible in the UI
- Test multiple offers creation and listing
- Verify offer status display

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Debug Mode
Open the Playwright Inspector to step through tests:
```bash
npm run test:e2e:debug
```

### UI Mode (Recommended)
Interactive mode with visual test exploration:
```bash
npm run test:e2e:ui
```

### Specific Test
```bash
npx playwright test test-frontend-create-offer.spec.ts
```

### Watch Mode
```bash
npx playwright test --watch
```

## Prerequisites

1. **Node.js** installed
2. **Playwright** dependencies: Already installed via `npm install`
3. **Dev server running** (tests will auto-start the server)

## Configuration

Configuration is in `playwright.config.ts`:
- Base URL: `http://localhost:5173`
- Server auto-start: Yes
- Screenshot on failure: Enabled
- Video on failure: Enabled
- HTML reports: Generated in `playwright-report/`

## Test Data Setup

Tests use the following strategies for test data:
1. **Available data**: Fetch existing leagues, seasons, associations from API
2. **Fresh creation**: Create new offers for each test run
3. **Cleanup**: Tests don't explicitly delete data; database is reset between dev sessions

## Common Issues

### Tests fail with "UNAUTHORIZED"
- Ensure you're not running tests against a production database
- Tests assume development/test environment with mock auth
- Check that the TRPC endpoints are accessible at `http://localhost:5173/trpc/`

### Selectors not finding elements
- Test selectors assume `data-testid` attributes in HTML
- Update selectors in `utils.ts` if UI markup changes
- Use Playwright Inspector to debug: `npm run test:e2e:debug`

### Server doesn't start
- Check that ports 3000 and 5173 are available
- Ensure MongoDB is running (in-memory-server used in dev mode)
- Check `npm run dev` works before running tests

## Debugging

### View HTML Reports
After running tests, open the report:
```bash
npx playwright show-report
```

### Screenshots/Videos
Check `test-results/` folder for:
- Screenshots (on failure)
- Videos (on failure)

### Console Output
Playwright captures:
- `console.log()` statements in tests
- Browser console logs
- Network requests

View in HTML report or terminal output.

## CI/CD Integration

To run in CI:
1. Tests are configured with `fullyParallel: false` for consistency
2. Screenshots and videos saved on failure
3. Retries enabled in CI mode
4. Report generated for artifacts

Add to CI pipeline:
```yaml
- name: Run E2E Tests
  run: npm run test:e2e
```

## Test Maintenance

When updating the UI:
1. Update selectors in test files if HTML structure changes
2. Update `utils.ts` if API endpoints change
3. Add new test cases for new features
4. Commit test updates with feature changes

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)
