# Minerva Features Guide

Minerva is a Torn userscript that helps you monitor player activity and manage a small target list in a clean, visual way.

This guide is written in plain language and focuses on what Minerva does in day-to-day use.

## What Minerva Helps You Do

- Watch a player's recent activity
- Track multiple targets manually
- See status updates in one place
- Get quick alerts when something changes
- Launch fast actions (like attack) from the tracker

## Main Profile Panel

Minerva shows a panel on Torn profile pages.

The panel gives you:

- A status display
- A countdown to the next automatic check
- Settings and quick controls
- A built-in log panel (optional)

On your own profile page, Minerva keeps the main panel cleaner by moving settings into a gear popup.

## Status Display

Minerva shows a status at the top of the panel so you can see the current state at a glance.

Common statuses include:

- `ACTIVE`
- `INACTIVE`
- `NO TARGETS`
- `NO API KEY`
- `ACTIVITY UNAVAILABLE`
- `API TIMEOUT`
- `NETWORK ERROR`

These tell you whether Minerva is actively checking, whether the current target appears recently active, or whether something needs your attention.

## Next Ping Countdown

Minerva checks on a timer.

- The countdown shows when the next automatic check will happen
- You can still run manual checks at any time using row buttons in the corner widget

## Target List Is Manual

Minerva does **not** automatically add every profile you visit.

You choose who gets tracked using:

- `Track Current`
- `Untrack Current`

This keeps your list intentional and avoids clutter.

## Settings (Easy Overview)

Minerva keeps settings simple and practical.

### Inactive Threshold

This controls how Minerva treats recent activity.

Example:

- If your threshold is `5 minutes`, someone who was active very recently may still appear as `ACTIVE` in the main status

### Max Tracked

This controls how many targets Minerva keeps in your tracked list.

If the list gets too large, Minerva trims it to your selected limit.

## Main Panel Buttons

Minerva includes quick controls in the settings area.

- `Track Current / Untrack Current` - Add or remove the profile you are viewing
- `Reset API Key` - Replace your stored Torn API key
- `View Toast` - Show a preview popup so you can test toast placement
- `Clear Tracked` - Clear the tracked list (keeps the current profile)
- `Clear` - Clear the Minerva on-screen log
- `Show Logs` - Open or close the log panel

## Corner Widget (Floating Tracker)

Minerva includes a floating corner widget that stays available across Torn pages.

This lets you monitor tracked targets even when you are not currently on a profile page.

### What the Corner Widget Shows

- Overall Minerva status
- Your current threshold
- A stacked list of tracked profiles
- A manual ping cooldown indicator (when active)

### Corner Widget Controls

The widget includes small controls for layout and convenience.

- Lock / Unlock position
- Compact / Expand view
- Hide widget
- Reopen hidden widget from the small Minerva tab

You can move the widget and Minerva remembers where you placed it.

## Tracked Profile Rows

Each tracked target appears as a row in the corner widget.

Each row shows:

- Name (or ID)
- Status
- Last activity text (for example, `2 minutes ago`)

### Row Actions

Each row includes quick action buttons:

- `↻` Ping Now - Check that target immediately
- `⚔` Attack - Open the attack page in a new tab
- `x` Remove - Remove that target from the tracked list

## Status Labels in the Tracked List

Minerva separates "recent activity" from "time since last seen" so the list is easier to read when timing matters.

You may see labels like:

- `ACTIVE`
- `INACTIVE <5m`
- `INACTIVE 5m+`

This is especially useful if you care about short activity windows.

## Manual Ping Cooldown (Anti-Spam Protection)

Minerva limits repeated manual ping clicks in a short period.

If you click too many times too quickly:

- Ping buttons are temporarily disabled
- A cooldown badge appears in the corner widget

This helps prevent accidental spam and keeps the tracker stable.

## Notifications and Toasts

Minerva can notify you when tracked status changes happen.

### In-Page Toasts

When you are actively using Torn:

- Minerva shows a popup toast on the page
- The toast can be closed
- The toast position can be moved
- Minerva remembers the toast position

### Background Notifications

When the Torn tab is not active:

- Minerva tries browser notifications first
- If needed, it falls back to Tampermonkey notifications

Minerva also spaces out alerts so you do not get flooded.

## API Key and Passphrase (Simple Explanation)

Minerva needs a Torn API key to read player activity.

### API Key Entry

Minerva uses its own popup window for entering and updating your API key.

It also includes an `Open API Page` button to help you get to Torn's settings page.

### Encrypted Key Storage

Minerva can store your API key in an encrypted vault.

- You create a Minerva passphrase
- Minerva asks for it again every 7 days to unlock the key

### Forgot Passphrase

If you forget your passphrase, Minerva lets you reset the stored vault and enter a new API key and passphrase.

## Logs (Troubleshooting)

Minerva includes a built-in log panel.

This helps when:

- Minerva does not appear on a page
- Activity is not being returned
- Requests fail
- You want to confirm what Minerva is doing

The log is meant to be readable and useful without needing browser developer tools.

## Works Across Different Profile Layouts

Torn profile pages do not always use the same layout.

Minerva tries several ways to place its panel:

- Known profile locations
- Fallback anchor points
- Dynamic layout matching
- Generic fallback placement

This helps Minerva keep working when Torn changes page structure.

## Quick Start

1. Open a Torn profile page.
2. Enter your API key when Minerva asks.
3. Click `Track Current`.
4. Set your preferred inactive threshold.
5. Use the corner widget to watch your tracked targets.

## Summary

Minerva is built to be:

- Manual (you choose who is tracked)
- Fast (quick row actions and pings)
- Visual (clear statuses and toasts)
- Flexible (movable widget and toast)
- Practical (works across Torn pages and different profile layouts)

---

For implementation details, architecture, and code-level behavior, see [README.md](README.md).