import { MAX_LEVEL, getLevelThreshold, isMilestoneBossLevel, getGameModeRules } from './game-rules';
import { BIOMES, getBiomeForLevel } from './biomes';
import { readStoredJson, writeStoredJson } from './storage';

export const CAMPAIGN_KEY = 'fighter-command-campaign-v1';
export const LEVEL_LENGTH_MULTIPLIER = 10;
export function normalizeCompleted(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? Math.max(0, Math.min(MAX_LEVEL, value)) : 0;
}
export function loadCompletedLevels(): number { return normalizeCompleted(readStoredJson(CAMPAIGN_KEY, 0)); }
export function isLevelUnlocked(level: number, completed: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL && level <= normalizeCompleted(completed) + 1;
}
export function completeCampaignLevel(level: number): number {
  const completed = loadCompletedLevels();
  const next = isLevelUnlocked(level, completed) ? Math.max(completed, level) : completed;
  writeStoredJson(CAMPAIGN_KEY, next);
  return next;
}
export function getCampaignTarget(level: number): number {
  const current = getLevelThreshold(level);
  const span = level < MAX_LEVEL ? getLevelThreshold(level + 1) - current : current - getLevelThreshold(level - 1);
  return Math.max(1, span) * LEVEL_LENGTH_MULTIPLIER;
}
export const isCampaignBossLevel = isMilestoneBossLevel;
export function isCampaignProtectLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= MAX_LEVEL && level % 7 === 0 && !isCampaignBossLevel(level);
}
export function getCampaignMode(level: number): 'classic' | 'protect' {
  return isCampaignProtectLevel(level) ? 'protect' : 'classic';
}
export function canCompleteCampaignLevel(level: number, score: number, bossDefeated: boolean, elapsedMs = 0): boolean {
  if (isCampaignProtectLevel(level)) return elapsedMs >= getGameModeRules('protect').durationSeconds! * 1000;
  return score >= getCampaignTarget(level) && (!isCampaignBossLevel(level) || bossDefeated);
}
export function getCampaignLandscape(level: number) {
  const biome = getBiomeForLevel(level);
  // Every sector has its own fixed terrain layout, lighting and palette.
  return { biome, seed: level * 137.508, hue: Math.floor((level - 1) / BIOMES.length) * 7 % 45, night: level % 7 === 0,
    name: `${biome.name} · Sektor ${String(level).padStart(3, '0')}` };
}
