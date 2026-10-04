export function PackageLanding() {
  return <div className="package-landing">
    <svg viewBox="0 0 400 240" role="img" aria-label="Das beschützte Paket sinkt auf einen beleuchteten Landeplatz und setzt sicher auf.">
      <path d="M0 200 200 125 400 200V240H0Z" fill="#152f35" />
      <path d="m30 220 170-65 170 65M100 240l100-85 100 85M0 205h400" fill="none" stroke="#29494d" strokeWidth="2" />
      <ellipse cx="200" cy="200" rx="105" ry="31" fill="#091b26" stroke="#67e8f9" strokeWidth="3" />
      <ellipse cx="200" cy="200" rx="82" ry="23" fill="none" stroke="#67e8f9" strokeDasharray="10 8" opacity=".5" />
      <path d="M185 190v19m30-19v19m-30-10h30" stroke="#c1f5e8" strokeWidth="4" />
      {[100, 150, 250, 300].map((x, i) => <circle key={x} cx={x} cy={i === 0 || i === 3 ? 200 : 226} r="3" fill="#a5f3fc" />)}
      <ellipse className="package-landing-shadow" cx="200" cy="198" rx="47" ry="11" fill="#000" />
      <ellipse className="package-landing-dust" cx="200" cy="200" rx="56" ry="16" fill="none" stroke="#a5f3fc" strokeWidth="3" />
      <g className="package-landing-cargo">
        <g className="package-landing-engines" fill="#67e8f9">
          <path d="m148 170-30 7 30 5ZM148 195l-30 7 30 5Z" />
        </g>
        <path d="m148 166 77-3 27 24-27 24-77-3-10-21Z" fill="#17283f" stroke="#38bdf8" strokeWidth="2.5" />
        <rect x="161" y="171" width="38" height="32" rx="4" fill="#c08b2d" stroke="#fbbf24" strokeWidth="2" />
        <path d="M180 172v30m-18-15h36" stroke="#fcd34d" strokeWidth="3" />
        <path d="m212 173 17 14-17 14Z" fill="#67e8f9" />
        <circle cx="149" cy="173" r="3" fill="#a5f3fc" />
        <circle cx="149" cy="201" r="3" fill="#a5f3fc" />
      </g>
    </svg>
    <strong className="package-landing-confirmation">✓ PAKET SICHER GELANDET</strong>
  </div>;
}
