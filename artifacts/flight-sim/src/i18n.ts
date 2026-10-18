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
    expressions: values.map(value => new RegExp("^" + value.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? "(.+?)" : escape(part)).join("") + "$")), values,
  });
}

/** Translate displayed text only; IDs, saved values, keyboard codes and player input stay intact. */
export function translate(language: Language, source: string, fallback = source): string {
  const key = normalize(source);
  const result = dictionaries[language].get(key);
  const whitespace = /^(\s*)[\s\S]*?(\s*)$/.exec(source)!;
  if (result !== undefined) return whitespace[1] + result + whitespace[2];
  for (const pattern of patterns) {
    for (let index = 0; index < pattern.expressions.length; index++) {
      const match = pattern.expressions[index].exec(key);
      if (match) return whitespace[1] + pattern.values[LANGUAGES.indexOf(language)].replace(/\{(\d+)\}/g, (_, slot: string) => translate(language, match[Number(slot) + 1])) + whitespace[2];
    }
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
  return languageLocale(localizedContexts.get(ctx)?.language() ?? "de");
}
