# Minerva Version History

This file is the source of truth for Minerva release notes on GitHub.

## v0.4.36

- Tightened profile-page UI placement so Minerva prefers the wide center-column `Profile Notes` bar anchor (instead of matching smaller sidebar notes elements), improving consistent placement in the gap above `Profile Notes` across profiles.

## v0.4.35

- Fixed another main-panel status desync where it could remain on `NO TARGETS` on an untracked profile even while the corner widget showed tracked targets and a live status.
- Main panel status recovery now falls back to the first tracked target's status when the current profile is not tracked.

## v0.4.34

- Reworked long-lived global UI listeners (toast drag, settings popup, corner widget drag/resize) to use removable handler references, reducing listener buildup during teardown/reload cycles without changing UI behavior.
- Removed the public `window.MinervaTeardown` export and switched to an internal teardown slot for instance handoff, reducing accidental or external script-triggered Minerva shutdowns.
- Added a preferred profile-page injection placement above the `Profile Notes` bar on supported Torn layouts.

## v0.4.33

- Added poll-cycle empty-list recovery: Minerva now re-syncs tracked targets from storage before declaring `NO TARGETS`, reducing false empty-state flashes during storage sync races.
- Added immediate stale-instance teardown on boot when a previous Minerva instance is still attached to the page, reducing duplicate intervals and countdown jitter after reload/update.

## v0.4.32

- Fixed primary-target selection in poll cycles so Minerva only treats the current profile (`targetId`) as primary when that profile is actually in the tracked list.
- Prevents the main panel from staying `AWAITING PING`/`UNKNOWN` when viewing an untracked profile while polling a different tracked target.

## v0.4.31

- Fixed a profile-panel status sync edge case where the main Minerva box could stay on `AWAITING PING` on the current profile while the tracked row already had a known status.
- `syncTrackingStateFromUi()` now falls back to the tracked row's threshold status for the current profile when `currentStatus` is still `UNKNOWN`.

## v0.4.30

- Added missing `GM_removeValueChangeListener` grant so Minerva teardown can unregister the tracked-target cross-tab sync listener correctly.
- Hardened one-time global UI listeners (toast drag, settings popup, corner drag/resize) to no-op for stale/inactive Minerva instances.
- Teardown now resets Minerva global listener bind flags so the active instance can rebind cleanly after stale-instance cleanup.

## v0.4.29

- Fixed main profile panel status desync where it could remain on `AWAITING PING` after UI reinjection while the corner tracker already had a known live status.
- `syncTrackingStateFromUi()` now restores the known status when the UI shows `PAUSED` or `AWAITING PING` incorrectly.

## v0.4.28

- Changed Minerva update-action links (toast `Update` button and header `UPDATE AVAILABLE` badge) to open the Greasy Fork script page instead of GitHub Releases.
- Kept the version check source on GitHub Releases, but routed user-facing updates to the Greasy Fork install/update page.

## v0.4.27

- Added an inline `UPDATE AVAILABLE` badge in the main Minerva status header (red styling, shown only when GitHub releases report a newer version than the installed script).
- Clicking the update badge opens the latest release page; the badge clears automatically after updating to the latest version.
- Added explicit runtime teardown (`teardownMinerva`) to clear Minerva UI, interval, observer, and runtime state on page unload and stale-instance takeover.
- Reduced lingering/stale UI risk when duplicate instances occur on the same page by tearing down the inactive instance instead of only stopping its timer.

## v0.4.26

- Added runtime singleton guards to prevent duplicate Minerva instances on the same page from fighting over UI/status updates.
- Added engine tick and poll-cycle reentrancy guards to prevent overlapping countdown/poll updates.
- Ignored stale async API callbacks from inactive Minerva instances to reduce `PAUSED`/countdown desync behavior.

## v0.4.25

- Refactor/cleanup pass: replaced repeated tracked-state initialization boilerplate with a shared helper (`ensureTrackedState`) to simplify the polling/error paths.
- Minor naming/comment cleanup for readability (no intended feature changes).

## v0.4.24

