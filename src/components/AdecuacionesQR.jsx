import React, { useEffect, useState } from 'react';
import { actividadAsignada } from '../qrAssignments';

const box = { padding: 16, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, marginBottom: 16 };
const button = { padding: '9px 14px', borderRadius: 6, border: '1px solid #94a3b8', cursor: 'pointer' };

export default function AdecuacionesQR({ alumnos, campos, fecha, ciclo, grupoId, ipcRenderer, actividades, onSaved, onSelect, showToast }) {
  const [campo, setCampo] = useState(campos[0]);
  const [marcados, setMarcados] = useState([]);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('TRABAJO');
  const [modo, setModo] = useState('ADAPTADA');
  const [destinatarios, setDestinatarios] = useState([]);
  const [editando, setEditando] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setReady(false); setMarcados([]); setDestinatarios([]); setNombre(''); setEditando(false); setError('');
    ipcRenderer.invoke('get-qr-adecuaciones', grupoId, ciclo.inicio, ciclo.fin, campo).then(ids => {
      if (active) { setMarcados(ids); setDestinatarios(ids); setModo('ADAPTADA'); setReady(true); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [ipcRenderer, grupoId, campo, ciclo.inicio, ciclo.fin, fecha]);
  const toggle = (ids, id) => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  const defaults = type => alumnos.filter(a => type === 'TODOS' || (type === 'ADAPTADA' ? marcados.includes(a.id) : !marcados.includes(a.id))).map(a => a.id);
  const execute = async work => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <section aria-label="Adecuaciones curriculares" style={{ color: '#1e293b' }}>
    <h3>Adecuaciones curriculares</h3>
    <p>Marca a los alumnos que realizan actividades diferentes y elige las tareas que corresponden a cada uno. Las tareas no asignadas se muestran como “No aplica” y no cuentan en su porcentaje.</p>
    <label>Materia / campo formativo <select aria-label="Materia de adecuaciones" disabled={busy} value={campo} onChange={e => setCampo(e.target.value)} style={{ padding: 8, margin: 8 }}>{campos.map(c => <option key={c}>{c}</option>)}</select></label>
    <p>Ciclo: {ciclo.inicio} al {ciclo.fin}. Actividades del {fecha}.</p>
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    <fieldset disabled={busy || !ready} style={box}>
      <legend><strong>1. Alumnos con adecuaciones curriculares</strong></legend>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {alumnos.map(a => <label key={a.id}><input type="checkbox" checked={marcados.includes(a.id)} onChange={() => setMarcados(toggle(marcados, a.id))} /> {a.nombre}</label>)}
      </div>
      <p>Esta selección se usa para las nuevas tareas de esta materia. Las actividades anteriores conservan sus destinatarios; puedes editarlos abajo.</p>
      <button style={button} onClick={() => execute(async () => {
        await ipcRenderer.invoke('save-qr-adecuaciones', grupoId, ciclo.inicio, ciclo.fin, campo, marcados);
        setDestinatarios(defaults(modo)); showToast?.('Alumnos con adecuaciones guardados.');
      })}>Guardar alumnos con adecuaciones</button>
    </fieldset>
    <fieldset disabled={busy || !ready} style={box}>
      <legend><strong>2. {editando ? 'Editar destinatarios' : 'Crear actividad'}</strong></legend>
      <label>Nombre de la actividad <input aria-label="Nombre de actividad adaptada" disabled={editando} value={nombre} onChange={e => setNombre(e.target.value)} style={{ padding: 8, margin: 8 }} /></label>
      <label>Apartado <select value={categoria} onChange={e => setCategoria(e.target.value)}><option value="TRABAJO">Trabajos de clase</option><option value="TAREA">Tareas</option></select></label>
      <label>Tipo <select aria-label="Tipo de actividad" value={modo} onChange={e => { setModo(e.target.value); setDestinatarios(defaults(e.target.value)); }} style={{ padding: 8, margin: 8 }}>
        <option value="ADAPTADA">Adaptada para alumnos seleccionados</option><option value="GENERAL">General (sin alumnos con adecuaciones)</option><option value="TODOS">Compartida con todo el grupo</option>
      </select></label>
      <p>Destinatarios: {destinatarios.length}. Puedes ajustar la selección para esta actividad.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {alumnos.map(a => <label key={a.id}><input type="checkbox" checked={destinatarios.includes(a.id)} onChange={() => setDestinatarios(toggle(destinatarios, a.id))} /> {a.nombre}{marcados.includes(a.id) ? ' · Adecuaciones' : ''}</label>)}
      </div>
      <button style={{ ...button, marginTop: 16, background: '#1d4ed8', color: 'white' }} onClick={() => execute(async () => {
        const saved = await ipcRenderer.invoke('save-qr-actividad', grupoId, fecha, { nombre, campo, modo, categoria, alumno_ids: destinatarios, editar: editando });
        await onSaved(); onSelect(saved); setNombre(''); setEditando(false); showToast?.('Actividad y destinatarios guardados.');
      })}>{editando ? 'Guardar destinatarios' : 'Crear actividad'}</button>
      {editando && <button style={{ ...button, marginLeft: 8 }} onClick={() => { setEditando(false); setNombre(''); setDestinatarios(defaults(modo)); }}>Cancelar edición</button>}
    </fieldset>
    <div style={box}>
      <h4>3. Actividades y alumnos asignados</h4>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr><th>Actividad</th><th>Tipo</th><th>Alumnos</th><th>Acciones</th></tr></thead><tbody>
        {actividades.filter(a => campos.length === 1 || a.campo === campo).map(a => <tr key={a.nombre} style={{ borderTop: '1px solid #e2e8f0' }}>
          <td style={{ padding: 10 }}>{a.nombre} · {a.categoria === 'TAREA' ? 'Tarea' : 'Trabajo'}</td><td>{a.modo === 'ADAPTADA' ? 'Adaptada' : a.modo === 'GENERAL' ? 'General' : 'Compartida'}</td>
          <td>{alumnos.filter(al => actividadAsignada(a, al.id)).map(al => al.nombre).join(', ') || 'Sin destinatarios'}</td>
          <td><button disabled={busy || !ready} style={button} onClick={() => { setNombre(a.nombre); setCategoria(a.categoria || 'TRABAJO'); setModo(a.modo || 'TODOS'); setDestinatarios(alumnos.filter(al => actividadAsignada(a, al.id)).map(al => al.id)); setEditando(true); }}>Editar destinatarios</button>{' '}<button style={button} onClick={() => onSelect(a, true)}>Calificar</button></td>
        </tr>)}
      </tbody></table></div>
    </div>
  </section>;
}
