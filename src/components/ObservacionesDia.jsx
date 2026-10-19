import { useEffect, useRef, useState } from 'react';
import { claveDocente, leerDocumento, guardarDocumento, notasDelPeriodo } from '../seguimientoDocente';
import './SeguimientoDocente.css';
const campos = [['observaciones','Observaciones'], ['retroalimentacion','Retroalimentación'], ['comentarios','Comentarios extras']];

function Editor({ ipc, contexto, alumno, fecha, campo, onClose }) {
  const dialog = useRef(null);
  const [value, setValue] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const key = claveDocente('observacion', contexto) + ':' + JSON.stringify([String(alumno.id), fecha, campo]);
  useEffect(() => {
    let active = true;
    dialog.current.showModal();
    leerDocumento(ipc, key, { alumnoId: alumno.id, fecha, campo, observaciones:'', retroalimentacion:'', comentarios:'' })
      .then(v => { if(active) setValue(v); }).catch(e => { if(active) setError(e.message); });
    return () => { active = false; };
  }, [ipc, key]);
  const close = () => { if (!busy && (!value || !dialog.current.dataset.dirty || confirm('¿Cerrar sin guardar los cambios?'))) onClose(); };
  const save = async () => {
    setBusy(true); setError('');
    try { await guardarDocumento(ipc, key, value); onClose(); }
    catch(e) { setError(e.message); setBusy(false); }
  };
  return <dialog ref={dialog} className="docente-dialog" aria-labelledby="observacion-title" onCancel={e => { e.preventDefault(); close(); }}>
    <h2 id="observacion-title">Trabajo del día: {alumno.nombre}</h2><p>{fecha} · {campo}</p>
    {error && <p role="alert">{error}</p>}
    {!value && !error && <p>Cargando observaciones…</p>}
    {value && campos.map(([id,label]) => <label key={id}>{label}<textarea disabled={busy} value={value[id] || ''} onChange={e => { dialog.current.dataset.dirty = 'true'; setValue({...value,[id]: e.target.value}); }}/></label>)}
    <footer><button onClick={close} disabled={busy}>Cancelar</button><button onClick={save} disabled={busy || !value}>{busy ? 'Guardando…' : 'Guardar observaciones'}</button></footer>
  </dialog>;
}
export function ObservacionesDia(props) {
  const [open, setOpen] = useState(false);
  return <><button className="no-print" type="button" disabled={!props.contexto} onClick={() => setOpen(true)} aria-haspopup="dialog">Observaciones</button>
    {open && <Editor {...props} onClose={() => setOpen(false)} />}</>;
}
export function ObservacionesTrimestre({ ipc, contexto, alumnos, periodo, campo }) {
  const [config, setConfig] = useState(null), [error, setError] = useState('');
  useEffect(() => { let active = true; setConfig(null); setError(''); ipc.invoke('get-config').then(c => { if(active) setConfig(c); }).catch(e => { if(active) setError(e.message); }); return () => { active = false; }; }, [ipc, contexto, periodo.inicio, periodo.fin]);
  return <section className="docente-observaciones"><h3>Observaciones, retroalimentación y comentarios del trimestre</h3>
    {error && <p role="alert">{error}</p>}{!config && !error && <p>Cargando observaciones…</p>}
    {config && <table><thead><tr><th>Alumno</th><th>Fecha / campo o asignatura</th>{campos.map(([id,label]) => <th key={id}>{label}</th>)}</tr></thead>
      <tbody>{alumnos.map(a => { const notas = notasDelPeriodo(config, contexto, a.id, periodo, campo).filter(n => campos.some(([id]) => n[id]?.trim()));
        return notas.length ? notas.map((n,i) => <tr key={`${a.id}-${i}`}><td>{a.nombre}</td><td>{n.fecha}<br/>{n.campo}</td>{campos.map(([id]) => <td key={id} style={{whiteSpace:'pre-wrap'}}>{n[id]}</td>)}</tr>) : <tr key={a.id}><td>{a.nombre}</td><td colSpan={4}>Sin observaciones registradas en este trimestre.</td></tr>;
      })}</tbody></table>}
  </section>;
}
