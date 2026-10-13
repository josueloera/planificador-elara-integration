import { useEffect, useRef, useState } from 'react';
import './Incidencias.css';

const nuevo = () => {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return { fecha: `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`, hora: `${pad(now.getHours())}:${pad(now.getMinutes())}`, lugar: '', involucrados: '', situacion: '', acciones: '', medidas: '' };
};
const campos = [['lugar', 'Lugar'], ['involucrados', 'Involucrados'], ['situacion', 'Descripción de los hechos'], ['acciones', 'Acciones realizadas'], ['medidas', 'Compromisos / acuerdos']];
const fechaVisible = fecha => /^\d{4}-\d{2}-\d{2}$/.test(fecha || '') ? fecha.split('-').reverse().join('/') : fecha;
const sello = value => value ? new Date(value).toLocaleString('es-MX') : '';

export default function Incidencias({ ipcRenderer, alumnoId }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(nuevo);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(null);
  const formRef = useRef(null);
  const lock = useRef(false);
  const refresh = async () => setRows(await ipcRenderer.invoke('get-incidencias', alumnoId));
  useEffect(() => {
    let active = true;
    ipcRenderer.invoke('get-incidencias', alumnoId).then(result => { if (active) setRows(result); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ipcRenderer, alumnoId]);
  const mutate = async (channel, data, success) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await ipcRenderer.invoke(channel, { ...data, alumno_id: alumnoId });
      if (!result?.success) throw new Error('No se pudo guardar el cambio.');
      setForm(nuevo()); setDeleting(null); setMessage(success);
      try { await refresh(); } catch { setError('El cambio se guardó, pero no se pudo actualizar la lista. Vuelve a abrir las incidencias.'); }
    } catch (e) { setError(e.message || 'No se pudo completar la operación.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const edit = row => {
    setForm({ ...nuevo(), ...Object.fromEntries(Object.entries(row).map(([k,v]) => [k, v ?? ''])) });
    setDeleting(null); setError(''); setMessage('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    formRef.current?.querySelector('input')?.focus();
  };
  return <section className="inc-registro">
    <form ref={formRef} onSubmit={e => { e.preventDefault(); mutate('save-incidencia', form, form.id ? 'Incidencia actualizada.' : 'Incidencia registrada.'); }}>
      <h3>{form.id ? 'Editar incidencia' : 'Registrar incidencia'}</h3>
      <p>Registra lo ocurrido y los acuerdos de seguimiento. La fecha y la descripción son obligatorias.</p>
      <fieldset disabled={busy || loading || deleting !== null}>
        <div className="inc-grid"><label>Fecha *<input required type="date" value={form.fecha} onChange={e => setForm({...form, fecha:e.target.value})}/></label><label>Hora<input type="time" value={form.hora} onChange={e => setForm({...form, hora:e.target.value})}/></label></div>
        {campos.map(([key, label]) => <label key={key}>{label}{key === 'situacion' ? ' *' : ''}<textarea rows={key === 'situacion' ? 4 : 2} required={key === 'situacion'} value={form[key]} onChange={e => setForm({...form, [key]:e.target.value})}/></label>)}
        <div className="inc-buttons"><button type="submit" className="inc-primary">{busy ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agregar incidencia'}</button>{form.id && <button type="button" onClick={() => {setForm(nuevo()); setError('');}}>Cancelar edición</button>}</div>
      </fieldset>
    </form>
    {error && <p className="inc-error" role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <h3>Historial de incidencias ({rows.length})</h3>
    {loading ? <p>Cargando incidencias…</p> : !rows.length && !error && <p>Aún no hay incidencias registradas.</p>}
    {rows.map(row => <article key={row.id}>
      <header><strong>{fechaVisible(row.fecha)}{row.hora ? ` · ${row.hora}` : ''}</strong><span>Incidencia #{row.id}</span></header>
      <dl>{campos.map(([key,label]) => row[key] ? <div key={key}><dt>{label}</dt><dd>{row[key]}</dd></div> : null)}</dl>
      {row.creado_en && <small>Registrada: {sello(row.creado_en)}</small>}{row.actualizado_en && row.actualizado_en !== row.creado_en && <small>Última modificación: {sello(row.actualizado_en)}</small>}
      {deleting === row.id ? <div className="inc-confirm" role="group" aria-label="Confirmar eliminación"><p>¿Eliminar la incidencia del {fechaVisible(row.fecha)}? Esta acción no se puede deshacer.</p><div className="inc-buttons"><button disabled={busy} className="inc-danger" onClick={() => mutate('delete-incidencia', { id:row.id }, 'Incidencia eliminada.')}>Sí, eliminar</button><button disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button></div></div> : <div className="inc-buttons"><button disabled={busy} onClick={() => edit(row)}>Editar</button><button disabled={busy} className="inc-danger" onClick={() => {setDeleting(row.id); setError('');}}>Eliminar</button></div>}
    </article>)}
  </section>;
}
