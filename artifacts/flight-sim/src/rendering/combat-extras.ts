import type { CombatExtras, Point } from "../combat-extras";

export function drawCombatExtras(ctx: CanvasRenderingContext2D, state: CombatExtras, player: Point, magnetTarget: Point): void {
  ctx.save();
  ctx.lineCap = "round";
  if (state.trail) {
    const { from, to, life } = state.trail;
    ctx.globalAlpha = Math.min(1, life / 30);
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = "#f9731644"; ctx.lineWidth = 36; ctx.stroke();
    ctx.strokeStyle = "#ff7b29"; ctx.lineWidth = 14; ctx.stroke();
    ctx.strokeStyle = "#ffe099"; ctx.lineWidth = 4; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (state.magnet > 0 || state.chaos === "magnet") {
    ctx.strokeStyle = "#c4b5fd77"; ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath(); ctx.arc(magnetTarget.x, magnetTarget.y, 260, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(magnetTarget.x, magnetTarget.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(magnetTarget.x, magnetTarget.y, 16, 0, Math.PI * 2); ctx.stroke();
  }
  if (state.parry > 0 || state.dashProtection > 0 || state.charged > 0) {
    ctx.strokeStyle = state.parry > 0 ? "#ffffff" : state.charged > 0 ? "#67e8f9" : "#a78bfa";
    ctx.lineWidth = state.parry > 0 ? 4 : 2;
    ctx.beginPath(); ctx.ellipse(player.x, player.y, 37, 27, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (state.pulse) {
    ctx.globalAlpha = Math.min(1, state.pulse.life / 18);
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(state.pulse.x, state.pulse.y, 230 * (1 - state.pulse.life / 36), 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
