import { MESSAGES } from "./translations";

export type Language = "de" | "en" | "tr" | "fr" | "es";
export const LANGUAGES: readonly Language[] = ["de", "en", "tr", "fr", "es"];
export const languageLocale = (language: Language) => ({ de: "de-DE", en: "en-US", tr: "tr-TR", fr: "fr-FR", es: "es-ES" })[language];
const dictionaries = Object.fromEntries(LANGUAGES.map(language => [language, new Map<string, string>()])) as Record<Language, Map<string, string>>;
const patterns: { expressions: RegExp[]; values: readonly string[] }[] = [];
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const values of MESSAGES) {
  for (const source of values) {
    LANGUAGES.forEach((language, index) => dictionaries[language].set(normalize(source), values[index]));
  }
  if (values[0].includes("{0}")) patterns.push({
    expressions: values.map(value => new RegExp("^" + value.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? "(.*?)" : escape(part)).join("") + "$")), values,
  });
}

// Match specific sentences before generic labels such as “Level {0}”.
patterns.sort((a, b) => b.values[0].replace(/\{\d+\}/g, "").length - a.values[0].replace(/\{\d+\}/g, "").length);
const cache = new Map<string, string>();
export function translate(language: Language, source: string, fallback = source): string {
  const key = JSON.stringify([language, source, fallback]);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const result = translateUncached(language, source, fallback);
  if (cache.size >= 4000) cache.clear();
  cache.set(key, result);
  return result;
}

/** Translate displayed text only; IDs, saved values, keyboard codes and player input stay intact. */
function translateUncached(language: Language, source: string, fallback: string): string {
  const key = normalize(source);
  if (!/\p{L}/u.test(key)) return source;
  const result = dictionaries[language].get(key);
  const whitespace = /^(\s*)[\s\S]*?(\s*)$/.exec(source)!;
  if (result !== undefined) return whitespace[1] + result + whitespace[2];
  if (key === key.toLocaleUpperCase(languageLocale(language))) {
    const row = MESSAGES.find(values => values.some(value => normalize(value).toLocaleUpperCase(languageLocale(language)) === key));
    if (row) return whitespace[1] + row[LANGUAGES.indexOf(language)].toLocaleUpperCase(languageLocale(language)) + whitespace[2];
  }
  for (const pattern of patterns) {
    for (let index = 0; index < pattern.expressions.length; index++) {
      const match = pattern.expressions[index].exec(key);
      if (match) return whitespace[1] + pattern.values[LANGUAGES.indexOf(language)].replace(/\{(\d+)\}/g, (_, slot: string) => translate(language, match[Number(slot) + 1])) + whitespace[2];
    }
  }
  // Icons and separators are presentation, not part of an item’s translated name.
  const decorated = /^([^\p{L}\p{N}]*)([\s\S]*[\p{L}\p{N}])([^\p{L}\p{N}]*)$/u.exec(key);
  if (decorated && (decorated[1] || decorated[3])) {
    const inner = translate(language, decorated[2]);
    if (inner !== decorated[2]) return whitespace[1] + decorated[1] + inner + decorated[3] + whitespace[2];
  }
  const segments = key.split(/( · | — |: |, |\n)/);
  if (segments.length > 1) {
    const localized = segments.map((part, index) => index % 2 ? part : translate(language, part)).join("");
    if (localized !== key) return whitespace[1] + localized + whitespace[2];
  }
  return language === "de" ? source : fallback;
}

export function createLocalizer(language: Language) {
  function localize<T>(value: T): T {
    if (typeof value === "string") return translate(language, value) as T;
    // React elements retain their identity, refs and handlers. Each component translates its own text.
    if (Array.isArray(value)) return value.map(item => localize(item)) as T;
    return value;
  }
  localize.locale = languageLocale(language);
  return localize;
}

const localizedContexts = new WeakMap<CanvasRenderingContext2D, { language: () => Language }>();
/** Install once per game canvas; use the latest setting even inside the animation loop. */
export function localizeCanvas(ctx: CanvasRenderingContext2D, language: () => Language) {
  const existing = localizedContexts.get(ctx);
  if (existing) { existing.language = language; return; }
  const state = { language };
  localizedContexts.set(ctx, state);
  const fillText = ctx.fillText.bind(ctx);
  const strokeText = ctx.strokeText.bind(ctx);
  const measureText = ctx.measureText.bind(ctx);
  ctx.fillText = (text, x, y, maxWidth?) => maxWidth === undefined
    ? fillText(translate(state.language(), text), x, y)
    : fillText(translate(state.language(), text), x, y, maxWidth);
  ctx.strokeText = (text, x, y, maxWidth?) => maxWidth === undefined
    ? strokeText(translate(state.language(), text), x, y)
    : strokeText(translate(state.language(), text), x, y, maxWidth);
  ctx.measureText = text => measureText(translate(state.language(), text));
}

export function canvasLocale(ctx: CanvasRenderingContext2D) {
  return languageLocale(localizedContexts.get(ctx)?.language() ?? "en");
}
