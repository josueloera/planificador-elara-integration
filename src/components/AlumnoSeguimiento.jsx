import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { crearSeguimiento, diasDelMes, ESTADOS_ASISTENCIA, mesInicial, moverMes } from '../alumnoSeguimiento.js';

import { agruparTrabajosPorMateria, agruparEvaluacionesPorMateria } from '../alumnoUtils.js';

const dateLabel = fecha => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const notaLabel = valor => valor == null || String(valor).trim() === '' || !Number.isFinite(Number(valor)) ? 'Sin calificación' : Number(valor).toFixed(1);

export default function AlumnoSeguimiento({ detalle, automaticas, configCiclo, variante, materia }) {
  const { dias, limites } = useMemo(() => crearSeguimiento(detalle, automaticas, configCiclo), [detalle, automaticas, configCiclo]);
  const [mes, setMes] = useState(() => mesInicial(limites));
  const [fecha, setFecha] = useState(null);
  const [materiaAbierta, setMateriaAbierta] = useState(null);
  const dialog = useRef(null);
  const semanas = useMemo(() => diasDelMes(mes), [mes]);
  const minMes = limites.inicio.slice(0, 7), maxMes = limites.fin.slice(0, 7);
  const mesLabel = new Date(`${mes}-01T12:00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const dia = dias[fecha] || { estado: 'SIN_REGISTRO', trabajos: [], evaluaciones: [], incidencias: [] };
  const estado = ESTADOS_ASISTENCIA[dia.estado];
  const trabajosPorMateria = agruparTrabajosPorMateria(dia.trabajos, variante, materia);
  const evaluacionesPorMateria = agruparEvaluacionesPorMateria(dia.evaluaciones, variante, materia);
  const dentroCiclo = value => (!limites.inicio || value >= limites.inicio) && (!limites.fin || value <= limites.fin);
  const cambiarMes = value => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value) && (!minMes || value >= minMes) && (!maxMes || value <= maxMes)) setMes(value); };
  useEffect(() => {
    const element = dialog.current;
    if (fecha && !element.open) element.showModal();
    if (!fecha && element.open) element.close();
  }, [fecha]);

  return <section className="alumno-followup">
    <h3>Calendario de seguimiento</h3>
    <p className="alumno-muted">Selecciona un día para ver sus trabajos, calificaciones e incidencias. Un día sin registro no se considera falta.</p>
    <div className="alumno-calendar-nav">
      <button aria-label="Mes anterior" disabled={Boolean(minMes && mes <= minMes)} onClick={() => cambiarMes(moverMes(mes, -1))}>←</button>
      <label>Mes del calendario<input type="month" value={mes} min={minMes || undefined} max={maxMes || undefined} onChange={e => cambiarMes(e.target.value)} /></label>
      <button aria-label="Mes siguiente" disabled={Boolean(maxMes && mes >= maxMes)} onClick={() => cambiarMes(moverMes(mes, 1))}>→</button>
    </div>
    <ul className="alumno-calendar-legend" aria-label="Colores de asistencia">{Object.entries(ESTADOS_ASISTENCIA).map(([key, item]) => <li key={key}><span className={`alumno-state ${item.clase}`}>{item.letra}</span>{item.nombre}</li>)}</ul>
    <table className="alumno-calendar">
      <caption>{mesLabel}</caption>
      <thead><tr>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
      <tbody>{semanas.map((week, index) => <tr key={index}>{week.map((value, column) => {
        if (!value) return <td className="alumno-calendar-blank" key={column} />;
        const info = dias[value], status = ESTADOS_ASISTENCIA[info?.estado || 'SIN_REGISTRO'];
        const trabajos = info?.trabajos.length || 0, incidencias = info?.incidencias.length || 0, notas = info?.evaluaciones.length || 0;
        return <td key={value}><button type="button" className={`alumno-day ${status.clase} ${column > 4 ? 'weekend' : ''}`} data-date={value} disabled={!dentroCiclo(value)}
          aria-label={`${dateLabel(value)}: ${status.nombre}; ${trabajos} trabajos, ${notas} evaluaciones, ${incidencias} incidencias`} onClick={() => { setMateriaAbierta(null); setFecha(value); }}>
          <span className="alumno-day-number">{Number(value.slice(-2))}</span><span className="alumno-day-state">{status.letra}</span>
          <span className="alumno-day-markers">{trabajos > 0 && <span>{trabajos} T</span>}{notas > 0 && <span>{notas} C</span>}{incidencias > 0 && <span className="alumno-incident-marker">{incidencias} I</span>}</span>
        </button></td>;
      })}</tr>)}</tbody>
    </table>
    <p className="alumno-muted alumno-calendar-key">T: trabajos · C: calificaciones · I: incidencias. Los días fuera del ciclo están deshabilitados.</p>
    <dialog ref={dialog} className="alumno-day-dialog no-print" aria-labelledby="alumno-day-title" onCancel={event => { event.preventDefault(); setFecha(null); }} onClick={event => { if (event.target === event.currentTarget) setFecha(null); }}>
      <div className="alumno-day-detail">
        <header><div><p className="alumno-eyebrow">SEGUIMIENTO DE {detalle.alumno.nombre}</p><h2 id="alumno-day-title">{fecha ? dateLabel(fecha) : 'Detalle del día'}</h2></div><button type="button" autoFocus aria-label="Cerrar detalle del día" onClick={() => setFecha(null)}>Cerrar ✕</button></header>
        <p><strong>Asistencia: </strong><span className={`alumno-state ${estado.clase}`}>{estado.nombre}</span></p>
        <h3>Trabajos del día</h3>
        {trabajosPorMateria.length ? trabajosPorMateria.map(grupo => <section className="alumno-subject-work" key={grupo.id} aria-label={`Trabajos de ${grupo.nombre}`}>
          <h4>{grupo.nombre} <span>({grupo.registros.length})</span></h4>
          <div className="alumno-table-scroll"><table><thead><tr><th scope="col">Trabajo</th><th scope="col">Calificación</th></tr></thead><tbody>{grupo.registros.map(work => <tr key={work.id}><td>{work.nombre_trabajo}</td><td>{notaLabel(work.valor)}</td></tr>)}</tbody></table></div>
        </section>) : <p>No hay trabajos registrados este día.</p>}
        <h3>Evaluaciones del día</h3>
        {evaluacionesPorMateria.length ? <>
          <p className="alumno-muted">Selecciona una materia para ver sus criterios y calificaciones. El promedio respeta los porcentajes de los criterios evaluados.</p>
          <div className="alumno-table-scroll"><table className="alumno-subject-evaluations" aria-label="Evaluaciones del día por materia">
            <thead><tr><th scope="col">Campo / materia</th><th scope="col">Criterios evaluados</th><th scope="col">Promedio</th></tr></thead>
            <tbody>{evaluacionesPorMateria.map((grupo, index) => <Fragment key={grupo.id}>
              <tr><th scope="row"><button type="button" className="alumno-materia-toggle" aria-expanded={materiaAbierta === grupo.id} aria-controls={`alumno-criterios-${index}`} onClick={() => setMateriaAbierta(materiaAbierta === grupo.id ? null : grupo.id)}>
                <span>{grupo.nombre}</span><small>{materiaAbierta === grupo.id ? 'Ocultar criterios ▴' : 'Ver criterios ▾'}</small>
              </button></th><td>{grupo.evaluados}</td><td><strong>{notaLabel(grupo.promedio)}</strong></td></tr>
              {materiaAbierta === grupo.id && <tr className="alumno-criteria-row" id={`alumno-criterios-${index}`}><td colSpan={3}>
                <table className="alumno-criteria-table" aria-label={`Criterios de ${grupo.nombre}`}>
                  <thead><tr><th scope="col">Criterio</th><th scope="col">Peso</th><th scope="col">Calificación</th></tr></thead>
                  <tbody>{grupo.registros.map(nota => <tr key={nota.criterio_id}><th scope="row">{nota.criterio.nombre}</th><td>{nota.criterio.porcentaje != null ? `${nota.criterio.porcentaje}%` : 'Sin porcentaje'}</td><td>{notaLabel(nota.valor)}</td></tr>)}</tbody>
                  <tfoot><tr><th scope="row" colSpan={2}>Promedio de {grupo.nombre}</th><td><strong>{notaLabel(grupo.promedio)}</strong></td></tr></tfoot>
                </table>
              </td></tr>}
            </Fragment>)}</tbody>
          </table></div>
        </> : <p>No hay calificaciones registradas este día.</p>}
        <h3>Incidencias del día</h3>
        {dia.incidencias.length ? dia.incidencias.map(incident => <article className="alumno-incident" key={incident.id}><strong>{incident.situacion}</strong><p>{incident.medidas || 'Sin medidas registradas'}</p></article>) : <p>No hay incidencias registradas este día.</p>}
      </div>
    </dialog>
  </section>;
}
