# App Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a responsive, sticky footer displaying the git commit hash, copyright, and location emojis.

**Architecture:** Inject the git hash at build time via Vite's `define` and use a global Flexbox layout for the sticky footer effect.

**Tech Stack:** React, Vite, CSS (Flexbox).

---

### Task 1: Build Configuration

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update vite.config.ts to inject git hash**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

const gitHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(gitHash),
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      '/trpc': 'http://localhost:3000',
      '/auth': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 2: Verify build configuration**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: inject git commit hash into client via vite define"
```

---

### Task 2: Footer Component & Styling

**Files:**
- Create: `src/client/components/Footer.tsx`
- Modify: `src/client/index.css`
- Create: `src/client/components/__tests__/Footer.test.tsx`

- [ ] **Step 1: Define global styles for sticky footer**

Modify `src/client/index.css`:
```css
#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;
}

.app-footer {
  padding: 1.5rem 1rem;
  background: #fff;
  border-top: 1px solid var(--border-color);
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.footer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .footer-content {
    flex-direction: row;
    justify-content: center;
    gap: 0;
  }
  .footer-item + .footer-item::before {
    content: "·";
    margin: 0 0.5rem;
  }
}

.git-ref {
  font-family: monospace;
  background: var(--light-bg);
  padding: 2px 4px;
  border-radius: 4px;
}
```

- [ ] **Step 2: Create the Footer component**

Create `src/client/components/Footer.tsx`:
```tsx
declare const __GIT_COMMIT__: string;

export function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-item git-ref">{__GIT_COMMIT__}</span>
        <span className="footer-item">&copy; 2026 bumbleflies UG</span>
        <span className="footer-item">Made in 🥨 with ♥️</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Write the test for the Footer component**

Create `src/client/components/__tests__/Footer.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { Footer } from '../Footer';
import { expect, test, vi } from 'vitest';

// Mock the global variable
vi.stubGlobal('__GIT_COMMIT__', 'abc1234');

test('renders footer with git hash and copyright', () => {
  render(<Footer />);
  expect(screen.getByText('abc1234')).toBeDefined();
  expect(screen.getByText(/2026 bumbleflies UG/)).toBeDefined();
  expect(screen.getByText(/Made in 🥨 with ♥️/)).toBeDefined();
});
```

- [ ] **Step 4: Run tests**

Run: `npm run test src/client/components/__tests__/Footer.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/client/index.css src/client/components/Footer.tsx src/client/components/__tests__/Footer.test.tsx
git commit -m "feat: add Footer component and sticky footer styles"
```

---

### Task 3: Application Integration

**Files:**
- Modify: `src/client/App.tsx`

- [ ] **Step 1: Integrate Footer into App component**

Modify `src/client/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConfigDetailPage } from './pages/ConfigDetailPage';
import { ConfigNewPage } from './pages/ConfigNewPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { Footer } from './components/Footer';

export function App() {
  return (
    <BrowserRouter>
      <div id="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/login/callback" element={<AuthCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/config/new" element={<ConfigNewPage />} />
              <Route path="/config/:id" element={<ConfigDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Success (or fix any Footer-related errors).

- [ ] **Step 3: Commit**

```bash
git add src/client/App.tsx
git commit -m "feat: integrate Footer into App layout"
```

---

### Task 4: Final Verification

- [ ] **Step 1: Full build and test run**

Run: `npm run build && npm run test`
Expected: All pass.

- [ ] **Step 2: Commit and push**

```bash
git push origin master
```
