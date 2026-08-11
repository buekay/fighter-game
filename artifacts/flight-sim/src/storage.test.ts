import assert from "node:assert/strict";
import {
  readStoredJson,
  readStoredText,
  removeStoredValue,
  writeStoredJson,
  writeStoredText,
} from "./storage";

const values = new Map<string, string>();
const memoryStorage: Storage = {
  get length() { return values.size; },
  clear() { values.clear(); },
  getItem(key) { return values.get(key) ?? null; },
  key(index) { return [...values.keys()][index] ?? null; },
  removeItem(key) { values.delete(key); },
  setItem(key, value) { values.set(key, value); },
};

const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memoryStorage });

try {
  assert.equal(readStoredText("missing"), null);
  assert.equal(writeStoredText("pilot", "Nova"), true);
  assert.equal(readStoredText("pilot"), "Nova");

  assert.equal(writeStoredJson("settings", { volume: .5 }), true);
  assert.deepEqual(readStoredJson("settings", {}), { volume: .5 });

  memoryStorage.setItem("broken", "{not-json");
  assert.deepEqual(readStoredJson("broken", { safe: true }), { safe: true });

  assert.equal(removeStoredValue("pilot"), true);
  assert.equal(readStoredText("pilot"), null);

  const failingStorage = {
    ...memoryStorage,
    setItem() { throw new Error("quota exceeded"); },
  } as Storage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: failingStorage });
  assert.equal(writeStoredText("blocked", "value"), false);
  assert.equal(writeStoredJson("blocked-json", { value: true }), false);
} finally {
  if (originalDescriptor) Object.defineProperty(globalThis, "localStorage", originalDescriptor);
  else Reflect.deleteProperty(globalThis, "localStorage");
}
