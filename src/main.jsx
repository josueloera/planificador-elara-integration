import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClippyAssistant from './components/ClippyAssistant.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary capturó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#fff0f0', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ color: '#d32f2f' }}>⚠️ Ha ocurrido un error inesperado</h2>
          <p style={{ color: '#555', maxWidth: '600px', margin: '15px 0', fontSize: '14px', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2' }}>
            {this.state.error ? this.state.error.toString() : 'Error desconocido'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', backgroundColor: '#004aad', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔄 Recargar Aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <ClippyAssistant />
    </ErrorBoundary>
  </StrictMode>,
)

