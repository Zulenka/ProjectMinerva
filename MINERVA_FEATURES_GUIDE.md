# Minerva Features Guide

Minerva is a Torn userscript that helps you monitor player activity and manage a small target list in a clean, visual way.

This guide is written in plain language and avoids technical details.

## What Minerva Helps You Do

- Watch a player's recent activity
- Track multiple targets manually
- See status updates in one place
- Get quick alerts when something changes
- Launch fast actions (like attack) from the tracker

## Main Profile Panel

Minerva shows a panel on profile pages.

The panel gives you:

- A status display
- A countdown to the next check
- Settings and controls

On your own profile page, settings can be opened from the gear button so the main panel stays cleaner.

## Status Display

Minerva shows a status at the top of the panel.

Common statuses include:

- ACTIVE
- INACTIVE
- NO TARGETS
- NO API KEY
- ACTIVITY UNAVAILABLE

These tell you whether Minerva is currently able to check activity and what it sees for the current target.

## Next Ping Countdown

Minerva checks on a timer.

- The countdown shows when the next automatic check will happen.
- You can also use manual ping buttons for immediate checks.

## Target List Is Manual

Minerva does not automatically add every profile you visit.

You choose who gets tracked.

Use:

- Track Current
- Untrack Current

This keeps your tracked list intentional and easy to manage.

## Settings (Easy Overview)

Minerva settings are designed to be simple and practical.

### Inactive Threshold

This controls how recent activity is treated.

Example:

- If your threshold is 5 minutes, a player who was active very recently may still show as ACTIVE.

### Max Tracked

This controls how many targets Minerva keeps in your tracked list.

If the list gets too large, older entries may be pushed out based on your current limit.

## Main Panel Buttons

Minerva includes quick controls in the settings area.

- Track Current / Untrack Current: Add or remove the profile you are viewing
- Reset API Key: Replace your stored Torn API key
- View Toast: Show a preview popup so you can test placement
- Clear Tracked: Clear the tracked list (keeps the current profile)
- Clear: Clear the Minerva on-screen log
- Show Logs: Open or close the log panel

## Corner Widget (Floating Tracker)

Minerva also includes a floating corner widget that stays available across Torn pages.

This lets you monitor tracked targets even when you are not on a profile page.

### What the Corner Widget Shows

- Overall Minerva status
- Your current threshold
- A stacked list of tracked profiles
- A cooldown indicator when manual ping is limited

## Corner Widget Controls

The corner widget has small controls for layout and convenience.

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
- Last activity text (for example: "2 minutes ago")

### Row Actions

Each tracked row includes quick buttons:

- Ping Now: Check that target immediately
- Attack: Open the attack page in a new tab
- Remove: Remove that target from the tracked list

## Status Labels in the Tracked List

Minerva separates "recent activity" from "time since last seen" so the list is easier to read for timing.

You may see labels like:

- ACTIVE
- INACTIVE <5m
- INACTIVE 5m+

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

It also includes an "Open API Page" button to help you get to Torn's settings page.

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

The log is meant to be readable and useful without needing to inspect browser developer tools.

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
3. Click Track Current.
4. Set your preferred inactive threshold.
5. Use the corner widget to watch your tracked targets.

## Summary

Minerva is built to be:

- Manual (you choose who is tracked)
- Fast (quick row actions and pings)
- Visual (clear statuses and toasts)
- Flexible (movable widget and toast)
- Practical (works across Torn pages and different profile layouts)

