---
name: Fighter Jet Game Architecture
description: Key architecture decisions and quirks for the Fighter Command flight-sim artifact
---

All game logic lives in `artifacts/flight-sim/src/pages/Game.tsx` (~2000+ lines).

**Constants placement:** Virtual controls constants (JOY_BASE_R, FIRE_BTN_*, ULTI_BTN_*, LASER_BTN_*, STEALTH_MAX, etc.) are defined near line 1790 — AFTER all the React component code. Do not move them earlier (referenced inside the game loop useCallback).

**drawHUD signature:** `drawHUD(ctx, gs, ultimaCharge, ultimaActive, laserCharge, laserActive, stealthCharge, stealthActive)` — 8 params. Any new ult bar needs both the function signature and the call site updated.

**Why:** All game state is in refs (stateRef, bulletsRef, enemiesRef, etc.) and the canvas loop is a single RAF callback. React state (displayState) is synced via `syncDisplay()` every 30 frames and on significant events.

**How to apply:** When adding new ultimates or charge bars, follow the pattern: add ref + constant, charge in loop, key handler, HUD drawUltBar call, and update the drawHUD call site.

**Storage keys:** all prefixed `fighter-command-*`. Name=`fighter-command-name`, bullet color=`fighter-command-bcolor`, coins=`fighter-command-coins`, skin=`fighter-command-skin`, unlocks=`fighter-command-unlocks`, highscore=`fighter-command-hs`.

**Enemy types:** scout | fighter | bomber | boss | interceptor | gunship. Each needs a case in the drawEnemy switch.

**Skin costs:** Steel=free, standard skins=25k, Galaxy/Neon/Arctic/Lava=30k, X-Wing=40k. handleUnlockSkin and handleBuy use actual item/skin cost (not hardcoded).

**Admin code:** "buelli-best 1" → setCoinsAbsolute(99999999) + unlockAll(). Accessible via hidden "···" button in HangarOverlay bottom-right.
