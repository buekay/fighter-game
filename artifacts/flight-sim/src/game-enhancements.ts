export type MutatorId = "none" | "swarm" | "bullet_time" | "volatile" | "glass_skies";

export interface MutatorDefinition {
  id: MutatorId;
  icon: string;
  name: string;
  description: string;
  spawnRateMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  playerDamageMultiplier: number;
}

export const MUTATORS: Record<MutatorId, MutatorDefinition> = {
  none: { id: "none", icon: "◌", name: "Standardsektor", description: "Keine Sektoranomalie.", spawnRateMultiplier: 1, enemySpeedMultiplier: 1, enemyDamageMultiplier: 1, playerDamageMultiplier: 1 },
  swarm: { id: "swarm", icon: "♟", name: "Schwarm", description: "Gegner erscheinen 35 % schneller.", spawnRateMultiplier: .65, enemySpeedMultiplier: 1, enemyDamageMultiplier: 1, playerDamageMultiplier: 1 },
  bullet_time: { id: "bullet_time", icon: "◷", name: "Zeitbruch", description: "Alle feindlichen Bewegungen und Geschosse sind langsamer.", spawnRateMultiplier: .9, enemySpeedMultiplier: .72, enemyDamageMultiplier: 1, playerDamageMultiplier: .9 },
  volatile: { id: "volatile", icon: "✹", name: "Instabile Kerne", description: "Zerstörte Gegner beschädigen nahe Gegner.", spawnRateMultiplier: .85, enemySpeedMultiplier: 1.08, enemyDamageMultiplier: 1, playerDamageMultiplier: 1 },
  glass_skies: { id: "glass_skies", icon: "⚠", name: "Glashimmel", description: "Du und deine Gegner verursachen 50 % mehr Schaden.", spawnRateMultiplier: .9, enemySpeedMultiplier: 1.08, enemyDamageMultiplier: 1.5, playerDamageMultiplier: 1.5 },
};

const MUTATOR_ROTATION: MutatorId[] = ["swarm", "bullet_time", "volatile", "glass_skies"];

export function getMutatorForLevel(level: number): MutatorDefinition {
  if (level < 4) return MUTATORS.none;
  return MUTATORS[MUTATOR_ROTATION[(Math.floor(level / 4) - 1) % MUTATOR_ROTATION.length]];
}

export type SectorChoiceId = "overcharge" | "elite_hunt" | "repair_route";

export interface SectorChoice {
  id: SectorChoiceId;
  icon: string;
  name: string;
  description: string;
  risk: string;
}

export const SECTOR_CHOICES: readonly SectorChoice[] = [
  { id: "overcharge", icon: "⚡", name: "Reaktor überladen", description: "+2 Projektilschaden für diesen Einsatz.", risk: "Verliere sofort 25 % deiner aktuellen HP." },
  { id: "elite_hunt", icon: "☠", name: "Elite-Signal verfolgen", description: "Starte eine große Angriffswelle und erhalte 4.000 Credits.", risk: "Der nächste Sektor erhält den Mutator Glashimmel." },
  { id: "repair_route", icon: "✚", name: "Reparaturroute", description: "Volle HP und ein starker Schild.", risk: "Verliere 8 % deines aktuellen Scores." },
] as const;

export interface UpgradeSynergy {
  id: string;
  icon: string;
  name: string;
  description: string;
}

export function getUpgradeSynergies(upgrades: Partial<Record<string, number>>): UpgradeSynergy[] {
  const has = (id: string) => (upgrades[id] ?? 0) > 0;
  return [
    has("chain_lightning") && has("cryo_rounds")
      ? { id: "frost_storm", icon: "🌨", name: "Froststurm", description: "Kettenblitze verlangsamen alle getroffenen Ziele." }
      : null,
    has("missile_mastery") && has("cryo_rounds")
      ? { id: "cryo_warheads", icon: "🧊", name: "Kryo-Sprengköpfe", description: "Raketen erzeugen eine verlangsamende Flächenexplosion." }
      : null,
    has("shield") && has("reactive_armor")
      ? { id: "ramming_field", icon: "💠", name: "Rammschild", description: "Kollisionen bei aktivem Schild zerstören kleine Gegner." }
      : null,
    has("vampiric") && has("glass_cannon")
      ? { id: "blood_engine", icon: "🩸", name: "Bluttriebwerk", description: "Energieernte heilt bereits jeden zehnten Abschuss." }
      : null,
  ].filter((synergy): synergy is UpgradeSynergy => synergy !== null);
}

export function getBossPhase(hp: number, maxHp: number): 1 | 2 | 3 {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  return ratio <= .3 ? 3 : ratio <= .6 ? 2 : 1;
}

export function formatRunDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const MODE_RECORDS_KEY = "fighter-command-mode-records";

export function loadModeRecords(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(MODE_RECORDS_KEY) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
    ));
  } catch {
    return {};
  }
}

export function saveModeRecord(mode: string, score: number): { record: number; isNew: boolean } {
  const records = loadModeRecords();
  const previous = records[mode] ?? 0;
  const isNew = score > previous;
  const record = Math.max(previous, score);
  try {
    localStorage.setItem(MODE_RECORDS_KEY, JSON.stringify({ ...records, [mode]: record }));
  } catch {}
  return { record, isNew };
}
