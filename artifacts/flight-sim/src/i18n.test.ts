import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { ACHIEVEMENTS } from "./achievements";
import { createLocalizer, translate, localizeCanvas, LANGUAGES, type Language } from "./i18n";
import { MESSAGES } from "./translations";

for (const row of MESSAGES) {
  assert.equal(row.length, 5);
  assert.ok(row.every(text => text.trim().length > 0), `Incomplete translation: ${row[0]}`);
  const slots = (text: string) => [...text.matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
  for (const value of row) assert.deepEqual(slots(value), slots(row[0]), `Missing placeholder: ${row[0]}`);
}

for (const row of MESSAGES.filter(row => row[0].includes("{0}"))) {
  const render = (text: string) => text.replace(/\{(\d+)\}/g, (_, slot) => String(Number(slot) + 12));
  for (const language of LANGUAGES) assert.equal(translate(language, render(row[0])), render(row[LANGUAGES.indexOf(language)]), `Dynamic translation: ${row[0]} (${language})`);
}

for (const language of LANGUAGES) {
  const localize = createLocalizer(language);
  assert.equal(localize(42), 42);
  assert.equal(localize(false), false);
  const element = { type: "input", props: { value: "Wächter" } };
  assert.equal(localize(element), element, "Do not rewrite React elements or player input");
  assert.equal(localize("Caelus"), "Caelus", "Keep proper names");
  assert.equal(localize("Deutsch"), "Deutsch", "Language selector keeps native names");
  for (const achievement of ACHIEVEMENTS) {
    if (language !== "de") assert.notEqual(localize(achievement.description), achievement.description, achievement.description);
  }
}
assert.equal(translate("fr", "Sprache"), "Langue");
assert.equal(translate("fr", "/"), "/");
assert.equal(translate("fr", "Level 5, verfügbar"), "Niveau 5, disponible");
assert.equal(translate("es", "500 Punkte"), "500 puntos");
assert.equal(translate("es", "Level 12 ist jetzt freigeschaltet."), "El nivel 12 está desbloqueado.");
assert.equal(translate("tr", "  Fähigkeiten  "), "  Fähigkeiten  ");
assert.equal(translate("fr", " HEIL-ULTI ❤ "), " POUVOIR DE SOIN ❤ ");
assert.equal(translate("es", "🔒 Pilot-Level 25 erforderlich"), "🔒 Se requiere nivel de piloto 25");
assert.equal(translate("tr", "Besiege 250 Gegner in einem Einsatz"), "Bir görevde 250 düşmanı yen");
assert.equal(translate("de", "Twin Cannons"), "Zwillingskanonen");
assert.equal(translate("en", "Drohne MK VIII"), "Drone MK VIII");
assert.equal(translate("es", "Flugzeug-Ulti ⬆"), "Habilidad de avión ⬆");

// Catalog descriptions are shared by shop cards, loadout tooltips and the hangar.
const gameSource = ts.createSourceFile("Game.tsx", readFileSync(new URL("./pages/Game.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const properNames = new Set(["Aegis", "Ignis", "Viridia", "Midas", "Nyx", "Ravena", "Orion", "Voltara", "Boreas", "Vulkara", "X-Wing", "TIE Fighter", "Solaris Prime", "Void Reaper", "Caelus", "Seraph", "Supernova", "Nova-Laser", "Phantom-Laser", "Titan-Plasma", "Seraph-Plasma", "Normal", "Extras", "Skins", "Level", "Shop", "Fighter Command"]);
const missing = new Set<string>();
function checkCatalog(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && ["name", "description", "desc", "ultiName", "ultiDesc"].includes(node.name.getText(gameSource)) && ts.isStringLiteral(node.initializer)) {
    const source = node.initializer.text;
    if (!properNames.has(source) && !MESSAGES.some(row => row.includes(source)) && translate("en", source) === source) missing.add(source);
  }
  ts.forEachChild(node, checkCatalog);
}
checkCatalog(gameSource);
assert.deepEqual([...missing], [], "Untranslated catalog text");

let language: Language = "fr";
const calls: unknown[][] = [];
const ctx = {
  fillText: (...args: unknown[]) => calls.push(args),
  strokeText: (...args: unknown[]) => calls.push(args),
  measureText: (text: string) => ({ width: text.length }),
} as unknown as CanvasRenderingContext2D;
localizeCanvas(ctx, () => language);
localizeCanvas(ctx, () => language); // Installing twice must not wrap drawing twice.
ctx.fillText("SCHILD", 10, 20);
assert.deepEqual(calls.pop(), ["BOUCLIER", 10, 20]);
assert.equal(ctx.measureText("SCHILD").width, "BOUCLIER".length);
language = "es";
ctx.fillText("SCHILD", 10, 20, 80);
assert.deepEqual(calls.pop(), ["ESCUDO", 10, 20, 80]);
ctx.strokeText("FIRE", 1, 2);
assert.deepEqual(calls.pop(), ["FUEGO", 1, 2]);
console.log("Localization tests passed");
