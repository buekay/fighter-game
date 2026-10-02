export interface MissionStats {
  kills: number;
  nearMisses: number;
  perfectBosses: number;
}

export interface Mission {
  index: number;
  type: "kills" | "combo" | "near_miss" | "flawless_boss";
  title: string;
  target: number;
  reward: number;
  baseline: number;
  completed: boolean;
  completedAtMs: number;
}

const MISSIONS = [
  { type: "kills", title: "Zerstöre 30 Gegner", target: 30, reward: 5000 },
  { type: "combo", title: "Erreiche eine 20er-Combo", target: 20, reward: 6500 },
  { type: "near_miss", title: "Schaffe 8 Near Misses", target: 8, reward: 7000 },
  { type: "flawless_boss", title: "Besiege einen Boss ohne Treffer", target: 1, reward: 9000 },
] as const;

export function createMission(
  index = 0,
  stats: MissionStats = { kills: 0, nearMisses: 0, perfectBosses: 0 },
): Mission {
  const definition = MISSIONS[index % MISSIONS.length];
  const baseline = definition.type === "kills" ? stats.kills
    : definition.type === "near_miss" ? stats.nearMisses
    : definition.type === "flawless_boss" ? stats.perfectBosses : 0;
  return { ...definition, index, baseline, completed: false, completedAtMs: 0 };
}

export function missionProgress(mission: Mission, stats: MissionStats, combo: number): number {
  if (mission.completed) return mission.target;
  const value = mission.type === "kills" ? stats.kills
    : mission.type === "near_miss" ? stats.nearMisses
    : mission.type === "flawless_boss" ? stats.perfectBosses : combo;
  return Math.max(0, value - mission.baseline);
}

// Use active play time so transitions freeze during pause and cannot outlive a run.
export function advanceMission(mission: Mission, stats: MissionStats, combo: number, elapsedMs: number): Mission {
  if (mission.completed) {
    return elapsedMs - mission.completedAtMs >= 2200
      ? createMission(mission.index + 1, stats) : mission;
  }
  return missionProgress(mission, stats, combo) >= mission.target
    ? { ...mission, completed: true, completedAtMs: elapsedMs } : mission;
}
