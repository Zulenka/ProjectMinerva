# Project Minerva

Minerva is a Tampermonkey userscript for Torn that tracks player activity, manages a manual target list, and provides a persistent floating tracker across Torn pages.

This README explains how the script works at a code level while staying readable for non-specialists.

## What the Script Does

Minerva combines four core jobs:

- Poll Torn's API for `last_action` activity data
- Keep a manually managed list of tracked player IDs
- Render a profile-page panel and a site-wide floating tracker widget
- Notify the user when tracked targets cross a recent-activity threshold

Primary script file:

- `Minerva.js`

## High-Level Architecture

`Minerva.js` is a single-file userscript organized by responsibility.

Main sections in the script:

- Configuration and state (constants, storage keys, runtime flags)
- Logging system
- API key/passphrase storage and vault handling
- UI builders (main panel, settings popup, corner widget, toasts)
- Layout injection logic (profile panel placement)
- Tracking and API polling logic
- Startup boot flow and global error handlers

## Data Flow (How a Poll Works)

1. The engine timer runs once per second.
2. A countdown reaches `0`.
3. `checkTargetActivity()` starts a poll cycle.
4. Minerva polls tracked targets one at a time (small delay between requests).
5. Each response updates `trackedStates[id]`.
6. The main panel and corner widget re-render.
7. Notifications are sent only when a status changes.

This design avoids burst requests and keeps the UI synchronized with the latest results.

## Torn API Usage

Minerva currently reads activity from the Torn v2 profile endpoint:

- `GET /v2/user/{id}/profile`

It looks for:

- `profile.last_action.timestamp`
- `profile.last_action.relative`
- `profile.last_action.status`

In code, the request is made through Tampermonkey's `GM_xmlhttpRequest`, and Minerva sends both:

- `Authorization: ApiKey ...` header
- `key=...` query parameter

This dual-auth approach improves compatibility in userscript request contexts.

## Status Model (Important)

Minerva uses two related status concepts.

### 1. Threshold Status (Main Status Logic)

This drives the top-level `ACTIVE` / `INACTIVE` state.

Rule:

- `ACTIVE` if `secondsSinceActive <= thresholdSeconds`
- `INACTIVE` otherwise

This is a recent-activity window, not a strict online/offline indicator.

### 2. Presence-Oriented Row Status (Tracked List Labels)

This is what the corner widget rows display.

Examples:

- `ACTIVE`
- `INACTIVE <5m`
- `INACTIVE 5m+`

This makes the list easier to use when you care about short timing windows.

## State and Storage

Minerva stores settings and UI state in Tampermonkey storage (`GM_setValue` / `GM_getValue`).

Notable stored values:

- API key material (`plain`, encrypted vault, and temporary unlock cache)
- Tracked targets list
- Threshold seconds
- Max tracked targets
- Corner widget position / hidden / compact / locked state
- API key popup position
- Toast host position

Runtime-only state is kept in local variables, including:

- `trackedStates` (current row data for each tracked target)
- countdown timer
- current main status
- request sequence counters
- manual ping cooldown state

## API Key Security Model

Minerva supports an encrypted API key vault.

### How it works

- User enters Torn API key in a custom Minerva popup
- User creates a Minerva passphrase
- Minerva encrypts the key using Web Crypto (`PBKDF2` + `AES-GCM`)
- Encrypted vault is stored in Tampermonkey storage
- A decrypted cache is kept for 7 days to avoid repeated unlock prompts

### Unlock behavior

- If the 7-day cache is still valid, Minerva starts normally
- If the cache expires, Minerva shows a custom unlock panel
- If the user forgets the passphrase, Minerva can reset the vault and restart key setup

### Fallback behavior

If Web Crypto is unavailable, Minerva falls back to plain storage mode (legacy behavior).

## UI Components

## Main Profile Panel

The main panel only injects on profile pages (`profiles.php?XID=...`).

It contains:

- Status banner
- Next ping countdown
- Settings and utility actions
- Optional log panel

On the user's own profile page, settings are moved into a floating popup opened by a gear button.

## Corner Widget (Site-Wide)

The corner widget runs across all Torn pages (`@match https://www.torn.com/*`).

It provides:

- Overall Minerva status pill
- Threshold display
- Tracked target list
- Manual ping cooldown badge
- Row-level actions

Behavior details:

- Draggable with persistent position
- Grid snap on mouse release
- Lock/unlock movement
- Compact/expanded mode
- Hide/reopen tab
- Auto-clamps into viewport on resize
- Dynamic width and list-height sizing

## Toast Notifications (In-Page)

Minerva renders a custom toast host that:

- Supports multiple stacked toasts
- Is draggable by the toast header
- Persists position across reloads

Toasts are used for:

- Preview/testing (`View Toast`)
- Visible-tab activity alerts
- Manual ping cooldown alerts

