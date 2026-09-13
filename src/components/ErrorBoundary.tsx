import { Component } from 'react';
import type { ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section className="form-sheet" role="alert">
          <h1>No pudimos abrir esta sección.</h1>
          <p>Puedes volver a intentarlo o ir a tus copias para recuperar tus datos.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Volver a intentar
            </button>
            <a className="btn btn-subtle" href="#/ajustes">
              Ir a mis copias
            </a>
          </div>
        </section>
      );
    return this.props.children;
  }
}
