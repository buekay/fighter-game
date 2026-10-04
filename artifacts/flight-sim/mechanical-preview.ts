import { getBiomeEnemyDefinition, BIOMES } from "/src/biomes";
import { drawEncounterBoss } from "/src/rendering/encounter-bosses";
import { getBossPhase } from "/src/game-enhancements";
const isBossEnemy = (e) => ["boss", "overlord", "titan"].includes(e.type);
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, reducedMotion = false) {
  if (e.encounterKind && e.encounterKind !== "titan") {
    drawEncounterBoss(ctx, e, reducedMotion ? 0 : performance.now());
    return;
  }
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
  ctx.rotate(Math.PI); // facing left
  const visualScale = e.type === "titan" ? 1.28 : e.type === "overlord" ? 1.25 : e.type === "boss" ? 1.14 : e.type === "gunship" || e.type === "sentinel" ? 1.14 : 1.22;
  ctx.scale(visualScale, visualScale);

  const trim = e.isGolden ? "#c4a46b" : e.type === "emeraldtiefighter" ? "#82917a" : "#a4b3bc";
  const now = reducedMotion ? 0 : performance.now();
  const pulse = 0.72 + Math.sin(now * 0.009 + e.x * 0.03) * 0.18;
  const roleColor = e.archetype === "healer" ? "#82917a" : e.archetype === "shield" ? "#a4b3bc" :
    e.archetype === "kamikaze" ? "#b5674e" : null;
  const hullGradient = () => {
    const gradient = ctx.createLinearGradient(0, -e.height / 2, 0, e.height / 2);
    gradient.addColorStop(0, e.isGolden ? "#d2ba83" : "#a4b0b7");
    gradient.addColorStop(.18, e.isGolden ? "#8c7448" : "#596974");
    gradient.addColorStop(.48, e.isGolden ? "#57472e" : "#303c45");
    gradient.addColorStop(.72, e.isGolden ? "#b49a62" : "#788790");
    gradient.addColorStop(1, "#182127");
    return gradient;
  };
  const drawEngine = (x: number, y: number, size: number) => {
    ctx.save();
    ctx.shadowBlur = 0;
    const flame = ctx.createLinearGradient(x - size * 1.3, y, x, y);
    flame.addColorStop(0, "#b5674e00");
    flame.addColorStop(.7, "#b8874f88");
    flame.addColorStop(1, "#e3cf9d");
    ctx.beginPath();
    ctx.moveTo(x, y - size * .25);
    ctx.lineTo(x - size * (.8 + pulse * .35), y);
    ctx.lineTo(x, y + size * .25);
    ctx.closePath(); ctx.fillStyle = flame; ctx.fill();
    ctx.fillStyle = "#27313a"; ctx.strokeStyle = "#8e9ba3"; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.roundRect(x - 2, y - size * .42, size * .65, size * .84, 1);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#10181e"; ctx.fillRect(x - 2, y - size * .3, 2, size * .6);
    ctx.restore();
  };
  const drawPanelLine = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = "#ffffff3d"; ctx.lineWidth = 0.8; ctx.stroke();
  };

  // Every enemy gets a readable propulsion signature, even against dark backgrounds.
  if (e.type === "titan") {
    drawEngine(-61, -35, 15); drawEngine(-61, 0, 12); drawEngine(-61, 35, 15);
  } else if (e.type === "overlord") {
    drawEngine(-43, -26, 12); drawEngine(-43, 26, 12);
  } else if (e.type === "boss" && !e.bossEngineDisabled) {
    drawEngine(-29, -18, 9); drawEngine(-29, 18, 9);
  } else if (e.type === "bomber" || e.type === "gunship" || e.type === "sentinel") {
    drawEngine(-22, -8, 7); drawEngine(-22, 8, 7);
  } else if (e.type !== "tiefighter" && e.type !== "emeraldtiefighter") {
    drawEngine(-14, 0, 7);
  }

  ctx.shadowColor = e.isGolden ? "#b69a66" : trim;
  ctx.shadowBlur = 0;

  switch (e.type) {
    case "biome": {
      const definition = getBiomeEnemyDefinition(e.biomeEnemyId);
      const body = "#596974";
      const accent = trim;
      const visual = definition?.visual ?? "interceptor";
      const outline = "#ffffff88";
      ctx.lineJoin = "round";

      if (visual === "tank") {
        // Local Y is inverted by the enemy-facing rotation above.
        ctx.fillStyle = "#161e24";
        ctx.beginPath(); ctx.roundRect(-25, -15, 48, 12, 6); ctx.fill();
        for (let x = -18; x <= 16; x += 11) {
          ctx.beginPath(); ctx.arc(x, -9, 4, 0, Math.PI * 2); ctx.fillStyle = "#394650"; ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(-22, -3); ctx.lineTo(-15, 10); ctx.lineTo(14, 10); ctx.lineTo(24, 1); ctx.lineTo(18, -4); ctx.closePath();
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
        ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-5, 8, 22, 10, 4); ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(11, 12, 25, 4);
        ctx.beginPath(); ctx.arc(2, 13, 3, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
      } else if (visual === "ship" || visual === "submarine") {
        ctx.beginPath();
        if (visual === "ship") {
          ctx.moveTo(31, -4); ctx.lineTo(20, -16); ctx.lineTo(-28, -15); ctx.lineTo(-34, -4); ctx.closePath();
        } else {
          ctx.ellipse(0, -4, 34, 13, 0, 0, Math.PI * 2);
        }
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
        ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-10, 0, 24, 11, 3); ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(3, 21); ctx.lineTo(10, 21); ctx.stroke();
        ctx.fillStyle = accent; ctx.fillRect(12, 5, visual === "ship" ? 22 : 13, 3);
        if (visual === "ship") {
          ctx.fillStyle = "#dff8ff"; ctx.fillRect(-6, 4, 5, 4); ctx.fillRect(2, 4, 5, 4);
        }
      } else if (visual === "helicopter") {
        ctx.beginPath(); ctx.ellipse(4, 0, 23, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-37, 8); ctx.lineTo(-38, 2); ctx.lineTo(-14, -4); ctx.closePath();
        ctx.fillStyle = body; ctx.fill();
        ctx.strokeStyle = accent; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 19); ctx.moveTo(-28, 7); ctx.lineTo(-34, 15); ctx.moveTo(-34, 7); ctx.lineTo(-28, 15); ctx.stroke();
        ctx.strokeStyle = "#d9f7ff"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-31, 19); ctx.lineTo(31, 19); ctx.stroke();
        ctx.fillStyle = accent; ctx.fillRect(18, -2, 17, 3);
      } else if (visual === "drone") {
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(-2, side * 17, 21, 7, 0, 0, Math.PI * 2);
          ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = accent; ctx.stroke();
          ctx.beginPath(); ctx.arc(5, side * 17, 3, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(9, 0, 5 + pulse, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
      } else if (visual === "crawler") {
        ctx.beginPath();
        ctx.moveTo(24, 0); ctx.lineTo(12, 12); ctx.lineTo(-17, 10); ctx.lineTo(-26, 0); ctx.lineTo(-14, -8); ctx.lineTo(14, -8); ctx.closePath();
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
        ctx.strokeStyle = body; ctx.lineWidth = 5;
        for (const x of [-16, -2, 12]) {
          ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x - 7, -18); ctx.lineTo(x + 1, -21); ctx.stroke();
        }
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(10, 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(14, 0, 17, 3);
      } else if (visual === "skimmer") {
        ctx.beginPath();
        ctx.moveTo(31, 1); ctx.lineTo(16, 11); ctx.lineTo(-22, 9); ctx.lineTo(-31, -3); ctx.lineTo(10, -7); ctx.closePath();
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(0, 17); ctx.lineTo(14, 16); ctx.lineTo(18, 8); ctx.closePath();
        ctx.fillStyle = accent + "88"; ctx.fill();
        ctx.fillStyle = accent; ctx.fillRect(15, 3, 20, 3);
      } else if (visual === "cruiser") {
        ctx.beginPath();
        ctx.moveTo(38, 0); ctx.lineTo(14, 10); ctx.lineTo(-14, 18); ctx.lineTo(-34, 10);
        ctx.lineTo(-25, 0); ctx.lineTo(-34, -10); ctx.lineTo(-14, -18); ctx.lineTo(14, -10); ctx.closePath();
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(4, 0, 13, 7, 0, 0, Math.PI * 2); ctx.fillStyle = accent + "88"; ctx.fill();
        ctx.fillStyle = "#bbc4c8"; ctx.fillRect(28, -2, 12, 4);
        drawPanelLine(-22, -8, 18, -5); drawPanelLine(-22, 8, 18, 5);
      } else {
        ctx.beginPath();
        ctx.moveTo(29, 0); ctx.lineTo(5, -6); ctx.lineTo(-16, -18); ctx.lineTo(-10, -4);
        ctx.lineTo(-24, 0); ctx.lineTo(-10, 4); ctx.lineTo(-16, 18); ctx.lineTo(5, 6); ctx.closePath();
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = accent; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(7, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fillStyle = accent + "99"; ctx.fill();
        ctx.fillStyle = "#bbc4c8"; ctx.fillRect(20, -1.5, 14, 3);
      }
      ctx.shadowBlur = 0;
      break;
    }
    case "scout": {
      // Razor-like light fighter: split wings, armored spine and twin cannons.
      ctx.beginPath();
      ctx.moveTo(23, 0);
      ctx.lineTo(4, -6);
      ctx.lineTo(-13, -16);
      ctx.lineTo(-9, -5);
      ctx.lineTo(-18, -2);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-18, 2);
      ctx.lineTo(-9, 5);
      ctx.lineTo(-13, 16);
      ctx.lineTo(4, 6);
      ctx.closePath();
      ctx.fillStyle = hullGradient();
      ctx.fill();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath(); ctx.ellipse(5, 0, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = trim + "99"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(7, -1, 3.5, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#fff4f6"; ctx.fill();
      drawPanelLine(-10, -4, 8, 0); drawPanelLine(-10, 4, 8, 0);
      ctx.fillStyle = "#fff"; ctx.fillRect(16, -5, 9, 2); ctx.fillRect(16, 3, 9, 2);
      break;
    }
    case "fighter": {
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(-16, -12); ctx.lineTo(-22, -5); ctx.lineTo(-14, 0);
      ctx.lineTo(-22, 5); ctx.lineTo(-16, 12); ctx.closePath();
      ctx.fillStyle = hullGradient();
      ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -12); ctx.lineTo(-16, -24); ctx.lineTo(-22, -12); ctx.closePath();
      ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = trim; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 12); ctx.lineTo(-16, 24); ctx.lineTo(-22, 12); ctx.closePath();
      ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = trim; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(6, 0, 9, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = trim + "99"; ctx.fill();
      drawPanelLine(-14, -8, 10, 0); drawPanelLine(-14, 8, 10, 0);
      ctx.fillStyle = "#b69a66"; ctx.fillRect(19, -7, 6, 2); ctx.fillRect(19, 5, 6, 2);
      break;
    }
    case "bomber": {
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -18); ctx.lineTo(-28, -10); ctx.lineTo(-20, 0);
      ctx.lineTo(-28, 10); ctx.lineTo(-10, 18); ctx.closePath();
      ctx.fillStyle = hullGradient();
      ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = trim + "99"; ctx.fill();
      drawPanelLine(-18, -11, 8, -3); drawPanelLine(-18, 11, 8, 3);
      [-9, 9].forEach(y => { ctx.beginPath(); ctx.arc(12, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = "#b69a66"; ctx.fill(); });
      // Heavy ordnance pods make the bomber distinct at a glance.
      [-14, 14].forEach(y => {
        ctx.beginPath(); ctx.roundRect(-11, y - 4, 19, 8, 3);
        ctx.fillStyle = "#161e24"; ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "#b69a66"; ctx.fillRect(5, y - 1, 6, 2);
      });
      break;
    }
    case "boss": {
      ctx.beginPath();
      ctx.moveTo(40, 0); ctx.lineTo(-20, -28); ctx.lineTo(-36, -14); ctx.lineTo(-24, 0);
      ctx.lineTo(-36, 14); ctx.lineTo(-20, 28); ctx.closePath();
      ctx.fillStyle = hullGradient();
      ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, -28); ctx.lineTo(-24, -44); ctx.lineTo(-36, -28); ctx.closePath();
      ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = trim; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, 28); ctx.lineTo(-24, 44); ctx.lineTo(-36, 28); ctx.closePath();
      ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = trim; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(8, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = trim + "bb"; ctx.fill();
      ctx.beginPath(); ctx.arc(8, 0, 5 + pulse * 2, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      drawPanelLine(-24, -23, 20, -5); drawPanelLine(-24, 23, 20, 5);
      [-16, 0, 16].forEach(y => { ctx.fillStyle = "#ffedf9"; ctx.fillRect(31, y - 1.5, 8, 3); });
      // HP bar
      const barW = 64, barH = 6;
      ctx.fillStyle = "#333";
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW, barH);
      ctx.fillStyle = trim;
      ctx.fillRect(-barW / 2, -e.height / 2 - 16, barW * (e.hp / e.maxHp), barH);
      break;
    }
    case "overlord": {
      const overlordPulse = .72 + Math.sin(now * .008) * .28;
      const overlordPhase = getBossPhase(e.hp, e.maxHp);
      const accent = overlordPhase === 3 ? "#b5674e" : overlordPhase === 2 ? "#b69a66" : "#a4b3bc";
      const overlordSpectrum = ctx.createLinearGradient(-67, -50, 60, 50);
      overlordSpectrum.addColorStop(0, "#a4b3bc");
      overlordSpectrum.addColorStop(.35, "#a4b3bc");
      overlordSpectrum.addColorStop(.68, "#a4b3bc");
      overlordSpectrum.addColorStop(1, "#b69a66");
      ctx.shadowColor = accent;
      ctx.shadowBlur = 0;

      // A broad, forked command-ship silhouette with a recessed armored center.
      ctx.beginPath();
      ctx.moveTo(60, 0); ctx.lineTo(34, -13); ctx.lineTo(13, -25); ctx.lineTo(-5, -49);
      ctx.lineTo(-49, -57); ctx.lineTo(-39, -28); ctx.lineTo(-67, -13); ctx.lineTo(-48, 0);
      ctx.lineTo(-67, 13); ctx.lineTo(-39, 28); ctx.lineTo(-49, 57); ctx.lineTo(-5, 49);
      ctx.lineTo(13, 25); ctx.lineTo(34, 13); ctx.closePath();
      const hull = ctx.createLinearGradient(-65, -48, 58, 36);
      hull.addColorStop(0, "#161e24"); hull.addColorStop(.32, "#394650");
      hull.addColorStop(.58, "#161e24"); hull.addColorStop(1, "#161e24");
      ctx.fillStyle = hull; ctx.fill();
      ctx.strokeStyle = overlordSpectrum; ctx.lineWidth = 3; ctx.stroke();

      // Mirrored armor plates add depth and make the split wings readable.
      [-1, 1].forEach(side => {
        const wingAccent = "#a4b3bc";
        const plate = ctx.createLinearGradient(-45, side * 48, 25, side * 12);
        plate.addColorStop(0, "#394650");
        plate.addColorStop(.5, "#161e24"); plate.addColorStop(1, wingAccent + "66");
        ctx.beginPath();
        ctx.moveTo(29, side * 11); ctx.lineTo(4, side * 26); ctx.lineTo(-10, side * 45);
        ctx.lineTo(-43, side * 49); ctx.lineTo(-30, side * 27); ctx.lineTo(-8, side * 17); ctx.closePath();
        ctx.fillStyle = plate; ctx.fill(); ctx.strokeStyle = "#a4b3bc88"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-35, side * 43); ctx.lineTo(-4, side * 33); ctx.lineTo(24, side * 13);
        ctx.strokeStyle = wingAccent; ctx.lineWidth = 1.6; ctx.stroke();

        // Heavy outer cannons sit in armored pods instead of floating dots.
        ctx.beginPath(); ctx.roundRect(27, side * 24 - 6, 26, 12, 5);
        ctx.fillStyle = "#161e24"; ctx.fill();
        ctx.strokeStyle = wingAccent; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#a4b3bc"; ctx.fillRect(48, side * 24 - 2, 12, 4);
      });

      // Raised command spine and layered turbine housings.
      ctx.beginPath(); ctx.moveTo(-47, 0); ctx.lineTo(-12, -15); ctx.lineTo(38, -9);
      ctx.lineTo(55, 0); ctx.lineTo(38, 9); ctx.lineTo(-12, 15); ctx.closePath();
      const spine = ctx.createLinearGradient(-45, 0, 55, 0);
      spine.addColorStop(0, "#161e24"); spine.addColorStop(.36, "#394650");
      spine.addColorStop(.7, "#394650"); spine.addColorStop(1, "#161e24");
      ctx.fillStyle = spine; ctx.fill(); ctx.strokeStyle = "#d8f7ff99"; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(12, 0, 17, 0, Math.PI * 2); ctx.fillStyle = "#161e24"; ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 0, 10 + overlordPulse * 2.5, 0, Math.PI * 2);
      const reactor = ctx.createRadialGradient(9, -3, 1, 12, 0, 12);
      reactor.addColorStop(0, "#ffffff"); reactor.addColorStop(.2, "#b69a66");
      reactor.addColorStop(.48, "#a4b3bc"); reactor.addColorStop(.74, "#a4b3bc"); reactor.addColorStop(1, "#a4b3bc11");
      ctx.fillStyle = reactor; ctx.fill();
      ctx.beginPath(); ctx.arc(50, 0, 5, 0, Math.PI * 2); ctx.fillStyle = "#b69a66"; ctx.fill();

      ctx.shadowBlur = 0;
      const barW = 112, barH = 7;
      ctx.fillStyle = "#161e24"; ctx.fillRect(-barW / 2, -e.height / 2 - 17, barW, barH);
      const hpGradient = ctx.createLinearGradient(-barW / 2, 0, barW / 2, 0);
      hpGradient.addColorStop(0, "#a4b3bc"); hpGradient.addColorStop(.45, "#a4b3bc");
      hpGradient.addColorStop(.75, "#a4b3bc"); hpGradient.addColorStop(1, "#b69a66");
      ctx.fillStyle = hpGradient; ctx.fillRect(-barW / 2, -e.height / 2 - 17, barW * (e.hp / e.maxHp), barH);
      ctx.strokeStyle = "#ffffff88"; ctx.lineWidth = 1; ctx.strokeRect(-barW / 2, -e.height / 2 - 17, barW, barH);
      break;
    }
    case "titan": {
      const phase = e.hp / e.maxHp <= .3 ? 3 : e.hp / e.maxHp <= .6 ? 2 : 1;
      const titanPulse = .65 + Math.sin(now * .012) * .35;
      const phaseColor = phase === 3 ? "#b5674e" : phase === 2 ? "#b69a66" : "#a4b3bc";
      const titanSecondary = phase === 3 ? "#b5674e" : "#a4b3bc";
      const titanTertiary = phase === 3 ? "#a4b3bc" : phase === 2 ? "#b69a66" : "#a4b3bc";
      const titanSpectrum = ctx.createLinearGradient(-76, -70, 78, 65);
      titanSpectrum.addColorStop(0, titanSecondary);
      titanSpectrum.addColorStop(.42, titanTertiary);
      titanSpectrum.addColorStop(.72, phaseColor);
      titanSpectrum.addColorStop(1, "#b69a66");
      ctx.shadowColor = phaseColor; ctx.shadowBlur = 0;

      // Crown-like dreadnought silhouette, wider and more imposing than the Overlord.
      ctx.beginPath();
      ctx.moveTo(78, 0); ctx.lineTo(46, -15); ctx.lineTo(22, -31); ctx.lineTo(7, -58);
      ctx.lineTo(-42, -76); ctx.lineTo(-35, -42); ctx.lineTo(-76, -28); ctx.lineTo(-55, 0);
      ctx.lineTo(-76, 28); ctx.lineTo(-35, 42); ctx.lineTo(-42, 76); ctx.lineTo(7, 58);
      ctx.lineTo(22, 31); ctx.lineTo(46, 15); ctx.closePath();
      const titanHull = ctx.createLinearGradient(-75, -65, 75, 55);
      titanHull.addColorStop(0, "#161e24");
      titanHull.addColorStop(.3, "#394650");
      titanHull.addColorStop(.57, "#687781");
      titanHull.addColorStop(.78, "#394650");
      titanHull.addColorStop(1, "#161e24");
      ctx.fillStyle = titanHull; ctx.fill(); ctx.strokeStyle = "#9baeb8"; ctx.lineWidth = 1.5; ctx.stroke();

      // Layered mirrored armor, reinforced fins and phase markings.
      [-1, 1].forEach(side => {
        const plateAccent = side < 0 ? titanSecondary : titanTertiary;
        ctx.beginPath();
        ctx.moveTo(37, side * 16); ctx.lineTo(9, side * 34); ctx.lineTo(-4, side * 57);
        ctx.lineTo(-38, side * 68); ctx.lineTo(-27, side * 39); ctx.lineTo(1, side * 25); ctx.closePath();
        const armor = ctx.createLinearGradient(-38, side * 66, 37, side * 16);
        armor.addColorStop(0, side < 0 ? "#394650" : "#687781");
        armor.addColorStop(.5, "#161e24"); armor.addColorStop(1, "#394650");
        ctx.fillStyle = armor; ctx.fill(); ctx.strokeStyle = "#ffffff99"; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-31, side * 61); ctx.lineTo(-1, side * 43); ctx.lineTo(31, side * 18);
        ctx.strokeStyle = plateAccent; ctx.lineWidth = phase >= 2 ? 2.4 : 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-35, side * 69); ctx.lineTo(-17, side * (phase === 3 ? 89 : 82));
        ctx.lineTo(3, side * 58); ctx.closePath(); ctx.fillStyle = plateAccent + "44"; ctx.fill();
        ctx.strokeStyle = plateAccent; ctx.lineWidth = 2; ctx.stroke();
      });

      // Central armor spine and a bolted turbine housing.
      ctx.beginPath(); ctx.moveTo(-56, 0); ctx.lineTo(-15, -20); ctx.lineTo(53, -13);
      ctx.lineTo(73, 0); ctx.lineTo(53, 13); ctx.lineTo(-15, 20); ctx.closePath();
      ctx.fillStyle = "#161e24"; ctx.fill(); ctx.strokeStyle = titanSpectrum; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 0, 25, 0, Math.PI * 2); ctx.fillStyle = "#161e24"; ctx.fill();
      ctx.strokeStyle = "#bbc4c8"; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 0, 18, 0, Math.PI * 2); ctx.strokeStyle = phaseColor; ctx.lineWidth = 5; ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 0, 9 + titanPulse * 4, 0, Math.PI * 2);
      const titanCore = ctx.createRadialGradient(15, -3, 1, 18, 0, 14);
      titanCore.addColorStop(0, "#ffffff"); titanCore.addColorStop(.22, "#b69a66");
      titanCore.addColorStop(.45, phaseColor); titanCore.addColorStop(.7, titanSecondary); titanCore.addColorStop(1, titanTertiary + "11");
      ctx.fillStyle = titanCore; ctx.fill();

      // Six visible gun housings with protruding barrels.
      [-31, -19, -7, 7, 19, 31].forEach((offset, index) => {
        const cannonColor = ["#a4b3bc", "#a4b3bc", "#a4b3bc", "#b69a66", "#b5674e", phaseColor][index];
        ctx.beginPath(); ctx.roundRect(47, offset - 4, 20, 8, 3);
        ctx.fillStyle = cannonColor + "33"; ctx.fill(); ctx.strokeStyle = cannonColor; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = cannonColor; ctx.fillRect(64, offset - 1.5, 13, 3);
      });

      if ((e.titanShieldTimer ?? 0) > 0) {
        ctx.beginPath();
        for (let side = 0; side < 6; side++) {
          const angle = Math.PI / 3 * side;
          const x = Math.cos(angle) * 92, y = Math.sin(angle) * 84;
          if (side === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(164,179,188,${.06 + titanPulse * .04})`; ctx.fill();
        ctx.strokeStyle = titanSpectrum; ctx.lineWidth = 4; ctx.stroke();
        ctx.setLineDash([7, 7]); ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
      const barW = 146, barH = 9;
      ctx.shadowBlur = 0; ctx.fillStyle = "#161e24"; ctx.fillRect(-barW / 2, -e.height / 2 - 20, barW, barH);
      const titanHpGradient = ctx.createLinearGradient(-barW / 2, 0, barW / 2, 0);
      titanHpGradient.addColorStop(0, titanSecondary); titanHpGradient.addColorStop(.42, titanTertiary);
      titanHpGradient.addColorStop(.72, phaseColor); titanHpGradient.addColorStop(1, "#b69a66");
      ctx.fillStyle = titanHpGradient; ctx.fillRect(-barW / 2, -e.height / 2 - 20, barW * (e.hp / e.maxHp), barH);
      ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1; ctx.strokeRect(-barW / 2, -e.height / 2 - 20, barW, barH);
      break;
    }
    case "interceptor": {
      ctx.beginPath();
      ctx.moveTo(24,0); ctx.lineTo(4,-5); ctx.lineTo(-12,-10); ctx.lineTo(-18,-3); ctx.lineTo(-8,0); ctx.lineTo(-18,3); ctx.lineTo(-12,10); ctx.lineTo(4,5);
      ctx.closePath(); ctx.fillStyle=hullGradient(); ctx.fill(); ctx.strokeStyle=trim; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,-3); ctx.lineTo(-8,-19); ctx.lineTo(-16,-15); ctx.lineTo(-11,-6); ctx.closePath();
      ctx.fillStyle="#161e24"; ctx.fill(); ctx.strokeStyle=trim; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3,3); ctx.lineTo(-8,19); ctx.lineTo(-16,15); ctx.lineTo(-11,6); ctx.closePath();
      ctx.fillStyle="#161e24"; ctx.fill(); ctx.strokeStyle=trim; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(5,0,7,3.5,0,0,Math.PI*2); ctx.fillStyle=trim+"99"; ctx.fill();
      ctx.beginPath(); ctx.ellipse(7,-.5,3,1.5,0,0,Math.PI*2); ctx.fillStyle="#edffff"; ctx.fill();
      drawPanelLine(-10, -5, 10, 0); drawPanelLine(-10, 5, 10, 0);
      ctx.fillStyle = "#dfffff"; ctx.fillRect(17, -6, 9, 2); ctx.fillRect(17, 4, 9, 2);
      break;
    }
    case "plasmawing": {
      ctx.beginPath();
      ctx.moveTo(22, 0); ctx.lineTo(-8, -7); ctx.lineTo(-24, -19); ctx.lineTo(-17, -3);
      ctx.lineTo(-17, 3); ctx.lineTo(-24, 19); ctx.lineTo(-8, 7); ctx.closePath();
      ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(3, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#bbc4c8"; ctx.shadowColor = trim; ctx.shadowBlur = 0; ctx.fill();
      drawPanelLine(-17, -11, 8, -3); drawPanelLine(-17, 11, 8, 3);
      ctx.fillStyle = trim; ctx.fillRect(16, -7, 8, 2); ctx.fillRect(16, 5, 8, 2);
      break;
    }
    case "sentinel": {
      ctx.beginPath();
      ctx.moveTo(20, 0); ctx.lineTo(5, -17); ctx.lineTo(-18, -17); ctx.lineTo(-27, 0);
      ctx.lineTo(-18, 17); ctx.lineTo(5, 17); ctx.closePath();
      ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.rect(-12, -8, 18, 16); ctx.fillStyle = trim + "66"; ctx.fill();
      drawPanelLine(-19, -12, 11, -8); drawPanelLine(-19, 12, 11, 8);
      ctx.beginPath(); ctx.arc(-3, 0, 4 + pulse, 0, Math.PI * 2); ctx.fillStyle = "#eaffff"; ctx.fill();
      [-12, 12].forEach(y => {
        ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(25, y * .72); ctx.lineTo(8, y * .5); ctx.closePath();
        ctx.fillStyle = "#161e24"; ctx.fill(); ctx.strokeStyle = trim; ctx.stroke();
      });
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath(); ctx.arc(-2, 0, 29, 0, Math.PI * 2);
        ctx.strokeStyle = "#a4b3bc88"; ctx.lineWidth = 2; ctx.stroke();
      }
      break;
    }
    case "gunship": {
      ctx.beginPath();
      ctx.moveTo(22,0); ctx.lineTo(-14,-20); ctx.lineTo(-32,-12); ctx.lineTo(-22,0); ctx.lineTo(-32,12); ctx.lineTo(-14,20);
      ctx.closePath(); ctx.fillStyle=hullGradient(); ctx.fill(); ctx.strokeStyle=trim; ctx.lineWidth=2.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(4,0,8,5,0,0,Math.PI*2); ctx.fillStyle=trim+"99"; ctx.fill();
      drawPanelLine(-21, -14, 10, -4); drawPanelLine(-21, 14, 10, 4);
      [-11, 11].forEach(y => { ctx.fillStyle = "#b69a66"; ctx.fillRect(17, y - 2, 8, 4); });
      [-15, 15].forEach(y => {
        ctx.beginPath(); ctx.arc(-7, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#161e24"; ctx.fill(); ctx.strokeStyle = trim; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#fff3db"; ctx.fillRect(-3, y - 1.5, 15, 3);
      });
      const bW=e.width*0.8,bH=4;
      ctx.fillStyle="#333"; ctx.fillRect(-bW/2,-e.height/2-8,bW,bH);
      ctx.fillStyle=trim; ctx.fillRect(-bW/2,-e.height/2-8,bW*(e.hp/e.maxHp),bH);
      break;
    }
    case "laserdevice": {
      // A stationary, heavily armored laser generator with emitters on both ends.
      const devicePulse = .65 + Math.sin(now * .018) * .35;
      ctx.shadowColor = "#b5674e";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(-19, -22, 38, 44, 7);
      ctx.fillStyle = hullGradient();
      ctx.fill();
      ctx.strokeStyle = "#858b92";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#161e24";
      ctx.fillRect(-13, -15, 26, 30);
      ctx.strokeStyle = "#42474d";
      ctx.lineWidth = 1;
      ctx.strokeRect(-13, -15, 26, 30);
      [-1, 1].forEach(side => {
        const emitterY = side * 24;
        ctx.beginPath();
        ctx.moveTo(-12, emitterY - side * 8);
        ctx.lineTo(12, emitterY - side * 8);
        ctx.lineTo(8, emitterY);
        ctx.lineTo(-8, emitterY);
        ctx.closePath();
        ctx.fillStyle = "#161e24";
        ctx.fill();
        ctx.strokeStyle = "#747a80";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, emitterY, 4 + devicePulse, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#b5674e";
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#161e24";
      ctx.fill();
      ctx.strokeStyle = "#9ba1a7";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3 + devicePulse, 0, Math.PI * 2);
      ctx.fillStyle = "#b5674e";
      ctx.fill();
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, 31, 0, Math.PI * 2);
        ctx.fillStyle = "#a4b3bc12";
        ctx.fill();
        ctx.strokeStyle = "#a4b3bcbb";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const bW = e.width * .9, bH = 4;
      ctx.fillStyle = "#26282c";
      ctx.fillRect(-bW / 2, -e.height / 2 - 9, bW, bH);
      ctx.fillStyle = "#b5674e";
      ctx.fillRect(-bW / 2, -e.height / 2 - 9, bW * (e.hp / e.maxHp), bH);
      break;
    }
    case "tiefighter":
    case "emeraldtiefighter": {
      const tg = trim;
      const drawEnemyHex = (cy: number) => {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i * 60 - 90) * Math.PI / 180;
          const px = -2 + 12 * Math.cos(a), py = cy + 12 * Math.sin(a);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = hullGradient(); ctx.fill(); ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, cy); ctx.lineTo(6, cy); ctx.strokeStyle = "#ffffff42"; ctx.lineWidth = 1; ctx.stroke();
      };
      drawEnemyHex(-16); drawEnemyHex(16);
      ctx.strokeStyle = tg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(-2, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, 7); ctx.lineTo(-2, 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-2, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#161e24"; ctx.fill(); ctx.strokeStyle = tg; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(-3, -1, 4, 0, Math.PI * 2);
      ctx.fillStyle = tg + "88"; ctx.fill();
      ctx.beginPath(); ctx.arc(-3, -1, 2 + pulse, 0, Math.PI * 2); ctx.fillStyle = "#bbc4c8"; ctx.fill();
      drawEngine(-12, -16, 5); drawEngine(-12, 16, 5);
      if ((e.shieldHp ?? 0) > 0) {
        ctx.beginPath();
        ctx.arc(-2, 0, 27, 0, Math.PI * 2);
        ctx.strokeStyle = "#a4b3bc99";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#a4b3bc12";
        ctx.fill();
      }
      break;
    }
  }

  if (["scout", "fighter", "interceptor", "plasmawing", "bomber", "boss", "gunship", "sentinel", "titan", "overlord"].includes(e.type)) {
    ctx.save(); ctx.shadowBlur = 0;
    const large = isBossEnemy(e);
    const span = large ? 22 : 9;
    ctx.strokeStyle = "#d5e0e877"; ctx.lineWidth = .7;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-span, side * span); ctx.lineTo(span * .5, side * span * .5); ctx.stroke();
      ctx.fillStyle = "#161e24";
      for (let vent = 0; vent < 3; vent++) ctx.fillRect(-span + vent * 3, side * span - 2, 1.5, 4);
    }
    const canopy = ctx.createLinearGradient(0, -5, 0, 5);
    canopy.addColorStop(0, "#161e24"); canopy.addColorStop(.65, "#394650"); canopy.addColorStop(1, "#d5e5e6");
    ctx.fillStyle = canopy;
    ctx.beginPath(); ctx.ellipse(large ? 17 : 6, 0, large ? 10 : 6, large ? 5 : 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Riveted inspection cover, cooling slots and a recessed mechanical hub.
  ctx.save(); ctx.shadowBlur = 0;
  const heavy = e.type === "titan" || e.type === "overlord" || e.type === "boss";
  const panelX = heavy ? -34 : e.type === "biome" ? -12 : -10;
  const panelW = heavy ? 24 : 10;
  const panelH = heavy ? 16 : 7;
  ctx.fillStyle = "#25313a"; ctx.strokeStyle = "#8a989f"; ctx.lineWidth = .7;
  ctx.beginPath(); ctx.roundRect(panelX, -panelH / 2, panelW, panelH, 1);
  ctx.fill(); ctx.stroke();
  for (const side of [-1, 1]) {
    for (const x of [panelX + 1.5, panelX + panelW - 1.5]) {
      ctx.beginPath(); ctx.arc(x, side * (panelH / 2 - 1.5), heavy ? 1.2 : .65, 0, Math.PI * 2);
      ctx.fillStyle = "#bac3c6"; ctx.fill();
    }
  }
  for (let slot = 0; slot < 3; slot++) {
    ctx.fillStyle = "#0c141a";
    ctx.fillRect(panelX + panelW * .3 + slot * panelW * .15, -panelH * .25, heavy ? 2 : 1, panelH * .5);
  }
  if (heavy || e.type === "plasmawing" || e.type === "sentinel" || e.type === "laserdevice") {
    const hubX = e.type === "titan" ? 18 : e.type === "overlord" ? 12 : e.type === "boss" ? 8 : 0;
    const radius = heavy ? 9 : 4;
    ctx.beginPath(); ctx.arc(hubX, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#172128"; ctx.fill(); ctx.strokeStyle = "#8d9ca5"; ctx.lineWidth = 1.5; ctx.stroke();
    for (let tooth = 0; tooth < 6; tooth++) {
      const angle = tooth * Math.PI / 3;
      ctx.fillStyle = "#b3bdc1";
      ctx.fillRect(hubX + Math.cos(angle) * radius * .7 - .8, Math.sin(angle) * radius * .7 - .8, 1.6, 1.6);
    }
    ctx.fillStyle = "#b69a66"; ctx.fillRect(hubX - 1.2, -1.2, 2.4, 2.4);
  }
  ctx.restore();

  if (isBossEnemy(e)) {
    const drawDetachableModule = (y: number, kind: "cannon" | "engine") => {
      const moduleX = -e.width * .2;
      const moduleWidth = Math.max(20, e.width * .22);
      const moduleHeight = Math.max(11, e.height * .13);
      ctx.save();
      ctx.translate(moduleX, y);
      ctx.shadowColor = kind === "cannon" ? "#b5674e" : "#a4b3bc";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(-moduleWidth / 2, -moduleHeight / 2, moduleWidth, moduleHeight, 4);
      ctx.fillStyle = hullGradient();
      ctx.fill();
      ctx.strokeStyle = kind === "cannon" ? "#b5674e" : "#a4b3bc";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (kind === "cannon") {
        ctx.fillStyle = "#fff1f4";
        ctx.fillRect(moduleWidth * .3, -moduleHeight * .28, moduleWidth * .55, 3);
        ctx.fillRect(moduleWidth * .3, moduleHeight * .28 - 3, moduleWidth * .55, 3);
      } else {
        drawEngine(-moduleWidth * .55, 0, Math.max(8, moduleHeight * .7));
        ctx.beginPath();
        ctx.arc(moduleWidth * .15, 0, moduleHeight * .24, 0, Math.PI * 2);
        ctx.fillStyle = "#e8fdff";
        ctx.fill();
      }
      ctx.restore();
    };

    // Rotation makes positive local Y the visually upper module on screen.
    if (!e.bossCannonsDisabled) drawDetachableModule(e.height * .34, "cannon");
    if (!e.bossEngineDisabled) drawDetachableModule(-e.height * .34, "engine");
  }

  if (e.archetype || e.eliteModifier) {
    const roleIcon = e.archetype === "healer" ? "+" : e.archetype === "shield" ? "◆" :
      e.archetype === "kamikaze" ? "!" : e.eliteModifier === "armored" ? "A" :
      e.eliteModifier === "swift" ? "S" : "F";
    const badgeColor = roleColor ?? (e.eliteModifier === "armored" ? "#b9c5d6" :
      e.eliteModifier === "swift" ? "#b69a66" : "#a4b3bc");
    ctx.beginPath();
    ctx.arc(0, -e.height / 2 - 9, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#161e24";
    ctx.fill();
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = badgeColor;
    ctx.font = "bold 9px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(roleIcon, 0, -e.height / 2 - 9);
  }

  ctx.restore();
}
const canvas = document.querySelector("canvas"); const ctx = canvas.getContext("2d");
ctx.fillStyle = "#17242d"; ctx.fillRect(0, 0, canvas.width, canvas.height);
const types = ["scout", "fighter", "bomber", "interceptor", "plasmawing", "sentinel", "gunship", "laserdevice", "tiefighter", "emeraldtiefighter", "boss", "overlord", "titan"];
const variants = types.map(type => ({type, width: type === "titan" ? 160 : type === "overlord" ? 130 : type === "boss" ? 80 : 50, height: type === "titan" ? 150 : type === "overlord" ? 110 : type === "boss" ? 90 : 50}));
for (const kind of ["tank", "spider", "submarine", "city"]) variants.push({type: "boss", encounterKind: kind, width: 230, height: 160});
const seen = new Set();
for (const def of BIOMES.flatMap(b => b.enemies)) {
 if (seen.has(def.visual)) continue; seen.add(def.visual);
 variants.push({type: "biome", biomeEnemyId: def.id, width: def.width, height: def.height});
}
variants.push({type: "scout", isGolden: true, width: 50, height: 40});
variants.push({type: "fighter", archetype: "healer", width: 50, height: 40});
for (const [i, variant] of variants.entries()) {
 const cx = 150 + (i % 5) * 280, cy = 125 + Math.floor(i / 5) * 220;
 ctx.fillStyle = "#c6d0d5"; ctx.font = "16px monospace"; ctx.textAlign = "center";
 ctx.fillText(variant.isGolden ? "gold" : variant.biomeEnemyId ?? variant.encounterKind ?? variant.type, cx, cy + 94);
 drawEnemy(ctx, {...variant, x: cx - variant.width/2, y: cy - variant.height/2, hp: 100, maxHp: 100, color: "#ff00ff", shieldHp: 0, bossCannonsDisabled: false, bossEngineDisabled: false}, true);
}
window.galleryReady = true;
