# Minerva (Torn Activity Tracker)

Minerva is a Torn userscript focused on practical activity tracking for a manually managed target list.

It gives you:

- A profile-page Minerva panel with status + countdown
- A floating tracker widget that stays available across Torn pages
- Manual target tracking (`Track Current` / `Untrack Current`)
- Quick row actions (`Ping`, `Attack`, remove)
- Toast/background alerts for activity, hospital transitions, and travel transitions

## Current Version

- **v0.4.41**

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

### v0.4.41
- Removed the heavy duplicate-instance DOM/window lock arbitration path and reverted runtime ownership checks to a simpler local teardown guard, after confirming duplicate starts were caused by running Minerva in both Violentmonkey and Tampermonkey.
- Kept the startup tracked-target storage re-sync grace window from `v0.4.40` to reduce false `NO TARGETS` flashes during page/script initialization races.

### v0.4.40
- Added a short startup tracked-target recovery grace window with boot-time storage re-sync retries, reducing false `NO TARGETS` flashes when Tampermonkey storage initializes late.
- Improved duplicate-instance lock handling to attempt stale-lock reclamation before blocking a new instance, reducing duplicate-start race noise.

### v0.4.39
- Renamed the main header field label from `STATUS` to `SIGNAL` for clearer tracker wording without changing status behavior/values.

### v0.4.38
- Adjusted the `Profile Notes` placement rule to insert Minerva directly before the `Profile Notes` bar container (instead of climbing to a wider parent), for more exact positioning in the gap above that bar.

### v0.4.37
- Added `@noframes` to prevent Minerva from running inside subframes/iframes.
- Added a DOM-level singleton lock (`data-minerva-active-instance`) so only one Minerva instance can own a page at a time, improving duplicate-instance prevention when userscript sandbox contexts differ.

### v0.4.36
- Tightened profile-page UI placement so Minerva prefers the wide center-column `Profile Notes` bar anchor (instead of matching smaller sidebar notes elements), improving consistent placement in the gap above `Profile Notes` across profiles.

### v0.4.35
- Fixed another main-panel status desync where it could remain on `NO TARGETS` on an untracked profile even while the corner widget showed tracked targets and a live status.
- Main panel status recovery now falls back to the first tracked target's status when the current profile is not tracked.

### v0.4.34
- Reworked long-lived global UI listeners (toast drag, settings popup, corner widget drag/resize) to use removable handler references, reducing listener buildup during teardown/reload cycles without changing UI behavior.
- Removed the public `window.MinervaTeardown` export and switched to an internal teardown slot for instance handoff, reducing accidental or external script-triggered Minerva shutdowns.
- Added a preferred profile-page injection placement above the `Profile Notes` bar on supported Torn layouts.

## Full Technical Docs / Changelog

- `README.md` (technical/project documentation)
- `VERSION_HISTORY.md` (full version history)

---

This file is auto-generated from repository sources. If wording looks wrong, update the generator/script docs in the repo and re-run generation.
