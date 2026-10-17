import React, { useState } from 'react';
import { exportDocument } from '../utils/documentExport';

export default function ExportDocument({ title = 'Documento', selector, table = false, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (event, format) => {
    const root = selector ? document.querySelector(selector) : event.currentTarget.closest('[data-document]');
    setBusy(true); setError('');
    try { await exportDocument(root, title, format); }
    catch (e) { setError(e.message || 'No se pudo exportar el documento.'); }
    finally { setBusy(false); }
  };
  const button = { padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#f0f6ff', color: '#1e40af', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' };
  return <span className="no-print" data-export-controls style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', margin: '8px 0' }}>
    <button type="button" style={button} disabled={disabled || busy} onClick={e => run(e, 'pdf')}>Exportar PDF</button>
    <button type="button" style={button} disabled={disabled || busy} onClick={e => run(e, table ? 'excel' : 'word')}>Exportar {table ? 'Excel' : 'Word'}</button>
    {error && <span role="alert" style={{ color: '#b91c1c' }}>{error}</span>}
  </span>;
}
