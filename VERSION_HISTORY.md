# Minerva Version History

This file is the source of truth for Minerva release notes on GitHub.

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

## Release Process (Recommended)

When shipping a new version:

1. Bump `@version` in `Minerva.js`
2. Update the Minerva boot log version string in `Minerva.js`
3. Add a new top entry to `VERSION_HISTORY.md`
4. Update the version-history block in `MINERVA_FEATURES_GUIDE_GREASYFORK.html` (Additional Info)
5. Commit and push
