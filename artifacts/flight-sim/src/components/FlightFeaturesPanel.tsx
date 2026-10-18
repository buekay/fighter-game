import { createLocalizer, translate, localizeCanvas } from "../i18n";
import { LanguageProvider, useLocalize } from "../i18n-react";
import { useState, useRef, useEffect } from 'react';
import { BOSS_NAMES, type EncounterKind } from '../boss-encounters';
import { DEFAULT_FLIGHT_OPTIONS, MASTERY_KILLS, MASTERY_PRECISION, loadMasteries, masteryFor, masteryUnlocked, masteryVariant, saveMasteries, type FlightOptions } from '../flight-features';

interface Props {
  completed: number; bosses: EncounterKind[];
  weapons: { id: string; name: string; pattern: string }[];
  onClose: () => void; onTraining: (options: FlightOptions) => void;
  coop: boolean; onCoop: (enabled: boolean) => void;
}
export function FlightFeaturesPanel({ completed, bosses, weapons, onClose, onTraining, coop, onCoop }: Props) {
  const localize = useLocalize();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => { panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus(); }, []);
  const [target, setTarget] = useState<FlightOptions['target']>('dummy');
  const [difficulty, setDifficulty] = useState<FlightOptions['difficulty']>('normal');
  const [masteries, setMasteries] = useState(loadMasteries);
  return <div className="flight-lab-overlay">
    <section ref={panelRef} className="flight-lab" onKeyDown={e => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select') ?? []);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }} role="dialog" aria-modal="true" aria-labelledby="flight-lab-title">
      <header><div><small>{localize("FIGHTER COMMAND / FLUGZENTRUM")}</small><h2 id="flight-lab-title">{localize("Neue Flugwege")}</h2></div><button onClick={onClose} aria-label={localize("Flugzentrum schließen")}>{localize("✕")}</button></header>
      <section><h3>{localize("Zu zweit ins Gefecht")}</h3><label className="flight-toggle"><input type="checkbox" checked={coop} onChange={e => onCoop(e.target.checked)} /> {localize(" Lokaler Koop für den nächsten Einsatz")}</label>
        <p>{localize("P1: WASD + Leertaste · P2: Pfeiltasten + Enter. Alternativ zwei Gamepads. Gemeinsamer Score, eigene Lebenspunkte.")}</p>
        <p>{localize("Zum Wiederbeleben 2,5 Sekunden im markierten Kreis bleiben. P2 hält die Team-Ulti mit rechter Umschalttaste (Gamepad: rechte Schultertaste) bereit; P1 löst innerhalb von 3 Sekunden eine ausgerüstete Ulti aus. Team-Abklingzeit: 20 Sekunden.")}</p>
        <small>{localize("Koop benötigt eine Tastatur oder zwei Gamepads. Im Koop steuert P1 immer mit WASD und Leertaste.")}</small>
      </section>
      <section><h3>{localize("Trainingsarena")}</h3><p>{localize("Teste deine aktuelle Ausrüstung mit laufender DPS-Anzeige. Besiegte Bosse lassen sich unbegrenzt üben. Training vergibt keine Credits, Erfolge oder Kampagnenfortschritte.")}</p>
        <div className="flight-lab-controls"><label>{localize("Ziel")}<select value={target} onChange={e => setTarget(e.target.value as FlightOptions['target'])}><option value="dummy">{localize("Unbewaffnete Übungsdrohne")}</option>{localize(bosses.map(kind => <option key={kind} value={kind}>{localize(BOSS_NAMES[kind])}</option>))}</select></label>
        <label>{localize("Schwierigkeit")}<select value={difficulty} onChange={e => setDifficulty(e.target.value as FlightOptions['difficulty'])}><option value="easy">{localize("Leicht · 60 % Tempo / Schaden")}</option><option value="normal">{localize("Normal")}</option><option value="hard">{localize("Schwer · 150 % Tempo / Schaden")}</option></select></label>
        <button className="flight-launch" onClick={() => onTraining({ ...DEFAULT_FLIGHT_OPTIONS, training: true, coop, target, difficulty })}>{localize("Training starten →")}</button></div>
        <small>{localize(bosses.length)}{localize("/5 Bosse freigeschaltet · ")}{localize(completed)} {localize(" Missionen abgeschlossen · Esc pausiert, dort zurück zum Hangar.")}</small>
      </section>
      <section><h3>{localize("Waffen-Meisterschaft")}</h3><p>{localize("Pro Waffe: ")}{localize(MASTERY_KILLS)} {localize(" Abschüsse und ")}{localize(MASTERY_PRECISION)} {localize(" Präzisionstreffer auf Boss-Bauteile oder Abschüsse ab einer 10er-Combo. Freigeschaltete Varianten kannst du hier ein- und ausschalten.")}</p>
        <div className="mastery-grid">{localize(weapons.map(w => { const m = masteryFor(masteries, w.id); const unlocked = masteryUnlocked(m); return <article key={w.id}><h4>{localize(w.name)}</h4><p>{localize(masteryVariant(w.pattern))}</p><small>{localize(Math.min(m.kills, MASTERY_KILLS))}{localize("/")}{localize(MASTERY_KILLS)} {localize(" Abschüsse · ")}{localize(Math.min(m.precision, MASTERY_PRECISION))}{localize("/")}{localize(MASTERY_PRECISION)} {localize(" Präzision")}</small><progress aria-label={localize(`${w.name} Meisterschaft`)} max={1} value={(Math.min(1, m.kills / MASTERY_KILLS) + Math.min(1, m.precision / MASTERY_PRECISION)) / 2} /><label><input type="checkbox" disabled={!unlocked} checked={unlocked && m.enabled} onChange={e => { const next = { ...masteries, [w.id]: { ...m, enabled: e.target.checked } }; saveMasteries(next); setMasteries(next); }} /> {localize(unlocked ? 'Variante aktiv' : 'Noch gesperrt')}</label></article>; }))}</div>
      </section>
      <section><h3>{localize("Unterwegs entdecken")}</h3><p>{localize("Jede Landschaft hat eigene angekündigte Gefahren. Folge einem goldenen Funksignal, um Wracks zu bergen, Piloten zu retten oder ein geheimes Fliegerass herauszufordern. Orange Boss-Module sind Waffen; blaue Module steuern Antrieb oder Schutz.")}</p></section>
      <button className="flight-launch" onClick={onClose}>{localize("Zurück zum Hangar")}</button>
    </section>
  </div>;
}
