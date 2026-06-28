---
name: Fighter Jet feature set
description: Key decisions and patterns from the large feature batch (skins, ultis, enemies, upgrades, leaderboard)
---

## Ulti system pattern
All three ultis (clone/laser/stealth) + heal follow the same pattern:
- `<name>ChargeRef` (useRef) charges at 0.10/frame, boosted by `ulti_boost` unlock
- `<name>ActiveRef` counts down from DURATION
- Constants: `<NAME>_MAX`, `<NAME>_DURATION` (all set to 600 frames = 10s, except HEAL_DURATION=120)
- Virtual button: `<NAME>_BTN_X/Y/R` constants, drawn in `drawVirtualControls`
- Key binding in keyboard handler, touch binding in onTouchStart

## HUD bar layout (top strip, 82px)
drawUltBar calls at y=43 (CLONE), y=53 (LASER), y=63 (STEALTH), y=74 (HEAL).

## Virtual buttons layout (CANVAS 900×600)
- FIRE: (820, 510), ULTI: (690, 510)
- LASER: (820, 405), STEALTH: (690, 405), HEAL: (560, 405)

## New shop items and their effects
Applied in startGame (not runtime):
- `max_hp`: baseMaxHp = 15 (vs 10 default)
- `speed_item`: baseSpeed += 0.5
Applied at runtime:
- `armor`: damage × 0.5 (both bullet-player and enemy-player collision)
- `heal_ulti`: enables HEAL bar + H key
- `stealth_ulti`: enables STEALTH bar + R key

## N-1 Starfighter (skin id="n1") passive
- n1ShieldTimerRef counts up; at 1200 frames (20s) triggers shieldTimerRef=180 (3s shield)
- Speed: × 1.15 multiplier in movement code
- Cost: 80k coins

## Leaderboard
- localStorage key: "fighter-command-lb"
- `addLeaderboardEntry(name, score)` called on game over (both collision paths)
- `loadLeaderboard()` returns sorted array of {name, score, ts}
- LeaderboardScreen component in HangarOverlay, view="leaderboard" state

## Enemy types and spawning thresholds
level 3+: boss (every bossInterval), level 7+: gunship (10%), level 10+: tiefighter (17%), level 5+: interceptor (28%), level 4+: bomber, level 2+: fighter, else scout.

**Why:** tiefighter check comes AFTER gunship but BEFORE interceptor in the else-if chain; roll thresholds add up.

## TIE Fighter enemies dodge every 3s (180 frames); fighters dodge every 8s (480 frames) at level 8+
The dodge logic uses `e.tieDodgeTimer / e.fighterDodgeTimer` refs on each Enemy object (optional fields).
