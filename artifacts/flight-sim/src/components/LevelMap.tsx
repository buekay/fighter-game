import { useEffect, useRef, useState } from 'react';
import { MAX_LEVEL } from '../game-rules';
import { getCampaignLandscape, getCampaignTarget, isCampaignBossLevel, isLevelUnlocked } from '../campaign';

// Deterministic shaded relief: coastlines, mountain ridges and woodland, generated locally.
function terrainImage(): string {
  const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 1600;
  const ctx = canvas.getContext('2d'); if (!ctx) return '';
  const image = ctx.createImageData(canvas.width, canvas.height);
  const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y); let u = x - ix, v = y - iy;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    return (hash(ix, iy) * (1-u) + hash(ix+1, iy)*u)*(1-v) + (hash(ix, iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;
  };
  const height = (x: number, y: number) => noise(x/190,y/190)*.54 + noise(x/73,y/73)*.26 + noise(x/28,y/28)*.13 + noise(x/9,y/9)*.07;
  for(let y=0;y<1600;y++) for(let x=0;x<600;x++) {
    const h = height(x,y), shade = Math.max(.55, Math.min(1.45, 1+(h-height(x-3,y-4))*12));
    let color = h < .37 ? [18,48+h*45,65+h*70] : h < .405 ? [124,133,104] : h < .61 ? [48+h*48,69+h*54,43+h*39] : h < .72 ? [121,123,108] : [191,200,192];
    const grain = (hash(x,y)-.5)*13;
    const i=(y*600+x)*4; for(let c=0;c<3;c++) image.data[i+c]=color[c]*shade+grain; image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0); return canvas.toDataURL('image/jpeg', .88);
}
const nodeX = (i: number) => 50 + Math.sin(i * 1.15) * 25;
export function LevelMap({ completed, onBack, onSelect }: { completed: number; onBack: () => void; onSelect: (level: number) => void }) {
  const [terrain, setTerrain] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { setTerrain(terrainImage()); }, []);
  useEffect(() => {
    const target = scroller.current?.querySelector<HTMLElement>('[data-current="true"]');
    if (target && scroller.current) scroller.current.scrollTop = Math.max(0, target.offsetTop - 170);
  }, []);
  return <section className="campaign-map" aria-label="Levelkarte">
    <header className="campaign-map-header">
      <button onClick={onBack} className="campaign-back">← Zurück</button>
      <div><span>EINSATZGEBIET</span><h1>Deine Flugroute</h1></div>
      <strong>{completed} / {MAX_LEVEL}<small>ABGESCHLOSSEN</small></strong>
    </header>
    <div className="campaign-map-scroll" ref={scroller} tabIndex={0} aria-label="Nach unten scrollen für weitere Level">
      <div className="campaign-terrain" style={{ backgroundImage: terrain ? `linear-gradient(90deg, #04131866, transparent 45%, #04131866), url(${terrain})` : undefined }}>
        <div className="campaign-map-intro"><b>MISSION WÄHLEN</b><p>Folge der Route. Jeder Sieg öffnet das nächste Level.</p><span>↓ Wischen oder scrollen · ☠ Bosslevel</span></div>
        {Array.from({ length: MAX_LEVEL }, (_, i) => {
          const level=i+1, unlocked=isLevelUnlocked(level,completed), done=level<=completed, current=level===Math.min(MAX_LEVEL,completed+1), boss=isCampaignBossLevel(level);
          const landscape=getCampaignLandscape(level);
          return <div key={level} className="campaign-map-stop" data-current={current}>
            {level<MAX_LEVEL && <svg className="campaign-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={`M ${nodeX(i)} 0 C ${nodeX(i)} 50, ${nodeX(i+1)} 50, ${nodeX(i+1)} 100`} className={done?'route-done':''}/></svg>}
            <div className="campaign-node-group" style={{ left:`${nodeX(i)}%` }}>
              <button disabled={!unlocked} onClick={()=>onSelect(level)} className={`campaign-node ${done?'done':''} ${current?'current':''} ${boss?'boss':''}`} aria-label={`Level ${level}${boss?', Bosslevel':''}${done?', abgeschlossen':unlocked?', verfügbar':', gesperrt'}`} title={unlocked?`${getCampaignTarget(level).toLocaleString('de-DE')} Punkte${boss?' und Boss besiegen':''}`:`Schließe zuerst Level ${level-1} ab`}>
                {boss ? <><span className="campaign-skull">☠</span><small>{level}</small></> : <span>{level}</span>}
                <i aria-hidden="true">{done?'✓':unlocked?'▶':'🔒'}</i>
              </button>
              <div className="campaign-node-label"><b>{current?'NÄCHSTER EINSATZ':boss?'BOSSGEBIET':`LEVEL ${level}`}</b><span>{landscape.name}</span></div>
            </div>
          </div>;
        })}
        <div className="campaign-map-end">ENDE DER FLUGROUTE</div>
      </div>
    </div>
  </section>;
}
