import { useState } from 'react';
import { BOSS_NAMES, type EncounterKind } from '../boss-encounters';
import { DEFAULT_FLIGHT_OPTIONS, MASTERY_KILLS, MASTERY_PRECISION, loadMasteries, masteryFor, masteryUnlocked, masteryVariant, saveMasteries, type FlightOptions } from '../flight-features';

interface Props {
  completed: number; bosses: EncounterKind[];
  weapons: { id: string; name: string; pattern: string }[];
  onClose: () => void; onTraining: (options: FlightOptions) => void;
  coop: boolean; onCoop: (enabled: boolean) => void;
}
export function FlightFeaturesPanel({ completed, bosses, weapons, onClose, onTraining, coop, onCoop }: Props) {
  const [target, setTarget] = useState<FlightOptions['target']>('dummy');
  const [difficulty, setDifficulty] = useState<FlightOptions['difficulty']>('normal');
  const [masteries, setMasteries] = useState(loadMasteries);
  return <div className="flight-lab-overlay">
    <section className="flight-lab" role="dialog" aria-modal="true" aria-labelledby="flight-lab-title">
      <header><div><small>FIGHTER COMMAND / FLUGZENTRUM</small><h2 id="flight-lab-title">Neue Flugwege</h2></div><button onClick={onClose} aria-label="Flugzentrum schließen">✕</button></header>
      <section><h3>Zu zweit ins Gefecht</h3><label className="flight-toggle"><input type="checkbox" checked={coop} onChange={e => onCoop(e.target.checked)} /> Lokaler Koop für den nächsten Einsatz</label>
        <p>P1: WASD + Leertaste · P2: Pfeiltasten + Enter. Alternativ zwei Gamepads. Gemeinsamer Score, eigene Lebenspunkte.</p>
        <p>Zum Wiederbeleben 2,5 Sekunden im markierten Kreis bleiben. P2 hält die Team-Ulti mit rechter Umschalttaste (Gamepad: rechte Schultertaste) bereit; P1 löst innerhalb von 3 Sekunden eine ausgerüstete Ulti aus. Team-Abklingzeit: 20 Sekunden.</p>
        <small>Koop benötigt eine Tastatur oder zwei Gamepads. Prüfe in den Einstellungen, dass P1 WASD verwendet.</small>
      </section>
      <section><h3>Trainingsarena</h3><p>Teste deine aktuelle Ausrüstung mit laufender DPS-Anzeige. Besiegte Bosse lassen sich unbegrenzt üben. Training vergibt keine Credits, Erfolge oder Kampagnenfortschritte.</p>
        <div className="flight-lab-controls"><label>Ziel<select value={target} onChange={e => setTarget(e.target.value as FlightOptions['target'])}><option value="dummy">Unbewaffnete Übungsdrohne</option>{bosses.map(kind => <option key={kind} value={kind}>{BOSS_NAMES[kind]}</option>)}</select></label>
        <label>Schwierigkeit<select value={difficulty} onChange={e => setDifficulty(e.target.value as FlightOptions['difficulty'])}><option value="easy">Leicht · 60 % Tempo / Schaden</option><option value="normal">Normal</option><option value="hard">Schwer · 150 % Tempo / Schaden</option></select></label>
        <button className="flight-launch" onClick={() => onTraining({ ...DEFAULT_FLIGHT_OPTIONS, training: true, coop, target, difficulty })}>Training starten →</button></div>
        <small>{bosses.length}/5 Bosse freigeschaltet · {completed} Missionen abgeschlossen · Esc pausiert, dort zurück zum Hangar.</small>
      </section>
      <section><h3>Waffen-Meisterschaft</h3><p>Pro Waffe: {MASTERY_KILLS} Abschüsse und {MASTERY_PRECISION} Präzisionstreffer auf Boss-Bauteile oder Abschüsse ab einer 10er-Combo. Freigeschaltete Varianten kannst du hier ein- und ausschalten.</p>
        <div className="mastery-grid">{weapons.map(w => { const m = masteryFor(masteries, w.id); const unlocked = masteryUnlocked(m); return <article key={w.id}><h4>{w.name}</h4><p>{masteryVariant(w.pattern)}</p><small>{Math.min(m.kills, MASTERY_KILLS)}/{MASTERY_KILLS} Abschüsse · {Math.min(m.precision, MASTERY_PRECISION)}/{MASTERY_PRECISION} Präzision</small><progress aria-label={`${w.name} Meisterschaft`} max={1} value={(Math.min(1, m.kills / MASTERY_KILLS) + Math.min(1, m.precision / MASTERY_PRECISION)) / 2} /><label><input type="checkbox" disabled={!unlocked} checked={unlocked && m.enabled} onChange={e => { const next = { ...masteries, [w.id]: { ...m, enabled: e.target.checked } }; saveMasteries(next); setMasteries(next); }} /> {unlocked ? 'Variante aktiv' : 'Noch gesperrt'}</label></article>; })}</div>
      </section>
      <section><h3>Unterwegs entdecken</h3><p>Jede Landschaft hat eigene angekündigte Gefahren. Folge einem goldenen Funksignal, um Wracks zu bergen, Piloten zu retten oder ein geheimes Fliegerass herauszufordern. Orange Boss-Module sind Waffen; blaue Module steuern Antrieb oder Schutz.</p></section>
      <button className="flight-launch" onClick={onClose}>Zurück zum Hangar</button>
    </section>
  </div>;
}
