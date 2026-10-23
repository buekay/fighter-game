# Fighter Game

Local development workspace for the 2D fighter game.

## Requirements

- Node.js 24
- pnpm 11.9.0 (in `package.json` festgelegt)

## Install

```bash
pnpm install
```

Dependencies are installed in this workspace. The local pnpm store is ignored by git at `.pnpm-store/`.

## Run Locally

Run the game frontend:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173/
```

The root `start` and `dev` package scripts call `./start-app.sh`, which runs `@workspace/flight-sim`.

**Start** im Hangar öffnet die Levelkarte zur Auswahl einer neuen Mission.

## Verify

Run the focused rule tests:

```bash
pnpm test
```

Run type checking:

```bash
pnpm run typecheck
```

Run the production build:

```bash
pnpm run build
```

## Workspace Map

- `artifacts/flight-sim` - React/Vite canvas game app
- `docs/architecture.md` - Modulgrenzen, Persistenz- und Performance-Regeln

## Gameplay Rules

- Projectile collisions follow the complete flight path between frames, including moving targets, shields, decoys, and the protect objective. Shots crossing the screen edge still resolve their final hits.
- Every shot in a volley can hit during the same frame. Shots remaining after an enemy is destroyed stay available for other targets.
- Ramming enemies respect post-hit invulnerability. Shielded body collisions grant a short grace period so sustained contact cannot drain the shield every frame.
- Losing a life deploys the aircraft and equipment from the next unlocked hangar with full health, keeping the current mission and score. Hangars wrap back to the first unlocked bay; losing the final life still ends the run.
- Missions progress through 500 levels. Landscapes rotate every level through city, desert, ocean, plains, arctic, canyon, volcano, jungle, storm, and space. Background music and flight shadows use this same landscape selection.
- The tank, spider robot, submarine, and city use enlarged mechanical models with metal armor, pistons, joints, reactors, damage marks, and a shared phase-marked boss health bar. Each has three unique special attacks with 1.5 seconds of locked-target warning; attacks pause when frozen and accelerate in later health phases. The city shares one attack controller and health bar across its surviving defense systems. The Titan retains its original model, size, health bar, and abilities.
- Boss Fight mode has five encounters in order: Titan, tank, spider robot, submarine, and fortress city. Each encounter starts with 9,000 HP; the city splits this pool across six destructible flame, rocket, and cannon defenders. Destroy all defenders to complete the final encounter.
- Boss encounters are available from level 3. Early milestone bosses appear at levels 3, 5, 8, 10, 12, 15, and 18. The five major bosses appear at levels 20 (Titan), 25 (tank), 30 (spider robot), 35 (submarine), and 40 (city). From level 50, this order repeats every ten levels: 50/60/70/80/90, then 100/110/120/130/140, and so on. Level progression waits for each major boss encounter to finish; large score gains cannot skip an encounter.
- TIE fighters perform an evasive vertical dodge roughly every 1.5 seconds.
- Each of the ten landscape types has eight themed enemies: the original three plus five additional opponents with their own colors and combat stats. New delta fighters, orbital probes, walkers, artillery batteries, and frigates add distinct silhouettes. Day and night variants share their landscape's enemy pool.
- The additional enemies unlock one per return to their landscape: the first appears on levels 11–20, the second on 21–30, the third on 31–40, the fourth on 41–50, and the fifth on 51–60. Unlocked enemies remain in that landscape's random spawn pool on later visits; the first ten levels use the original three.
- Biome enemy models are centered and fitted to their existing collision boxes, including wing tips, rotors, cannons, and feet. Exhaust and combat indicators retain their cosmetic sizing.
- From level 20 onward, specialist enemies can appear: healers repair damaged allies, shield generators protect nearby ships, and kamikaze fighters rush the player.
- From level 50 onward, enemies can also spawn as armored, swift, or frenzied elites with increased score rewards.
- Near misses extend the current combo window, load ultimates, and award bonus score.
- Every fourth level rotates an endless-sector mutator. Every tenth level offers three random choices from a pool of 15 risk/reward routes.
- Bosses announce phase changes and telegraph their radial special attacks.
- Flawless formation waves award triple credits, and the end-of-run report records combat statistics and per-mode personal records.
- At the end of a mission, the score is converted to credits at a 1:1 rate (for example, 1,000 points award 1,000 credits).
- Shop skins and upgrades are displayed in rarity order: rare, epic, legendary, ultra legendary, then ultimate. Rarities retain their original colors with subtle material shadows; ultimate uses an iridescent, colorful silver treatment without a neon halo.
- Purchasable shop items cost 50,000 credits for rare, 100,000 credits for epic, 200,000 credits for legendary, 400,000 credits for ultra legendary, and 1,000,000 credits for ultimate rarity. The default Steel skin remains free.

## Deployment Notes

The game production build is written to:

```text
artifacts/flight-sim/dist/public
```

## Cleanup

Remove installed dependencies and the local pnpm store:

```bash
rm -rf node_modules .pnpm-store
```

## Kampf-Extras

Aktive Fähigkeiten unter **Shop → Ultis** kaufen und in einem der drei Ulti-Plätze ausrüsten. Auslösen mit der Taste des Slots (standardmäßig **1/2/3**), den bestehenden Touch-Ulti-Tasten oder Gamepad-Schultertasten. Neue Käufe werden automatisch ausgerüstet. Dauerhafte Upgrades stehen unter **Shop → Extras**. Bereits gekaufte Gegenstände bleiben erhalten; frühere Extras können im Ulti-Loadout ausgewählt werden.

| Extra | Bedienung | Wirkung |
| --- | --- | --- |
| Schatten-Dash | Ulti-Slot | 140 px entlang der letzten Bewegung (ohne Bewegung nach vorn), 0,25 s Schutz, 1,5 s Ablenk-Doppelgänger; 6 s Abklingzeit |
| Perfekter Konter | Ulti-Slot | 0,25 s Abwehrfenster; nächster Hauptwaffen-Feuerstoß macht doppelten Schaden, Ladung verfällt nach 5 s; 4 s Abklingzeit |
| Magnetfaust | Ulti-Slot | 1,5 s Sog auf normale Gegner und nahe Pickups; 10 s Abklingzeit; Bosse und Lasergeräte immun |
| Letzter Funke | Automatisch | Einmal pro Einsatz tödlichen Treffer mit 1 HP überleben, 12 Schaden und Geschossräumung in 230 px Radius; Verbrauch bleibt beim Fortsetzen gespeichert |
| Chaos-Pickup | Jeden 15. Abschuss einsammeln | Zufällig 8 s Schnellfeuer (35 % kürzeres Feuerintervall), Feuerkraft (+35 % Hauptwaffenschaden) oder Magnetfeld; ersetzt den vorigen Effekt |
| Feuerkern | Dauerhaft | +15 % Hauptwaffenschaden; Dash hinterlässt 2 s Brandspur mit 8 Schaden/s |

Auch Chaos-Feuer, das Feuerschwert und aktive Feuer-Ultis (Lava, Solaris,
X-Wing, Caelus) entzünden die Dash-Spur. Der Magnet zieht bei einer aktiven
Brandspur zum entfernten Spurende. Gegner-Schilde, Titanenschutz und getauchte
U-Boote behalten ihre Schutzregeln. Pausieren hält alle Extra-Timer an.
Die drei neuen Ultis nutzen die vorhandenen Ladebalken und Touch-Steuerung. Ulti-Boost beschleunigt auch ihre Aufladung um 50 %.

Die Regeln werden in `src/combat-extras.test.ts` einschließlich 30/60/120-Hz-Timing,
Einmal-Rettung, Fortsetzen, Chaos-Ablauf und Kombinationsgeometrie geprüft.

## Erfolge

Die Erfolgsübersicht zeigt den Fortschritt des aktuellen beziehungsweise letzten
Einsatzes mit Zähler und Fortschrittsbalken. Einsatzstatistiken werden im
Spielstand gespeichert und beim Fortsetzen wiederhergestellt. Ein neuer Einsatz
beginnt bei null; freigeschaltete Erfolge bleiben erhalten und ihre Belohnungen
werden nur einmal vergeben. Ältere Spielstände ohne Statistiken starten mit
null Fortschritt.

## Flugzentrum, Erkundung und Koop

Im Hangar öffnet **✦ Flugzentrum** die Trainingsarena, Koop-Einstellung und
Waffen-Meisterschaft. Die normale Starttaste führt weiterhin auf die Levelkarte.

- **Boss-Bauteile:** Die fünf großen Bosse besitzen orange markierte Waffen und
  blaue Antriebs-/Schutzmodule mit eigenen HP. Gezielte Treffer zerstören Module:
  Railgun, Netzwerfer und Torpedorohr verlieren ihren zugehörigen Spezialangriff;
  beschädigte Antriebe bremsen Bewegung, der Titan verliert seinen Schild und das
  U-Boot kann nicht mehr tauchen. Stadtgeschütze lassen sich einzeln entwaffnen.
- **Umgebungsgefahren:** Alle zehn Landschaften besitzen eigene Hindernisse.
  Natürliche Felskonturen, bodengebundene Baumkronen und Eisberge, Wasserhosen,
  fallende Trümmer und ballistische Vulkanbrocken. Asteroiden driften ohne
  Schwerkraft. Wind- und Sandfronten schieben weich an; Blitze werden zwei Sekunden
  angekündigt und dauern nur 0,22 Sekunden. Übrige Gefahren warnen 1,5 Sekunden. Während Bosskämpfen werden Hindernisse entfernt.
- **Geheimnisse:** Goldene Funksignale anfliegen. Wracks bergen und Piloten retten
  erfordern drei Sekunden Nähe; das Fliegerass zahlt erst nach dem Sieg aus.
  Ein verpasstes Signal verfällt ohne Strafe.
- **Meisterschaft:** Je Waffe 40 Abschüsse und 12 Präzisionstreffer auf Bauteile
  bzw. Abschüsse ab einer 10er-Combo. Varianten erweitern Schussmuster,
  Raketenzielwahl oder Nahkampfreichweite und sind im Flugzentrum abschaltbar.
- **Training:** Aktuelle Ausrüstung gegen eine unbewaffnete Übungsdrohne oder
  bereits besiegte Bosse testen. Drei Schwierigkeiten, laufender Fünf-Sekunden-DPS,
  automatische Ziel-Neustarts. Solo-Training verhindert tödliche Treffer.
  Training verändert weder Credits/Juwelen noch Rekorde, Erfolge, Meisterschaft
  oder Kampagnenfortschritt und überschreibt keinen Missionsspielstand.
- **Lokaler Koop:** Vor dem Missionsstart aktivieren. P1 nutzt WASD + Leertaste,
  P2 Pfeiltasten + Enter; alternativ zwei Gamepads. Beide verwenden die ausgerüsteten
  Hauptwaffen und haben eigene HP. In der Nähe eines ausgefallenen Piloten bleiben
  (2,5 Sekunden), um ihn mit halben HP zu retten. Beide ausgefallen beendet den Run.
  P2 aktiviert die Team-Bereitschaft mit rechter Umschalttaste bzw. rechter
  Gamepad-Schultertaste; eine erfolgreiche P1-Ulti innerhalb von drei Sekunden
  löst zusätzlich einen gemeinsamen Schutz-/Angriffspuls aus (20 Sekunden Cooldown).
  Koop ist auch im Training möglich. Koop-Einsätze haben keine Fortsetzen-Checkpoints.

`flight-features.test.ts` prüft Bauteiltreffer, deaktivierte Boss-Spezialangriffe,
Gefahren bei 30/60/120 Hz, Meisterschaft und Speicherfehler sowie beide
Wiederbelebungsrichtungen und die DPS-Zeitfenster.

## Elementgeister

Umgebungsereignisse erwecken Geister aus unbelebter Materie. Glut und Wasser
bringen freundliche Glut- und Quellgeister hervor; Sturm und zerbrechende Materie
wecken feindliche Sturm- und Splittergeister. Die Geister erscheinen beim Ende
der Gefahrenwarnung und bleiben 16 Sekunden. Sie haben keine Menschen- oder
Tierkörper, sondern bestehen aus schwebenden Elementfragmenten.

Grüne Markierungen zeigen Helfer: Anfliegen heilt das aktive Team um bis zu drei
HP und gibt P1 einen Schutzschild. Rote Markierungen zeigen Feinde: Ihr Kern
verursacht Kontaktschaden. Im äußeren Ring 2,5 Sekunden in der Nähe bleiben,
um einen feindlichen Geist zu beruhigen; der Kreis zeigt den Fortschritt. Danach
kann auch dieser Geist helfen. Während der ersten 1,2 Sekunden erwachen Geister
ohne Kontaktschaden. Bosskämpfe räumen Geister ab; Training und Tutorial erzeugen
keine Begegnungen. Pause hält alle Geister-Timer an.

## Geisterwelten

Geisterwelten werden ab Level 15 freigeschaltet. Level 15 bleibt ein Bosslevel;
die erste Geisterwelt erscheint in Level 16, danach nur alle 8 Level: 24, 32, 40 …
Diese Sektoren führen abwechselnd ins
Nebelreich, die Splitterdimension und den Geistersturm. Die Levelkarte nennt die
Geisterwelt. In diesen Sektoren haben Geisterwelten Vorrang vor regulären Bossbegegnungen.

In diesen Sektoren bestehen die Gegner aus durchscheinenden Geisterflugzeugen:
Nebeljäger, Phantomflügel und Seelenbomber. Schattierte Rümpfe, Glaskanzeln und
Tragflächen geben ihnen räumliche Materialwirkung. Sie behalten sichtbare, treffbare
Umrisse und hinterlassen auslaufende Geisterschleier. Eigene Himmelspaletten, Portale,
schwebende Ruinen, Lichtpartikel und Nebelbänder ersetzen die normalen Landschaften.
Gefahren erscheinen in durchscheinender Geisterfarbe; Elementgeister können auch
hier freundlich oder feindlich sein. Reduzierte Bewegung friert kosmetisches
Pulsieren, Nachbildbewegung und Hintergrundbewegung ein.


### Elementare Geisterflugzeuge

In Geisterwelten erscheinen acht eigene Flugzeugtypen mit sichtbaren Elementfarben:

| Flugzeug | Element und Form | Geschosse |
| --- | --- | --- |
| Glutphantom | Feuer, gepfeilte Flügel und glühende Risse | Zwei orange Glutgeschosse |
| Gezeitengeist | Wasser, geschwungene Flügel | Drei türkise Wassertropfen |
| Splitterflügel | Kristall, gezackte Facetten | Fünf violette Splitter im Fächer |
| Donnererscheinung | Sturm, versetzte Blitzflügel | Ein schnelles gelbes Blitzgeschoss |

Die Angriffe zielen auf das aktuelle Angriffsziel, einschließlich Ablenkungen und
Beschützen-Missionen. Farben und Schussformen bleiben unabhängig von der jeweiligen
Geisterwelt. Alle acht Typen sind ab der ersten Geisterwelt verfügbar.

Weitere Geisterflugzeuge: Aschenschwinge (Feuer, vier bernsteinfarbene Schüsse),
Nebellanze (Wasser, schneller blauer Präzisionsschuss), Frostkrone (Kristall,
sieben eisblaue Splitter) und Sturmsichel (Sturm, drei violette Blitzgeschosse).
Jeder Typ besitzt eine eigene Silhouette sowie eigene Geschwindigkeiten und Feuerpausen.
