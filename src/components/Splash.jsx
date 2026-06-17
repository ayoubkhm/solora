// Écran de lancement animé : un soleil Solora qui éclot + anneau de chargement,
// puis le nom apparaît. L'overlay se fond ensuite pour révéler le site.
export default function Splash() {
  const rays = Array.from({ length: 12 })
  return (
    <div className="splash-wrap fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#fffdf3,#eaf1ff_70%)]">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <radialGradient id="sun" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#ffe16d" />
              <stop offset="65%" stopColor="#ffd000" />
              <stop offset="100%" stopColor="#f5a300" />
            </radialGradient>
          </defs>

          {/* Anneau de chargement */}
          <circle cx="100" cy="100" r="86" fill="none" stroke="#0b1c30" strokeOpacity="0.08" strokeWidth="3" />
          <circle
            className="splash-ring"
            cx="100"
            cy="100"
            r="86"
            fill="none"
            stroke="#006e1c"
            strokeWidth="3"
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />

          {/* Rayons */}
          <g className="splash-rays">
            {rays.map((_, i) => (
              <line
                key={i}
                x1="100"
                y1="100"
                x2="100"
                y2="36"
                stroke="#f5a300"
                strokeWidth="4"
                strokeLinecap="round"
                transform={`rotate(${i * 30} 100 100)`}
              />
            ))}
          </g>

          {/* Cœur du soleil */}
          <circle className="splash-sun" cx="100" cy="100" r="40" fill="url(#sun)" />
        </svg>
      </div>

      <div className="splash-word mt-8 flex items-center gap-2">
        <span className="font-headline-xl font-bold text-[28px] text-on-surface tracking-[0.15em]">SOLORA</span>
      </div>
    </div>
  )
}
