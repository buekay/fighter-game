type Body = { x: number; y: number; width: number; height: number };
type Shot = { x: number; y: number; vx: number; vy: number; fromPlayer: boolean };
export type TitanTactic = "approach" | "flank" | "pressure" | "evade" | "recover";
export interface TitanTactics {
  action: TitanTactic;
  remaining: number;
  evadeCooldown: number;
  targetX: number;
  targetY: number;
  side: number;
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export function steerTitan(body: Body, target: { x: number; y: number }, targetVelocityY: number,
  hpRatio: number, bullets: readonly Shot[], dt: number, width: number, height: number,
  previous?: TitanTactics) {
  const phase = hpRatio <= .3 ? 3 : hpRatio <= .6 ? 2 : 1;
  const state = previous ?? { action: "approach", remaining: 0, evadeCooldown: 0,
    targetX: body.x, targetY: body.y, side: body.y < height / 2 ? 1 : -1 };
  state.remaining -= dt;
  state.evadeCooldown = Math.max(0, state.evadeCooldown - dt);
  if (state.remaining <= 0) {
    const center = body.y + body.height / 2;
    let nearest = 36;
    let dangerY: number | undefined;
    // One allocation-free scan per decision, never a sort per animation frame.
    if (state.evadeCooldown <= 0) for (const shot of bullets) {
      if (!shot.fromPlayer || shot.vx <= .5) continue;
      const arrival = (body.x - shot.x) / shot.vx;
      const projectedY = shot.y + shot.vy * arrival;
      if (arrival > 4 && arrival < nearest && Math.abs(projectedY - center) < body.height / 2 + 12) {
        nearest = arrival; dangerY = projectedY;
      }
    }
    const leadY = target.y + clamp(targetVelocityY * (phase === 1 ? 14 : 23), -65, 65);
    if (dangerY !== undefined) {
      state.action = "evade";
      let direction = dangerY >= center ? -1 : 1;
      if (body.y < 65) direction = 1;
      if (body.y + body.height > height - 65) direction = -1;
      state.targetY = body.y + direction * 95;
      state.targetX = body.x + 18;
      state.remaining = 42;
      state.evadeCooldown = 150;
    } else if (state.action === "pressure") {
      state.action = "recover";
      state.targetX = width - body.width - 32;
      state.targetY = leadY - body.height / 2 + state.side * 65;
      state.remaining = phase === 3 ? 65 : 100;
    } else if (state.action === "flank") {
      state.action = "pressure";
      state.targetX = width * (phase === 3 ? .51 : .59);
      state.targetY = leadY - body.height / 2;
      state.remaining = phase === 3 ? 85 : 110;
    } else {
      state.action = "flank";
      state.side *= -1;
      state.targetX = width - body.width - 65;
      state.targetY = leadY - body.height / 2 + state.side * (phase === 1 ? 100 : 135);
      state.remaining = phase === 3 ? 65 : 95;
    }
    state.targetX = clamp(state.targetX, width * .5, width - body.width - 16);
    state.targetY = clamp(state.targetY, 28, height - body.height - 28);
  }
  const speed = state.action === "evade" ? 3.6 : phase === 3 ? 3.1 : 2.5;
  return { state, vx: clamp((state.targetX - body.x) * .035, -speed, speed),
    vy: clamp((state.targetY - body.y) * .045, -speed, speed) };
}
