import { readStoredJson, writeStoredJson } from "./storage";

export interface RunStats {
  kills: number;
  bosses: number;
  damageTaken: number;
  powerUps: number;
  flawlessKills: number;
  perfectBosses: number;
  fullHealthPickups: number;
  maxCombo: number;
  nearMisses: number;
  missions: number;
  damageDealt: number;
}
export interface Achievement { id: string; icon: string; name: string; description: string; target: number; reward: number; stat: keyof RunStats }

const ACHIEVEMENT_KEY = "fighter-command-achievements";
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_sortie", icon: "✈", name: "Erster Einsatz", description: "Besiege 10 Gegner", target: 10, reward: 500, stat: "kills" },
  { id: "on_a_roll", icon: "🔥", name: "Nicht zu stoppen", description: "Besiege 25 Gegner in einem Einsatz", target: 25, reward: 1000, stat: "kills" },
  { id: "sky_sweeper", icon: "⚡", name: "Himmelsfeger", description: "Besiege 50 Gegner in einem Einsatz", target: 50, reward: 1800, stat: "kills" },
  { id: "ace", icon: "🎯", name: "Fliegerass", description: "Besiege 100 Gegner in einem Einsatz", target: 100, reward: 3000, stat: "kills" },
  { id: "elite_ace", icon: "🦅", name: "Elite-Ass", description: "Besiege 250 Gegner in einem Einsatz", target: 250, reward: 7500, stat: "kills" },
  { id: "legend_of_the_skies", icon: "🌌", name: "Legende der Lüfte", description: "Besiege 500 Gegner in einem Einsatz", target: 500, reward: 15000, stat: "kills" },
  { id: "air_superiority", icon: "🛩", name: "Luftüberlegenheit", description: "Besiege 750 Gegner in einem Einsatz", target: 750, reward: 22000, stat: "kills" },
  { id: "thousand_down", icon: "💯", name: "Tausendfacher Abschuss", description: "Besiege 1.000 Gegner in einem Einsatz", target: 1000, reward: 30000, stat: "kills" },
  { id: "storm_of_lead", icon: "🌪", name: "Sturm aus Stahl", description: "Besiege 1.500 Gegner in einem Einsatz", target: 1500, reward: 42000, stat: "kills" },
  { id: "enemy_extinction", icon: "☄", name: "Auslöschung", description: "Besiege 2.000 Gegner in einem Einsatz", target: 2000, reward: 55000, stat: "kills" },
  { id: "untouchable_hunter", icon: "🔱", name: "Jäger ohne Grenzen", description: "Besiege 3.000 Gegner in einem Einsatz", target: 3000, reward: 75000, stat: "kills" },
  { id: "sky_legend", icon: "👑", name: "Herrscher des Himmels", description: "Besiege 4.000 Gegner in einem Einsatz", target: 4000, reward: 100000, stat: "kills" },
  { id: "five_thousand", icon: "🌠", name: "Die glorreichen 5.000", description: "Besiege 5.000 Gegner in einem Einsatz", target: 5000, reward: 125000, stat: "kills" },
  { id: "endless_barrage", icon: "♾", name: "Endloses Sperrfeuer", description: "Besiege 7.500 Gegner in einem Einsatz", target: 7500, reward: 175000, stat: "kills" },
  { id: "ten_thousand", icon: "🏆", name: "Unsterbliche Legende", description: "Besiege 10.000 Gegner in einem Einsatz", target: 10000, reward: 250000, stat: "kills" },
  { id: "first_boss", icon: "💥", name: "David gegen Goliath", description: "Besiege einen Boss", target: 1, reward: 1500, stat: "bosses" },
  { id: "boss_hunter", icon: "☠", name: "Bossjäger", description: "Besiege 3 Bosse in einem Einsatz", target: 3, reward: 5000, stat: "bosses" },
  { id: "boss_breaker", icon: "🔨", name: "Bossbrecher", description: "Besiege 5 Bosse in einem Einsatz", target: 5, reward: 8000, stat: "bosses" },
  { id: "boss_nemesis", icon: "👹", name: "Erzfeind der Bosse", description: "Besiege 10 Bosse in einem Einsatz", target: 10, reward: 16000, stat: "bosses" },
  { id: "boss_apocalypse", icon: "🌋", name: "Boss-Apokalypse", description: "Besiege 20 Bosse in einem Einsatz", target: 20, reward: 30000, stat: "bosses" },
  { id: "boss_annihilator", icon: "⚔", name: "Titanenbezwinger", description: "Besiege 30 Bosse in einem Einsatz", target: 30, reward: 45000, stat: "bosses" },
  { id: "boss_nightmare", icon: "🌑", name: "Albtraum der Bosse", description: "Besiege 40 Bosse in einem Einsatz", target: 40, reward: 60000, stat: "bosses" },
  { id: "boss_half_century", icon: "🎖", name: "Halbes Jahrhundert", description: "Besiege 50 Bosse in einem Einsatz", target: 50, reward: 80000, stat: "bosses" },
  { id: "boss_dominator", icon: "🦾", name: "Boss-Dominator", description: "Besiege 75 Bosse in einem Einsatz", target: 75, reward: 110000, stat: "bosses" },
  { id: "boss_centurion", icon: "🏛", name: "Boss-Zenturio", description: "Besiege 100 Bosse in einem Einsatz", target: 100, reward: 150000, stat: "bosses" },
  { id: "boss_reaper", icon: "🗡", name: "Titanenschnitter", description: "Besiege 150 Bosse in einem Einsatz", target: 150, reward: 220000, stat: "bosses" },
  { id: "boss_final_judgment", icon: "⚖", name: "Jüngstes Gericht", description: "Besiege 200 Bosse in einem Einsatz", target: 200, reward: 300000, stat: "bosses" },
  { id: "scavenger", icon: "🧲", name: "Bergungsexperte", description: "Sammle 3 Power-ups in einem Einsatz", target: 3, reward: 750, stat: "powerUps" },
  { id: "collector", icon: "💎", name: "Sammler", description: "Sammle 10 Power-ups in einem Einsatz", target: 10, reward: 2000, stat: "powerUps" },
  { id: "power_hungry", icon: "🔋", name: "Energiehungrig", description: "Sammle 20 Power-ups in einem Einsatz", target: 20, reward: 4500, stat: "powerUps" },
  { id: "arsenal_master", icon: "🚀", name: "Arsenalmeister", description: "Sammle 35 Power-ups in einem Einsatz", target: 35, reward: 8000, stat: "powerUps" },
  { id: "overcharged", icon: "✨", name: "Voll aufgeladen", description: "Sammle 50 Power-ups in einem Einsatz", target: 50, reward: 14000, stat: "powerUps" },
  { id: "power_stockpile", icon: "📦", name: "Energievorrat", description: "Sammle 75 Power-ups in einem Einsatz", target: 75, reward: 20000, stat: "powerUps" },
  { id: "power_century", icon: "💯", name: "Power-Jubiläum", description: "Sammle 100 Power-ups in einem Einsatz", target: 100, reward: 28000, stat: "powerUps" },
  { id: "power_magnet", icon: "🧲", name: "Supermagnet", description: "Sammle 150 Power-ups in einem Einsatz", target: 150, reward: 40000, stat: "powerUps" },
  { id: "power_overflow", icon: "🌈", name: "Energieüberfluss", description: "Sammle 200 Power-ups in einem Einsatz", target: 200, reward: 55000, stat: "powerUps" },
  { id: "power_vault", icon: "🏦", name: "Power-Tresor", description: "Sammle 300 Power-ups in einem Einsatz", target: 300, reward: 75000, stat: "powerUps" },
  { id: "power_core", icon: "☀", name: "Lebender Reaktor", description: "Sammle 400 Power-ups in einem Einsatz", target: 400, reward: 100000, stat: "powerUps" },
  { id: "power_master", icon: "🪄", name: "Meister der Energie", description: "Sammle 500 Power-ups in einem Einsatz", target: 500, reward: 140000, stat: "powerUps" },
  { id: "power_infinite", icon: "♾", name: "Unendliche Energie", description: "Sammle 750 Power-ups in einem Einsatz", target: 750, reward: 200000, stat: "powerUps" },
  { id: "tough_hide", icon: "🩹", name: "Nur ein Kratzer", description: "Überstehe 5 Schadenspunkte in einem Einsatz", target: 5, reward: 750, stat: "damageTaken" },
  { id: "battle_worn", icon: "🪖", name: "Kampferprobt", description: "Überstehe 10 Schadenspunkte in einem Einsatz", target: 10, reward: 1500, stat: "damageTaken" },
  { id: "hard_to_kill", icon: "🛡", name: "Nicht kleinzukriegen", description: "Überstehe 20 Schadenspunkte in einem Einsatz", target: 20, reward: 3000, stat: "damageTaken" },
  { id: "iron_wings", icon: "🪽", name: "Eiserne Schwingen", description: "Überstehe 35 Schadenspunkte in einem Einsatz", target: 35, reward: 5500, stat: "damageTaken" },
  { id: "survivor", icon: "❤", name: "Überlebenskünstler", description: "Überstehe 50 Schadenspunkte in einem Einsatz", target: 50, reward: 8500, stat: "damageTaken" },
  { id: "scarred_veteran", icon: "🦿", name: "Narben des Krieges", description: "Überstehe 75 Schadenspunkte in einem Einsatz", target: 75, reward: 13000, stat: "damageTaken" },
  { id: "indestructible", icon: "💪", name: "Unzerstörbar", description: "Überstehe 100 Schadenspunkte in einem Einsatz", target: 100, reward: 20000, stat: "damageTaken" },
  { id: "flying_fortress", icon: "🏰", name: "Fliegende Festung", description: "Überstehe 150 Schadenspunkte in einem Einsatz", target: 150, reward: 32000, stat: "damageTaken" },
  { id: "damage_sponge", icon: "🔧", name: "Stahlgewitter überlebt", description: "Überstehe 200 Schadenspunkte in einem Einsatz", target: 200, reward: 50000, stat: "damageTaken" },
  { id: "phoenix", icon: "🔥", name: "Phönix", description: "Überstehe 300 Schadenspunkte in einem Einsatz", target: 300, reward: 80000, stat: "damageTaken" },
  { id: "clean_sweep", icon: "✨", name: "Saubere Arbeit", description: "Besiege 25 Gegner in Folge, ohne Schaden zu nehmen", target: 25, reward: 3500, stat: "flawlessKills" },
  { id: "untouchable_ace", icon: "🦅", name: "Unberührbares Ass", description: "Besiege 100 Gegner in Folge, ohne Schaden zu nehmen", target: 100, reward: 12000, stat: "flawlessKills" },
  { id: "perfect_boss", icon: "💎", name: "Perfekter Bosskampf", description: "Besiege einen Boss, ohne im Kampf Schaden zu nehmen", target: 1, reward: 6000, stat: "perfectBosses" },
  { id: "perfect_boss_trio", icon: "👑", name: "Makelloser Bossjäger", description: "Gewinne drei Bosskämpfe in einem Einsatz ohne Schaden", target: 3, reward: 18000, stat: "perfectBosses" },
  { id: "full_health_salvage", icon: "🧲", name: "Mutige Bergung", description: "Sammle fünf Power-ups bei voller Gesundheit", target: 5, reward: 4000, stat: "fullHealthPickups" },
  { id: "combo_25", icon: "🔥", name: "Kettenreaktion", description: "Erreiche eine 25er-Combo", target: 25, reward: 5000, stat: "maxCombo" },
  { id: "combo_75", icon: "🌋", name: "Unaufhaltsam", description: "Erreiche eine 75er-Combo", target: 75, reward: 18000, stat: "maxCombo" },
  { id: "near_miss_10", icon: "🌀", name: "Haarscharf", description: "Schaffe 10 Near Misses in einem Einsatz", target: 10, reward: 4500, stat: "nearMisses" },
  { id: "near_miss_50", icon: "🪽", name: "Projektiltänzer", description: "Schaffe 50 Near Misses in einem Einsatz", target: 50, reward: 18000, stat: "nearMisses" },
  { id: "mission_first", icon: "📡", name: "Befehl ausgeführt", description: "Schließe ein Missionsziel ab", target: 1, reward: 4000, stat: "missions" },
  { id: "mission_five", icon: "🎖", name: "Elite-Einsatzkraft", description: "Schließe fünf Missionsziele in einem Einsatz ab", target: 5, reward: 20000, stat: "missions" },
];

