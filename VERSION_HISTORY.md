# Minerva Version History

This file is the source of truth for Minerva release notes on GitHub.

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
