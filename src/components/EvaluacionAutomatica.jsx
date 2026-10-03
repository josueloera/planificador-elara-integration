import { useState } from 'react';

const boton = { padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e0', cursor: 'pointer' };

export function EstadoEvaluacionQR({ automatica, criterios, ipcRenderer, grupoId, onChanged, onError }) {
  const [ocupado, setOcupado] = useState(false);
  const enlaces = (automatica?.enlaces || []).filter(e => criterios.some(c => c.id === e.criterio_id));
  const desvincular = async criterioId => {
    if (ocupado) return;
    setOcupado(true);
    try {
      await ipcRenderer.invoke('desvincular-evaluacion-automatica', grupoId, criterioId);
      await onChanged();
    } catch (err) { onError(err.message); }
    finally { setOcupado(false); }
  };
  return (
    <section style={{ padding: '10px 20px', background: '#f0fff4', color: '#22543d', flexShrink: 0, fontSize: 13 }}>
      <strong>Control QR · Ciclo escolar {automatica?.ciclo || ''}</strong>
      <span> · {automatica?.inicio || 'Inicio'} al {automatica?.fin || 'Fin'}</span>
      <p style={{ margin: '5px 0' }}>
        {enlaces.length ? 'Los criterios QR se actualizan automáticamente con todos los registros del ciclo. ' : 'Vincula los criterios QR una vez para recibir las actualizaciones de todo el ciclo. '}
        La fecha seleccionada se aplica a las calificaciones manuales.
      </p>
      {enlaces.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {enlaces.map(e => <span key={e.criterio_id} style={{ background: '#fff', padding: '4px 8px', borderRadius: 6 }}>
          {criterios.find(c => c.id === e.criterio_id)?.nombre}: {e.tipo === 'asistencia' ? 'Asistencia' : 'Trabajos'} · automático{' '}
          <button type="button" disabled={ocupado} style={boton} onClick={() => desvincular(e.criterio_id)}>Desvincular</button>
        </span>)}
      </div>}
    </section>
  );
}

export function VincularEvaluacionQR({ criterios, grupoId, ipcRenderer, automatica, onClose, onDone }) {
  const [criterioId, setCriterioId] = useState(() => String(criterios[0]?.id || ''));
  const [tipo, setTipo] = useState('trabajos');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const guardar = async () => {
    if (ocupado || !criterioId || !grupoId) return;
    setOcupado(true);
    setError('');
    try {
      await ipcRenderer.invoke('configurar-evaluacion-automatica', {
        grupo_id: grupoId, criterio_ids: [Number(criterioId)], tipo, escala: 10
      });
      await onDone();
    } catch (err) { setError(err.message); setOcupado(false); }
  };
  const anterior = automatica?.enlaces?.find(e => e.criterio_id === Number(criterioId));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-vincular-qr" style={{ background: 'white', borderRadius: 12, padding: 24, width: 480, maxWidth: '90%', color: '#334155' }}>
        <h3 id="titulo-vincular-qr" style={{ marginTop: 0 }}>Vincular Control QR con Evaluación</h3>
        <p>Se utilizará todo el ciclo escolar: <strong>{automatica?.inicio} al {automatica?.fin}</strong>.</p>
        <p style={{ fontSize: 13 }}>La nota se recalculará al registrar o corregir asistencias y trabajos. El vínculo queda guardado aunque todavía no existan registros.</p>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Registros que alimentarán el criterio
          <select value={tipo} disabled={ocupado} onChange={e => setTipo(e.target.value)} style={{ display: 'block', padding: 10, width: '100%', marginTop: 5 }}>
            <option value="trabajos">Promedio de trabajos de la materia</option>
            <option value="asistencia">Asistencia del grupo (escala 0 a 10)</option>
          </select>
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Criterio de destino
          <select value={criterioId} disabled={ocupado} onChange={e => setCriterioId(e.target.value)} style={{ display: 'block', padding: 10, width: '100%', marginTop: 5 }}>
            {criterios.filter(c => c.id).map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.porcentaje}%)</option>)}
          </select>
        </label>
        {anterior && anterior.tipo !== tipo && <p>Este criterio cambiará de {anterior.tipo === 'asistencia' ? 'asistencia' : 'trabajos'} a {tipo === 'asistencia' ? 'asistencia' : 'trabajos'}.</p>}
        <p style={{ fontSize: 12 }}>Puedes ajustar las fechas en Configuración del ciclo escolar y desvincular el criterio desde Evaluación.</p>
        {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={boton} disabled={ocupado} onClick={onClose}>Cancelar</button>
          <button type="button" style={{ ...boton, background: '#27ae60', color: 'white' }} disabled={ocupado || !criterioId} onClick={guardar}>
            {ocupado ? 'Guardando…' : 'Guardar vinculación automática'}
          </button>
        </div>
      </div>
    </div>
  );
}
