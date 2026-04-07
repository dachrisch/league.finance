# Design Spec: Sticky Application Footer

Implement a responsive, sticky footer for the Leagues Finance application that displays the current git commit hash, copyright information, and location/creation emojis.

## User Requirements
- **Content**: `[git-hash] · © 2026 bumbleflies UG · Made in 🥨 with ♥️`
- **Position**: Sticky at the bottom of the viewport.
- **Layout**: Single line on desktop, responsive stacked layout on mobile.
- **Branding**: No "leaguesphere" prefix.

## Proposed Changes

### 1. Build Configuration (`vite.config.ts`)
Inject the current git commit hash as a global constant using Vite's `define` feature.

```typescript
import { execSync } from 'child_process';
const gitHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
  define: {
    __GIT_COMMIT__: JSON.stringify(gitHash),
  },
  // ... existing config
});
```

### 2. Global Styling (`src/client/index.css`)
Update the layout to support a sticky footer using Flexbox.

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

### 3. Footer Component (`src/client/components/Footer.tsx`)
A new component to render the structured footer.

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

### 4. Application Integration (`src/client/App.tsx`)
Wrap the routes in a layout that includes the `Footer`.

```tsx
export function App() {
  return (
    <BrowserRouter>
      <div id="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <main style={{ flex: 1 }}>
          <Routes>
            {/* ... routes */}
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
```

## Verification Plan
- **Build**: Ensure `npm run build` succeeds and injects the hash correctly.
- **Visual**: 
  - Verify footer is at the bottom on short pages (Login).
  - Verify footer is at the end of long pages (Dashboard).
  - Check mobile layout (stacked) vs desktop layout (inline).
- **Automation**: Add a basic test in `src/client/lib/__tests__/footer.test.tsx` (optional but recommended) to verify the component renders the expected text.
