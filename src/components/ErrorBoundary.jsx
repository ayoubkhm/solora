import { Component } from 'react'

// Capture les erreurs de rendu pour éviter l'écran blanc total.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // En production on pourrait envoyer ça à un service de suivi d'erreurs.
    console.error('Erreur de rendu :', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6 bg-background">
          <span className="material-symbols-outlined text-error text-5xl">error</span>
          <h1 className="font-headline-md text-headline-md text-on-surface">Une erreur est survenue</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            L'application a rencontré un problème inattendu. Rechargez la page pour réessayer.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-primary-container text-on-primary-fixed font-label-md text-label-md px-6 py-3 rounded-xl hover:brightness-95 transition"
          >
            Recharger
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
