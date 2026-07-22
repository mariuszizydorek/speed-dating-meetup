# Handoff delta — since last export

This package contains **only what changed** since the previous handoff zip. Drop these files over the earlier package (same filenames) and read the changes below.

## Files in this delta
- `Speed Networking Scheduler.dc.html` — updated (Terminal theme)
- `Speed Networking Scheduler v2.dc.html` — updated (Modern theme, light/dark)

Both files remain feature-identical; only the skin differs.

## What changed since last export

### 1. Two workspaces (top-level "spaces")
The 4-tab nav (Setup / Schedule / Print / Run) is replaced by a **space switch** + contextual sub-tabs:
- A segmented control in the header: **Prepare** and **Run event**.
- **Prepare** space shows the three management sub-tabs — **Setup (01) / Schedule (02) / Print (03)**.
- **Run event** space hides all management chrome so only the live-event UI is on screen (intended for projecting on the day).
- "Start event" (Print) switches to the Run space; the **Prepare** button returns to whichever management tab was last open (`state.lastPrep`, default `setup`).
- Implementation: `state.page` is still one of `setup|schedule|print|run`; the space is derived (`inRun = page==='run'`). New render outputs: `spaceItems` (segmented control), `spacePrepare` (bool gating the sub-tabs), `navItems` now only the 3 management tabs.

### 2. Per-round icebreakers are now editable (was a fixed list)
- New **Icebreakers** editor on the Setup (Prepare) page: one text field per round, pre-filled with the built-in defaults.
- **Blank field = no prompt that round** (the Run banner hides for that round).
- **Reset to defaults** restores the built-in set.
- Stored on the project as `params.icebreakers: (string|null)[]` (index = round; `null`/absent = use default `ICEBREAKERS[i % len]`; `''` = intentionally blank). Persists with the project; cosmetic only (does not invalidate the schedule).
- Run page reads the effective per-round value instead of the fixed cycle. New helpers in the logic class: `setIcebreaker(i, val)`, `resetIcebreakers()`; new render output `icebreakerRows`.

## README / spec impact
The main handoff `README.md` from the previous zip is still accurate except:
- **Navigation** section: replace the "4-step flow" description with the two-space model above (Prepare = Setup/Schedule/Print; Run event = live only).
- **State Management**: add `params.icebreakers` and `state.lastPrep`.
- **Run page**: icebreaker text now comes from `params.icebreakers` (per-round, blank-able), not the hardcoded `ICEBREAKERS` array (which is now only the default seed).

No changes to the domain model, scheduler algorithm, design tokens, or the other features documented previously.
