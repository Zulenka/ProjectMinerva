# Minerva (Torn Activity Tracker)

Minerva is a Torn userscript focused on practical activity tracking for a manually managed target list.

It gives you:

- A profile-page Minerva panel with status + countdown
- A floating tracker widget that stays available across Torn pages
- Manual target tracking (`Track Current` / `Untrack Current`)
- Quick row actions (`Ping`, `Attack`, remove)
- Toast/background alerts for activity, hospital transitions, and travel transitions

## Current Version

- **v0.4.34**

## What Minerva Is For (Plain Language)

Minerva helps you watch specific players without constantly refreshing profiles manually.
You choose who to track. Minerva checks activity, keeps a visible list, and alerts you when something changes.

It is built for on-page use in Torn. It is not a remote service and does not send your tracked target list to the script author.

## Main Features

### Tracking and Status

- Manual target list (no auto-tracking every profile you visit)
- Threshold-based activity status for the main tracker
- Row-level status labels that are easier to read at a glance
- Hospital indicator + hospital enter/leave alerts
- Travel start/arrival alerts (destination shown when Torn provides it)

### UI / Quality of Life

- Floating corner widget (draggable, lockable, compact mode, hide/reopen)
- Persistent positions for widget/toasts/popups
- Manual `Check Updates` button in settings
- In-page toast notifications (plus background notification fallback when tab is hidden)

### Stability and Performance

- Cross-tab tracked-target sync
- Guardrails to avoid overlapping poll loops
- Injection fallback/retry logic for different Torn profile layouts
- Log noise filtering for common browser/UI warnings

## API Key / Privacy / Data Handling

### Data Storage

- Stored locally in your browser (Tampermonkey storage)
- No remote storage by the script author

### Data Sharing

- Minerva does **not** send your tracked targets or Torn API key to the script author
- Optional version checks only contact GitHub Releases metadata (no Torn API key included)

### API Key Handling

- Supports local encrypted storage (passphrase-protected vault)
- Keeps a temporary local unlock cache for convenience
- Recommended Torn key scope: **User -> Profile** (minimum needed for Minerva's profile activity checks)

## Required/Disclosure Summary (AI/Tool Listing Friendly)

| Category | Minerva Statement |
| --- | --- |
| Data Storage | Local only in the user's browser (Tampermonkey storage). |
| Data Retention | Persistent until the user clears/reset storage or removes the script; some temporary runtime state exists while the page is open. |
| Data Sharing | No user tracking data is sent to the script author or shared with third parties by Minerva. |
| Purpose of Use | Torn activity tracking, target list management, and on-page alerts/tools. |
| API Key Storage & Sharing | Stored locally only; optional encrypted local vault supported; not sent to the script author. |
| API Key Access Level | Recommended minimum custom key scope: `User -> Profile`. |
| External Requests (Non-Torn) | Optional GitHub release version checks only (no Torn API key sent). |

## Troubleshooting (Quick)

- **No data / activity unavailable**: confirm your Torn API key and `User -> Profile` access.
- **No targets**: use `Track Current` on a profile page.
- **Widget missing on a profile**: open Minerva logs and reload once (Minerva has layout fallback/retry logic).
- **Update toast not showing**: use the `Check Updates` button in Minerva settings for a manual check.

## Recent Changes

### v0.4.34
- Reworked long-lived global UI listeners (toast drag, settings popup, corner widget drag/resize) to use removable handler references, reducing listener buildup during teardown/reload cycles without changing UI behavior.
- Removed the public `window.MinervaTeardown` export and switched to an internal teardown slot for instance handoff, reducing accidental or external script-triggered Minerva shutdowns.
- Added a preferred profile-page injection placement above the `Profile Notes` bar on supported Torn layouts.

### v0.4.33
- Added poll-cycle empty-list recovery: Minerva now re-syncs tracked targets from storage before declaring `NO TARGETS`, reducing false empty-state flashes during storage sync races.
- Added immediate stale-instance teardown on boot when a previous Minerva instance is still attached to the page, reducing duplicate intervals and countdown jitter after reload/update.

### v0.4.32
- Fixed primary-target selection in poll cycles so Minerva only treats the current profile (`targetId`) as primary when that profile is actually in the tracked list.
- Prevents the main panel from staying `AWAITING PING`/`UNKNOWN` when viewing an untracked profile while polling a different tracked target.

### v0.4.31
- Fixed a profile-panel status sync edge case where the main Minerva box could stay on `AWAITING PING` on the current profile while the tracked row already had a known status.
- `syncTrackingStateFromUi()` now falls back to the tracked row's threshold status for the current profile when `currentStatus` is still `UNKNOWN`.

### v0.4.30
- Added missing `GM_removeValueChangeListener` grant so Minerva teardown can unregister the tracked-target cross-tab sync listener correctly.
- Hardened one-time global UI listeners (toast drag, settings popup, corner drag/resize) to no-op for stale/inactive Minerva instances.
- Teardown now resets Minerva global listener bind flags so the active instance can rebind cleanly after stale-instance cleanup.

### v0.4.29
- Fixed main profile panel status desync where it could remain on `AWAITING PING` after UI reinjection while the corner tracker already had a known live status.
- `syncTrackingStateFromUi()` now restores the known status when the UI shows `PAUSED` or `AWAITING PING` incorrectly.

### v0.4.28
- Changed Minerva update-action links (toast `Update` button and header `UPDATE AVAILABLE` badge) to open the Greasy Fork script page instead of GitHub Releases.
- Kept the version check source on GitHub Releases, but routed user-facing updates to the Greasy Fork install/update page.

### v0.4.27
- Added an inline `UPDATE AVAILABLE` badge in the main Minerva status header (red styling, shown only when GitHub releases report a newer version than the installed script).
- Clicking the update badge opens the latest release page; the badge clears automatically after updating to the latest version.
- Added explicit runtime teardown (`teardownMinerva`) to clear Minerva UI, interval, observer, and runtime state on page unload and stale-instance takeover.
- Reduced lingering/stale UI risk when duplicate instances occur on the same page by tearing down the inactive instance instead of only stopping its timer.

## Full Technical Docs / Changelog

- `README.md` (technical/project documentation)
- `VERSION_HISTORY.md` (full version history)

---

This file is auto-generated from repository sources. If wording looks wrong, update the generator/script docs in the repo and re-run generation.