- Removed stale `#minerva-toggle` sync logic from `syncTrackingStateFromUi()` (the toggle no longer exists in the current UI).
- Kept the useful status-text desync recovery behavior (`PAUSED` -> active status refresh) without dead DOM checks.

## v0.4.23

- Performance pass: debounced tracked-list rendering to reduce repeated DOM rebuild/layout work during rapid updates.
- Reduced per-tick URL parsing work by syncing the current profile target ID only when the location search string changes.
- Strengthened Minerva control style overrides to reduce hover flicker from Torn/global page styles.
- Added a copy/paste-ready data/key handling disclosure section to `README.md` (used by synced additional info).

## v0.4.22

- Fixed stale `Track/Untrack Current` state on Torn page changes by syncing the current profile target ID from the URL at runtime.
- Keeps the main panel button and current-row highlighting aligned when Torn changes profiles without a full script reload.

## v0.4.21

- Updated Minerva toasts/alerts to display tracked target names (with ID fallback) instead of raw ID-only text.

## v0.4.20

- Added cross-tab tracked-target syncing so tracked users persist/update across Torn pages and browser tabs without waiting for reloads.
- Added Minerva control style overrides to prevent Torn site hover animations/effects from causing button flicker.
- Added GitHub automation to generate `GREASYFORK_ADDITIONAL_INFO.md` from `README.md` and `VERSION_HISTORY.md` on push.
- Added local generator script (`scripts/build_greasyfork_additional_info.py`) and GitHub Action workflow for synced additional-info content.

## v0.4.19

- Hardened tracked-row rendering by escaping dynamic text values before inserting HTML.
- Fixed profile injection retry observer buildup risk by tracking and disconnecting stale `MutationObserver` instances.
- Improved injection retry cleanup so failed attempts do not leave long-lived body observers running.

## v0.4.18

- Removed the redundant settings `Clear` (log clear) button while keeping `Clear Tracked`.
- Added hospital transition alerts for both entering hospital and leaving hospital.
- Added travel alerts for departure (`traveling to ...`) and arrival (`arrived at ...`) with destination when detectable.
- Updated within-threshold offline row label casing to `Ready` (cyan).

## v0.4.17

- Changed within-threshold offline row status from `INACTIVE <...` to `READY` (shown in Minerva blue/cyan).
- Added a manual `Check Updates` button in settings that forces a version check and shows a toast result.

## v0.4.16

- Improved profile UI injection reliability across more Torn profile layouts (including pages with extra overlays/widgets).
- Added richer dynamic-host diagnostics and a guarded overlay fallback when in-flow insertion fails.
- Added automatic UI reinjection checks if the profile DOM is rebuilt after page load.

## v0.4.15

- Filtered benign `ResizeObserver` browser warnings out of Minerva's global error logging to reduce log noise.

## v0.4.14

- Added safe in-script update notifications (GitHub release check + toast with `Update` button; no auto-replace of script code).
- Updated `@supportURL` to GitHub issue templates for structured bug reports.

## v0.4.13

- Added a hospital status cross icon in tracked rows (`green` = not in hospital, `red` = in hospital).
- Added recovery notification/toast when a tracked target leaves hospital and becomes okay.

## v0.4.12

- Made tracked-row usernames clickable (opens the target profile in a new tab).
- Added GitHub-friendly `VERSION_HISTORY.md` for ongoing release tracking.
- Prepared Greasy Fork additional-info HTML to support collapsible sections and visible version history.

## v0.4.11

- Fixed confusing row text when Torn reports a target as online but returns an older `last_action.relative`.
- Row now shows `Online now` instead of stale text like `46 minutes ago` when `last_action.status === "Online"`.

## v0.4.10

- Added proprietary header metadata and support link.
- Added explicit copyright + no-copy/no-redistribution notice in script comments.

## v0.4.9

- Filtered external browser extension/userscript errors out of Minerva's global error logging (`window.error` / `unhandledrejection`).
- Keeps Minerva logs focused on Minerva/Torn issues.

## v0.4.8

- Updated userscript description wording for publish/readability.
