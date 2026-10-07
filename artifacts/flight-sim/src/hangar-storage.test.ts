import assert from "node:assert/strict";
import { loadHangarSlots } from "./pages/Game";

const values = new Map<string, string>();
const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: { getItem: (key: string) => values.get(key) ?? null },
});

try {
  const defaults = loadHangarSlots();
  assert.equal(defaults.length, 4);

  // Corrupt nested fields previously survived the spread of persisted data,
  // causing a crash or invalid equipment/stats when selecting the hangar.
  values.set("fighter-command-hangar-slots", JSON.stringify([{
    aircraftBuild: null, droneBuild: [], hybridActive: "false",
    weapons: [null, "missing", "pulse_cannon", "pulse_cannon"],
    ultis: {}, droneRole: "missing", droneWeapon: null, weaponCrate: [],
    aircraftLevels: { steel: -20 }, droneLevels: { drone_violet: 999 },
    weaponLevels: { pulse_cannon: "10" }, level: 900,
  }]));
  const repaired = loadHangarSlots()[0];
  assert.deepEqual(repaired.aircraftBuild, defaults[0].aircraftBuild);
  assert.deepEqual(repaired.droneBuild, defaults[0].droneBuild);
  assert.equal(repaired.hybridActive, false);
  assert.equal(repaired.droneRole, defaults[0].droneRole);
  assert.equal(repaired.droneWeapon, defaults[0].droneWeapon);
  assert.equal(repaired.weaponCrate, defaults[0].weaponCrate);
  assert.deepEqual(repaired.weapons, ["pulse_cannon"]);
  assert.deepEqual(repaired.ultis, defaults[0].ultis);
  assert.deepEqual(repaired.aircraftLevels, { steel: 1 });
  assert.deepEqual(repaired.droneLevels, { drone_violet: 10 });
  assert.deepEqual(repaired.weaponLevels, { pulse_cannon: 1 });
  assert.equal(repaired.level, 500);

  for (const corrupt of [null, false, "bad", [], {}]) {
    values.set("fighter-command-hangar-slots", JSON.stringify([{
      aircraftBuild: corrupt, droneBuild: corrupt,
      aircraftLevels: corrupt, droneLevels: corrupt, weaponLevels: corrupt,
      weapons: [], ultis: ["missing", null, "jet", "laser"],
    }]));
    const slot = loadHangarSlots()[0];
    assert.deepEqual(slot.aircraftBuild, defaults[0].aircraftBuild);
    assert.deepEqual(slot.droneBuild, defaults[0].droneBuild);
    assert.deepEqual(slot.aircraftLevels, {});
    assert.deepEqual(slot.droneLevels, {});
    assert.deepEqual(slot.weaponLevels, {});
    assert.deepEqual(slot.weapons, ["pulse_cannon"]);
    assert.deepEqual(slot.ultis, ["jet", "laser"]);
  }

  const valid = { ...defaults[0], hybridActive: true, level: 42,
    aircraftBuild: { ...defaults[0].aircraftBuild, wing: "striker", engine: "phase" },
    droneRole: "guardian", aircraftLevels: { steel: 7 }, droneLevels: { drone_violet: 3 },
    weaponLevels: { pulse_cannon: 4 }, ultis: [] };
  values.set("fighter-command-hangar-slots", JSON.stringify([valid]));
  assert.deepEqual(loadHangarSlots()[0], valid, "Valid existing loadouts remain unchanged");

  values.clear();
  values.set("fighter-command-skin", "missing");
  values.set("fighter-command-drone-skin", "missing");
  assert.deepEqual(loadHangarSlots(), defaults, "Invalid legacy skins use safe defaults");
  console.log("Hangar storage regression tests passed");
} finally {
  if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
  else Reflect.deleteProperty(globalThis, "localStorage");
}
