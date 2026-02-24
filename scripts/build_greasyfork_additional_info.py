from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
VERSION_HISTORY = ROOT / "VERSION_HISTORY.md"
SCRIPT = ROOT / "Minerva.js"
OUTPUT = ROOT / "GREASYFORK_ADDITIONAL_INFO.md"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def extract_script_version(script_text: str) -> str:
    match = re.search(r"^//\s*@version\s+(\S+)", script_text, flags=re.MULTILINE)
    return match.group(1) if match else "unknown"


def extract_latest_versions(version_history_text: str, limit: int = 8) -> list[tuple[str, list[str]]]:
    sections: list[tuple[str, list[str]]] = []
    current_version = None
    current_lines: list[str] = []

    for raw_line in version_history_text.splitlines():
        line = raw_line.rstrip()
        if line.startswith("## "):
            if current_version:
                bullets = [ln[2:].strip() for ln in current_lines if ln.strip().startswith("- ")]
                sections.append((current_version, bullets))
            current_version = line.replace("##", "", 1).strip()
            current_lines = []
            continue
        if current_version:
            current_lines.append(line)

    if current_version:
        bullets = [ln[2:].strip() for ln in current_lines if ln.strip().startswith("- ")]
        sections.append((current_version, bullets))

    return sections[:limit]


def build_content(current_version: str, recent_versions: list[tuple[str, list[str]]]) -> str:
    recent_lines: list[str] = []
    for version, bullets in recent_versions:
        recent_lines.append(f"### {version}")
        if bullets:
            recent_lines.extend([f"- {b}" for b in bullets[:4]])
        else:
            recent_lines.append("- Update details available in the repository version history.")
        recent_lines.append("")

    recent_block = "\n".join(recent_lines).strip()

    return f"""# Minerva (Torn Activity Tracker)

Minerva is a Torn userscript focused on practical activity tracking for a manually managed target list.

It gives you:

- A profile-page Minerva panel with status + countdown
- A floating tracker widget that stays available across Torn pages
- Manual target tracking (`Track Current` / `Untrack Current`)
- Quick row actions (`Ping`, `Attack`, remove)
- Toast/background alerts for activity, hospital transitions, and travel transitions

## Current Version

- **{current_version}**

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

{recent_block}

## Full Technical Docs / Changelog

- `README.md` (technical/project documentation)
- `VERSION_HISTORY.md` (full version history)

---

This file is auto-generated from repository sources. If wording looks wrong, update the generator/script docs in the repo and re-run generation.
"""


def main() -> None:
    script_text = read_text(SCRIPT)
    version_history = read_text(VERSION_HISTORY)
    current_version = extract_script_version(script_text)
    recent_versions = extract_latest_versions(version_history, limit=8)
    content = build_content(current_version, recent_versions)
    OUTPUT.write_text(content.rstrip() + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.name}")


if __name__ == "__main__":
    main()
