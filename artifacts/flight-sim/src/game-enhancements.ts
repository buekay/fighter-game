import { readStoredJson, writeStoredJson } from "./storage";

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

export type SectorChoiceId =
  | "overcharge"
  | "elite_hunt"
  | "repair_route"
  | "blood_bargain"
  | "swarm_gate"
  | "time_rift"
  | "volatile_salvage"
  | "shield_gamble"
  | "weapon_jam"
  | "bounty_beacon"
  | "drone_overclock"
  | "critical_protocol"
  | "afterburner_trial"
  | "nanite_debt"
  | "ultimate_sacrifice";

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
  { id: "blood_bargain", icon: "🩸", name: "Blutpakt", description: "Energieernte und +1 Projektilschaden.", risk: "Deine maximalen HP sinken dauerhaft um 3." },
  { id: "swarm_gate", icon: "♟", name: "Schwarmtor", description: "Sofort 6.000 Credits und +25 % Abschusspunkte.", risk: "Aktiviere den Mutator Schwarm." },
  { id: "time_rift", icon: "◷", name: "Zeitriss", description: "Feinde und Projektile werden deutlich langsamer.", risk: "Dein Score wird sofort um 12 % reduziert." },
  { id: "volatile_salvage", icon: "✹", name: "Instabile Bergung", description: "Gegner lösen schädliche Kettenexplosionen aus.", risk: "Feinde bewegen sich schneller." },
  { id: "shield_gamble", icon: "💠", name: "Schildwette", description: "Erhalte 12 Schildtreffer und eine Schildmatrix.", risk: "Deine aktuellen HP werden auf die Hälfte gesetzt." },
  { id: "weapon_jam", icon: "⌁", name: "Gestörte Waffenkammer", description: "+3 Projektilschaden.", risk: "Deine Feuerrate wird für diesen Einsatz langsamer." },
  { id: "bounty_beacon", icon: "◆", name: "Kopfgeld-Sender", description: "Kopfgeld-Protokoll und 8.000 Credits.", risk: "Aktiviere Glashimmel und verliere 20 % deiner HP." },
  { id: "drone_overclock", icon: "🛸", name: "Drohnen-Overclock", description: "Die Drohne erhält sofort zwei Stufen.", risk: "Dein Jet verliert 15 % seines aktuellen Scores." },
  { id: "critical_protocol", icon: "🎯", name: "Kritisches Protokoll", description: "Zwei Stufen Zielcomputer.", risk: "Deine maximalen HP sinken um 2." },
  { id: "afterburner_trial", icon: "🔥", name: "Nachbrenner-Prüfung", description: "+1 Geschwindigkeit für diesen Einsatz.", risk: "Aktiviere den Mutator Schwarm." },
  { id: "nanite_debt", icon: "🔧", name: "Nanitenkredit", description: "Volle Heilung und Reparatur-Naniten.", risk: "Die nächsten 10.000 Punkte werden gestrichen." },
  { id: "ultimate_sacrifice", icon: "☄", name: "Ultimatives Opfer", description: "Alle ausgerüsteten Ultis werden vollständig geladen.", risk: "Verliere ein Leben; bei einem letzten Leben stattdessen 75 % HP." },
] as const;

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
  const parsed = readStoredJson(MODE_RECORDS_KEY, {});
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] =>
    typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
  ));
}

export function saveModeRecord(mode: string, score: number): { record: number; isNew: boolean } {
  const records = loadModeRecords();
  const previous = records[mode] ?? 0;
  const isNew = score > previous;
  const record = Math.max(previous, score);
  writeStoredJson(MODE_RECORDS_KEY, { ...records, [mode]: record });
  return { record, isNew };
}
