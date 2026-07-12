import React, { useState, useEffect } from 'react';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Licencia = ({ onActivated, onVolver }) => {
  const [status, setStatus] = useState(null);
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = () => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-license-status').then(res => {
        setStatus(res);
        setCargando(false);
      });
    }
  };

  const handleActivar = () => {
    if (!clave.trim()) return;
    setError('');
    ipcRenderer.invoke('activate-license', clave).then(res => {
      if (res.success) {
        onActivated();
      } else {
        setError(res.error || 'Clave inválida.');
      }
    });
  };

  const handlePrueba = () => {
    ipcRenderer.invoke('start-trial').then(res => {
      if (res.success) {
        onActivated();
      } else {
        setError(res.error || 'No se pudo iniciar la prueba.');
      }
    });
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(status?.installationCode || '');
    alert('Código copiado al portapapeles');
  };

  if (cargando) return <div style={{textAlign: 'center', marginTop: 100}}>Cargando...</div>;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white', padding: '40px', borderRadius: '12px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🔐 Activación Requerida</h1>
        
        {status?.isTrialValid === false && status?.trialDaysRemaining <= 0 && status?.trialStartDate ? (
            <p style={{color: '#e74c3c', fontWeight: 'bold'}}>Tu periodo de prueba ha expirado.</p>
        ) : (
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>
              Para usar el Planificador Docente de forma ilimitada, adquiere una licencia permanente.
            </p>
        )}

        <div style={{
          background: '#ecf0f1', padding: '20px', borderRadius: '8px', marginBottom: '30px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#34495e' }}>
            Tu Código de Instalación:
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <code style={{
              fontSize: '1.5rem', fontWeight: 'bold', color: '#2980b9', 
              letterSpacing: '2px', userSelect: 'all'
            }}>
              {status?.installationCode}
            </code>
            <button 
              onClick={copiarCodigo}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem'
              }}
              title="Copiar Código"
            >
              📋
            </button>
          </div>
          <p style={{ margin: '10px 0 15px 0', fontSize: '0.8rem', color: '#7f8c8d' }}>
            Envía este código al desarrollador para recibir tu Clave de Activación.
          </p>
          <a 
            href={`https://wa.me/526271073044?text=${encodeURIComponent('Hola, me interesa adquirir la licencia del Planificador Docente. Mi código de instalación es: ' + (status?.installationCode || ''))}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#25D366', color: 'white', padding: '10px 20px', 
              borderRadius: '25px', textDecoration: 'none', fontWeight: 'bold',
              fontSize: '0.95rem', boxShadow: '0 4px 6px rgba(37, 211, 102, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar código por WhatsApp
          </a>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            style={{
              width: '100%', padding: '15px', fontSize: '1.2rem', textAlign: 'center',
              border: '2px solid #bdc3c7', borderRadius: '8px', outline: 'none',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}
          />
        </div>

        {error && <p style={{ color: '#e74c3c', marginTop: '-10px', marginBottom: '15px', fontWeight: 'bold' }}>{error}</p>}

        <button 
          onClick={handleActivar}
          style={{
            width: '100%', padding: '15px', background: '#27ae60', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold',
            cursor: 'pointer', marginBottom: '15px', transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = '#2ecc71'}
          onMouseOut={(e) => e.target.style.background = '#27ae60'}
        >
          ACTIVAR LICENCIA
        </button>

        {(!status?.isTrialValid && !status?.trialStartDate) && (
          <div>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
            <button 
              onClick={handlePrueba}
              style={{
                width: '100%', padding: '12px', background: 'transparent', color: '#3498db',
                border: '2px solid #3498db', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold',
                cursor: 'pointer', transition: 'all 0.3s'
              }}
              onMouseOver={(e) => { e.target.style.background = '#3498db'; e.target.style.color = 'white'; }}
              onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#3498db'; }}
            >
              Iniciar Prueba Gratuita de 7 Días
            </button>
          </div>
        )}

        {onVolver && (
          <button 
            onClick={onVolver}
            style={{
              width: '100%', padding: '12px', background: 'transparent', color: '#7f8c8d',
              border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold',
              cursor: 'pointer', transition: 'color 0.3s'
            }}
            onMouseOver={(e) => { e.target.style.color = '#34495e'; }}
            onMouseOut={(e) => { e.target.style.color = '#7f8c8d'; }}
          >
            Volver a la aplicación
          </button>
        )}
      </div>
    </div>
  );
};

export default Licencia;
