# Seasonal Dashboard Grouping Design Spec

**Date:** 2026-04-06
**Status:** Approved
**Topic:** Grouping the financial dashboard by season first, then league, using a unified accordion structure.

## Overview
The current dashboard displays two separate flat tables: "Active Configs" and "Unconfigured League/Seasons". This design consolidates both into a single, seasonally-organized view using accordions for better clarity and vertical space management.

## Architecture & Data Flow
The transformation logic will reside in the frontend to keep the backend API simple and reusable.

### Data Transformation (Frontend)
- **Source:** The `finance.dashboard.summary` tRPC query returns `configStats` (configured) and `pending` (unconfigured) arrays.
- **Process:**
    1. Group all items into a `Map<number, SeasonGroup>` where the key is `seasonId`.
    2. Each group contains a `rows` array of unified objects:
        ```ts
        type DashboardRow = 
          | { type: 'CONFIGURED'; config: FinancialConfig; stats: CalculationResult }
          | { type: 'PENDING'; leagueId: number; seasonId: number; leagueName: string; seasonName: string; gamedayCount: number };
        ```
    3. Sort the seasons by `seasonId` descending (newest first).
    4. Within each season, sort rows by `leagueName` ascending.

## Components

### `DashboardPage`
- **Responsibilities:** 
    - Fetches data via tRPC.
    - Executes the grouping and sorting logic.
    - Manages the expansion state (`Set<number>`) for the accordions.
    - Expands the most recent season by default.

### `SeasonalAccordion` (New)
- **Props:** `seasonId`, `seasonName`, `rows`, `isExpanded`, `onToggle`.
- **UI:**
    - **Header:** Season Name, Season Total Gross (sum of configured rows), and a toggle icon (▼/▶).
    - **Content:** Only rendered if `isExpanded` is true. Contains the `SeasonTable`.

### `SeasonTable` (New/Refactored)
- **Responsibilities:** Renders a single table for a specific season.
- **Columns:** League Name, Cost Model (or "Pending"), Expected Gross, Live Gross, Net, Actions.
- **Row Rendering:**
    - **Configured:** Displays detailed financial stats and "Details" link.
    - **Pending:** Displays "Pending" status, gameday count, and "+ Create Config" button.

## UI/UX
- **Layout:** Unified view per season.
- **Styling:** Consistent with the existing vanilla CSS aesthetic. Accordions use standard borders and background shading for headers.
- **Default State:** The first (newest) season accordion is expanded on load; others are collapsed.

## Error Handling
- If a season has no items (unlikely given the SQL query), it won't appear in the list.
- Loading and error states remain handled at the `DashboardPage` level.

## Testing
- **Logic:** Unit test the grouping function to ensure `CONFIGURED` and `PENDING` items are merged correctly.
- **Visual:** Verify accordion toggle behavior and default expansion state.