## Notifications (Background)

When the page is hidden, Minerva tries to notify through:

1. Browser `Notification` API
2. `GM_notification` fallback

Minerva also throttles notifications to avoid spam (cooldown between alerts).

## Manual Target Management

Minerva does not auto-track visited profiles.

Targets are added/removed manually via:

- `Track Current`
- `Untrack Current`
- Row remove button (`x`)

Supporting controls:

- `Clear Tracked` (keeps current profile)
- `Max Tracked` setting (caps tracked list size)

Internally, Minerva keeps the tracked list ordered by most recently added/selected target.

## Manual Ping System and Anti-Spam Logic

Each tracked row has a `↻` manual ping button.

Behavior:

- Immediately requests fresh activity for that specific target
- Resets main countdown if the pinged target is the current profile target

Anti-spam protection:

- Tracks click timestamps in a short rolling window
- If too many clicks happen too quickly, Minerva starts a cooldown
- During cooldown, row ping buttons are disabled and a badge is shown

This prevents accidental API spam and keeps the UI predictable.

## Logging and Diagnostics

Minerva includes a built-in on-screen log panel and console logging.

What it logs:

- Poll cycle start/end
- API request start/success/failure
- Parsed activity details (for primary target)
- UI injection path used
- Network/timeout/parse errors
- Global `window.error` and `unhandledrejection` summaries

Performance safeguards:

- UI log line cap (`MAX_UI_LOG_LINES`)
- Log message truncation (`MAX_LOG_MESSAGE_CHARS`)
- API key redaction in log messages

## Layout Injection Strategy (Why It Works Across Layouts)

Torn profile layouts vary. Minerva uses a layered injection strategy for the main panel.

Injection order:

1. Known profile container selectors
2. Fallback anchor-based insertion near profile/action blocks
3. Dynamic layout scoring (`findBestDynamicInjectionHost`)
4. Generic fallback containers (`#mainContainer`, `#content`, `body`, etc.)
5. MutationObserver retry + delayed retries

The dynamic scoring path looks at visibility, size, position, and profile/action-related signals to choose a likely host container.

## Core Functions (Quick Map)

Useful functions to know when editing the script:

- `bootMinerva()` - Starts UI + engine interval
- `runEngine()` - 1-second loop for countdown and polling triggers
- `checkTargetActivity()` - Poll cycle coordinator across tracked targets
- `checkProfileActivityForId()` - API request + response parsing for one target
- `renderTrackedList()` - Builds corner widget rows
- `updateVisuals()` - Updates main panel and corner widget status display
- `injectSafely()` - Main panel placement logic on profile pages
- `injectCornerWidget()` - Floating widget setup and interactions
- `storeApiKeySecurely()` / `resolveApiKeyForStartup()` - Key vault and unlock flow

## Error States and Recovery

Common failure states are surfaced directly in the UI and logs.

Examples:

- `NO API KEY` - key missing or reset before replacement
- `ACTIVITY UNAVAILABLE` - profile response lacks `last_action`
- `API TIMEOUT` - Torn request did not return in time
- `NETWORK ERROR` - request failed at transport level
- `JSON PARSE ERROR` - invalid response payload
- `NO TARGETS` - tracker enabled but no manually tracked targets

Recovery is generally simple:

- Re-enter/reset API key
- Track a target manually
- Check logs for the exact API or network error

## Development Notes

## Current File Layout

- `Minerva.js` - Main userscript (source of truth)
- `MINERVA_FEATURES_GUIDE.md` - User-facing feature overview
- `MINERVA_FEATURES_GUIDE_GREASYFORK.html` - Greasy Fork-safe HTML guide
- `TORN_API_GUIDELINES_AND_ENDPOINTS.md` - Torn API reference notes / endpoint inventory
- `src/main.js` - Additional project file in repo (not the primary userscript)

## Safe Update Practices

When changing Minerva behavior:

- Keep `@name` exactly `Minerva` unless intentionally renaming the userscript
- Bump `@version` following the current project version scheme
- Test on both a profile page and a non-profile Torn page
- Check the corner widget after resizing and page navigation
- Verify API key reset/unlock flows if touching security/storage logic

## Known Quirk (Current Code)

`syncTrackingStateFromUi()` still checks for a `#minerva-toggle` element that no longer exists in the current UI. It exits early, so it is harmless, but it is a good cleanup candidate in a future refactor.

## Quick Start (Developer / Tester)

1. Install `Minerva.js` in Tampermonkey.
2. Open a Torn profile page.
3. Enter a Torn API key with `User -> Profile` access.
4. Add the current profile with `Track Current`.
5. Open logs if you want to verify requests and parsed statuses.

## License / Ownership

Author shown in script header:

- `Beatrix`

If you publish updates, keep attribution and clearly document behavioral changes in release notes or commit messages.