// Petite icône d'info avec infobulle au survol (et au focus clavier / tap).
// Si `href` est fourni, l'icône devient un lien (ouvre la ressource dans un nouvel onglet)
// et l'infobulle invite à cliquer pour en savoir plus.
// `align` : 'right' (par défaut) ou 'left' selon la place disponible.
export default function InfoTooltip({ text, href, align = 'right' }) {
  const bubble = (
    <span
      role="tooltip"
      className={
        'pointer-events-none absolute z-50 bottom-full mb-2 w-64 rounded-lg bg-on-surface text-inverse-on-surface ' +
        'text-left font-body-sm text-body-sm font-normal p-3 shadow-lg opacity-0 translate-y-1 transition ' +
        'group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 ' +
        (align === 'left' ? 'left-0' : 'right-0')
      }
    >
      {text}
      {href && (
        <span className="block mt-2 font-label-sm text-label-sm text-inverse-primary">
          Cliquez pour les ressources officielles →
        </span>
      )}
    </span>
  )

  const icon = (
    <span className="material-symbols-outlined text-[16px] leading-none">info</span>
  )

  return (
    <span className="relative inline-flex group align-middle">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="En savoir plus sur les aides"
          className="ml-1 inline-flex items-center justify-center opacity-70 hover:opacity-100 focus:opacity-100 outline-none cursor-pointer"
        >
          {icon}
        </a>
      ) : (
        <button
          type="button"
          aria-label="Plus d'informations"
          className="ml-1 inline-flex items-center justify-center cursor-help opacity-70 hover:opacity-100 focus:opacity-100 outline-none"
        >
          {icon}
        </button>
      )}
      {bubble}
    </span>
  )
}