export function normalizeRunStats(value: unknown): RunStats {
  const source = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const empty: RunStats = {
    kills: 0, bosses: 0, damageTaken: 0, powerUps: 0,
    flawlessKills: 0, perfectBosses: 0, fullHealthPickups: 0,
    maxCombo: 0, nearMisses: 0, missions: 0, damageDealt: 0,
  };
  for (const key of Object.keys(empty) as (keyof RunStats)[]) {
    const raw = source[key];
    empty[key] = typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }
  return empty;
}

export function loadAchievements(): string[] {
  const saved = readStoredJson(ACHIEVEMENT_KEY, []);
  return Array.isArray(saved)
    ? [...new Set(saved.filter((id): id is string => typeof id === "string" && ACHIEVEMENTS.some(a => a.id === id)))]
    : [];
}

export function saveAchievements(ids: string[]): void {
  writeStoredJson(ACHIEVEMENT_KEY, ids);
}

export function newlyUnlockedAchievements(stats: RunStats, owned: readonly string[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => !owned.includes(a.id) && stats[a.stat] >= a.target);
}

export function achievementProgress(achievement: Achievement, stats: RunStats, unlocked: boolean): number {
  return unlocked ? achievement.target : Math.min(achievement.target, Math.max(0, stats[achievement.stat]));
}
