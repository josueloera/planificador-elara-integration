import { useEffect, useState } from 'react';
import { claveDocente, leerDocumento, guardarDocumento, moverPda } from '../seguimientoDocente';
import './SeguimientoDocente.css';
export default function DosificadorEditable({ ipc, contexto, plan, vistos, toggleVisto }) {
  const [actual, setActual] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const key = claveDocente('dosificador', contexto);
  useEffect(() => { let active = true; setActual(null); setError('');
    if (!contexto) return;
    leerDocumento(ipc, key, null).then(saved => { if(active) setActual(plan.map(s => ({...s, pdas: saved?.find(x => String(x.id) === String(s.id))?.pdas ?? s.pdas}))); }).catch(e => { if(active) setError(e.message); });
    return () => { active = false; };
  }, [ipc, key, plan, contexto]);
  const move = async (s,i,d,p) => {
    if(busy) return; setBusy(true); setError('');
    try { const next = moverPda(actual,s,i,d,p); await guardarDocumento(ipc,key,next.map(({id,pdas})=>({id,pdas}))); setActual(next); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="tabla-semanal"><p className="no-print">Cambia la semana de cada proyecto y usa las flechas para ordenar su contenido. Los cambios se guardan automáticamente.</p>
    {error && <p role="alert">{error}</p>}{!contexto && <p>Selecciona un grupo para organizar sus proyectos.</p>}{contexto && !actual && !error && <p>Cargando dosificador…</p>}
    {actual?.map(s => <div key={s.id} className="fila-semana"><div className="info-semana"><strong>Sem {s.id}</strong><br/><small>{s.fechas}</small><button className="no-print" onClick={()=>toggleVisto('dosif',s.id)}>{(vistos.dosif || []).includes(String(s.id)) ? 'Vista' : 'Marcar vista'}</button></div>
      <div className="contenido-semana">{!s.pdas?.length && <span>Sin contenido</span>}{s.pdas?.map((p,i) => <div key={i} className="chip-pda"><strong>{p.proyecto}</strong><p>{p.pda}</p><div className="no-print docente-mover">
        <label>Mover a <select aria-label={`Semana de ${p.proyecto}`} disabled={busy} value={s.id} onChange={e => move(s.id,i,e.target.value)}>{actual.map(t => <option key={t.id} value={t.id}>Semana {t.id}</option>)}</select></label>
        <button aria-label="Subir proyecto" disabled={busy || i === 0} onClick={()=>move(s.id,i,s.id,i-1)}>↑</button><button aria-label="Bajar proyecto" disabled={busy || i === s.pdas.length-1} onClick={()=>move(s.id,i,s.id,i+1)}>↓</button>
      </div></div>)}</div></div>)}
  </div>;
}
