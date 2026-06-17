// Logo Solora : le petit soleil ambré (même esprit que le splash / favicon),
// en SVG inline et transparent pour s'aligner avec le texte « Solora ».
export default function SunLogo({ className = 'w-7 h-7' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Solora">
      <defs>
        <radialGradient id="sunlogo" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#ffe16d" />
          <stop offset="65%" stopColor="#ffd000" />
          <stop offset="100%" stopColor="#f5a300" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="5.6" fill="url(#sunlogo)" />
      <g stroke="#f5a300" strokeWidth="2.3" strokeLinecap="round">
        <line x1="16" y1="3.4" x2="16" y2="6.6" />
        <line x1="16" y1="25.4" x2="16" y2="28.6" />
        <line x1="3.4" y1="16" x2="6.6" y2="16" />
        <line x1="25.4" y1="16" x2="28.6" y2="16" />
        <line x1="7.1" y1="7.1" x2="9.4" y2="9.4" />
        <line x1="22.6" y1="22.6" x2="24.9" y2="24.9" />
        <line x1="7.1" y1="24.9" x2="9.4" y2="22.6" />
        <line x1="22.6" y1="9.4" x2="24.9" y2="7.1" />
      </g>
    </svg>
  )
}
