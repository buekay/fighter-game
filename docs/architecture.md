# Architektur

## Überblick

Die Anwendung ist ein React-/Vite-Frontend. React steuert Menüs und sichtbare
Statuswerte, während der aktive Kampf in einer Canvas-Schleife läuft. Häufig
veränderte Spielwerte liegen in React-Refs, damit nicht jedes Bild einen
React-Render auslöst.

```text
App.tsx
└── pages/Game.tsx
    ├── game-rules.ts         Reine, getestete Spielregeln
    ├── catalog-order.ts      Zentrale Sortierung aller Shop-Kataloge
    ├── game-enhancements.ts  Mutatoren, Sektoren und Rekorde
    ├── biomes.ts             Biome und Gegnervarianten
    └── storage.ts            Fehlertolerante Browser-Persistenz
```

## Modulgrenzen

- `game-rules.ts` enthält deterministische Regeln ohne React-Abhängigkeit.
- `catalog-order.ts` definiert die verbindliche Reihenfolge für Seltenheit,
  Preis und Namen. Shop und Hangar verwenden ausschließlich diese Sortierung.
- `game-enhancements.ts` enthält zusätzliche Progressionsregeln. Persistierte
  Modusrekorde verwenden die zentrale Storage-Schicht.
- `biomes.ts` beschreibt Biome und ihre Gegner.
- `storage.ts` ist die einzige allgemeine Schnittstelle zu `localStorage`.
  Fehlender Speicher, ungültiges JSON und Schreibfehler werden als normale
  Browserzustände behandelt.
- `pages/Game.tsx` koordiniert aktuell Spielloop, Canvas-Rendering, Eingaben und
  Menüs. Neue eigenständige Regeln gehören nicht in diese Datei.

## Laufzeit und Performance

- Der Canvas-Loop hält hochfrequente Zustände in Refs und synchronisiert React
  nur periodisch.
- Zielreservierungen der Gift-Raketen werden einmal pro Frame aufgebaut. Eine
  Projektilschleife darf keine erneute vollständige Projektilschleife enthalten.
- Der Production-Build trennt React, React DOM und Wouter in einen cachebaren
  `vendor`-Chunk. Das verkleinert den eigentlichen Spiel-Chunk und vermeidet die
  bisherige 500-kB-Warnung.

## Persistenzregeln

1. Neue Storage-Zugriffe verwenden `readStoredText`, `readStoredJson`,
   `writeStoredText`, `writeStoredJson` oder `removeStoredValue`.
2. Gelesene Daten werden an der Domänengrenze validiert; JSON allein macht aus
   externen Daten noch keine vertrauenswürdigen Typen.
3. Änderungen an bestehenden Schlüsseln müssen rückwärtskompatibel bleiben oder
   eine explizite Migration enthalten.
4. Ein Speicherfehler darf weder den Spielloop noch das Menü zum Absturz bringen.

## Nächste Refactor-Schritte

Der weitere Umbau sollte in kleinen, separat testbaren Änderungen erfolgen:

1. Eingabesteuerung für Tastatur, Touch und Gamepad in einen Controller-Hook
   verschieben.
2. Canvas-Zeichenfunktionen und Render-Konstanten in `rendering/` gruppieren.
3. Hangar, Shop, Einstellungen und Rangliste als eigene React-Module auslagern.
4. Selten geöffnete Menümodule erst nach der Trennung mit `React.lazy` laden.

Statische Dateitrennung allein verkleinert das ausgelieferte JavaScript nicht.
Lazy Loading ist deshalb erst sinnvoll, wenn die UI-Module keine großen Teile
der Kampf-Engine mehr importieren.

## Verifikation

Vor dem Zusammenführen einer Änderung müssen folgende Befehle erfolgreich sein:

```bash
pnpm test
pnpm run typecheck
pnpm run build
```
