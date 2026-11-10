import { useEffect, useMemo, useState } from 'react';
import { notasDelPeriodo } from '../seguimientoDocente';
import './QuarterlyReport.css';

const FIELDS = [
  ['LENGUAJES', 'Lenguajes'],
  ['SABERES', 'Saberes y pensamiento científico'],
  ['ETICA', 'Ética, naturaleza y sociedades'],
  ['HUMANO', 'De lo humano y lo comunitario']
];
const text = value => String(value ?? '').trim();
const normalized = value => text(value).replace(/_/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
const absent = estado => normalized(estado).startsWith('FALTA') || ['AUSENTE', 'INASISTENCIA', 'NO ASISTIO'].includes(normalized(estado));
const justified = estado => normalized(estado).includes('JUSTIFIC');

export default function QuarterlyReport({ ipc, contexto, grupo, periodo, trimestre, alumnos, variante }) {
  const [profiles, setProfiles] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [observations, setObservations] = useState({});
  const [loadError, setLoadError] = useState('');
  const periodName = periodo?.nombre || `${trimestre}º trimestre`;

  useEffect(() => {
    let active = true;
    setProfiles({}); setAttendance([]); setObservations({}); setLoadError('');
    if (!ipc || !grupo?.id || !periodo?.inicio || !periodo?.fin) return () => { active = false; };
    Promise.all([
      Promise.all((alumnos || []).map(async alumno => [alumno.id, await ipc.invoke('get-perfil', alumno.id)])),
      ipc.invoke('get-asistencia-rango', grupo.id, periodo.inicio, periodo.fin),
      ipc.invoke('get-config')
    ]).then(([profileRows, attendanceRows, config]) => {
      if (!active) return;
      setProfiles(Object.fromEntries(profileRows.map(([id, perfil]) => [String(id), perfil || {}])));
      setAttendance(Array.isArray(attendanceRows) ? attendanceRows : []);
      const byStudent = Object.fromEntries((alumnos || []).map(alumno => [String(alumno.id),
        notasDelPeriodo(config || {}, contexto, alumno.id, periodo)
          .filter(n => ['observaciones', 'retroalimentacion', 'comentarios'].some(key => text(n[key])))
      ]));
      setObservations(byStudent);
    }).catch(error => { if (active) setLoadError(error?.message || 'No fue posible cargar todos los datos complementarios.'); });
    return () => { active = false; };
  }, [ipc, contexto, grupo?.id, periodo?.inicio, periodo?.fin, alumnos]);

  const attendanceByStudent = useMemo(() => {
    const grouped = {};
    for (const row of attendance) {
      const id = String(row.alumno_id);
      (grouped[id] ||= []).push(row);
    }
    return grouped;
  }, [attendance]);

  const gradesFor = alumno => variante === 'primaria'
    ? FIELDS.map(([key, label]) => [label, alumno[key] ?? '—'])
    : [[grupo?.nombre_disciplina || grupo?.disciplina || grupo?.materia || 'Materia', alumno.promedioFinal ?? '—']];
  const average = useMemo(() => {
    const values = (alumnos || []).map(a => Number(a.promedioFinal)).filter(Number.isFinite);
    return values.length ? (values.reduce((sum, n) => sum + n, 0) / values.length).toFixed(1) : '—';
  }, [alumnos]);
  const countAbsences = rows => rows.filter(row => absent(row.estado)).length;

  return <section className="quarterly-report" aria-label="Reporte trimestral detallado">
    <header className="quarterly-cover">
      <div className="quarterly-kicker">REPORTE ACADÉMICO · {periodName}</div>
      <h2>Evaluación trimestral</h2>
      <p>{grupo?.escuela || grupo?.nombre_escuela || 'Centro escolar'} · {grupo?.grado || '—'}º {grupo?.seccion || grupo?.grupo || ''} · Ciclo {grupo?.ciclo_escolar || '—'}</p>
      <div className="quarterly-metrics">
        <div><strong>{(alumnos || []).length}</strong><span>Alumnos</span></div>
        <div><strong>{average}</strong><span>Promedio del grupo</span></div>
        <div><strong>{periodo?.inicio || '—'} – {periodo?.fin || '—'}</strong><span>Período evaluado</span></div>
        <div><strong>{(alumnos || []).reduce((total, a) => total + countAbsences(attendanceByStudent[String(a.id)] || []), 0)}</strong><span>Faltas registradas</span></div>
      </div>
    </header>

    {loadError && <p role="status" className="quarterly-load-note">Algunos datos complementarios no están disponibles: {loadError}</p>}
    <section className="quarterly-summary">
      <h3>Resumen general del grupo</h3>
      <table data-sheet-name="Resumen general">
        <thead><tr><th>No.</th><th>Alumno</th>{(variante === 'primaria' ? FIELDS.map(([, label]) => label) : [grupo?.nombre_disciplina || 'Materia']).map(label => <th key={label}>{label}</th>)}<th>Promedio trimestral</th><th>Faltas</th></tr></thead>
        <tbody>{(alumnos || []).map((alumno, index) => <tr key={alumno.id}>
          <td>{index + 1}</td><td>{alumno.nombre}</td>
          {gradesFor(alumno).map(([label, grade]) => <td key={label}>{grade}</td>)}
          {variante === 'primaria' && <td>{alumno.promedioFinal ?? '—'}</td>}
          {variante === 'secundaria' && <td>{alumno.promedioFinal ?? '—'}</td>}
          <td>{countAbsences(attendanceByStudent[String(alumno.id)] || [])}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <div className="quarterly-student-reports">
      {(alumnos || []).map((alumno, index) => {
        const perfil = profiles[String(alumno.id)] || {};
        const photo = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(perfil.foto_url || '') ? perfil.foto_url : '';
        const records = attendanceByStudent[String(alumno.id)] || [];
        const faltas = records.filter(row => absent(row.estado));
        const justificadas = faltas.filter(row => justified(row.estado));
        const presentes = records.length - faltas.length;
        const obs = observations[String(alumno.id)] || [];
        return <article key={alumno.id} className="quarterly-student" data-page-break="true">
          <header className="quarterly-student-heading">
            <div><span>REPORTE INDIVIDUAL · {periodName}</span><h3>{alumno.nombre}</h3><p>{grupo?.grado || '—'}º {grupo?.seccion || ''} · {grupo?.ciclo_escolar || ''}</p></div>
          </header>
          <h4>Información individual</h4>
          <table data-sheet-name={`${index + 1} ${alumno.nombre}`}>
            <thead><tr><th>Sección</th><th>Concepto / fecha</th><th>Detalle</th><th>Comentario / referencia</th></tr></thead>
            <tbody>
              <tr><th>Datos personales</th><td>Alumno</td><td>{alumno.nombre}</td><td>{periodName}</td></tr>
              <tr><th>Datos personales</th><td>Fotografía</td><td>{photo ? <img className="quarterly-photo-cell" src={photo} alt={`Foto de ${alumno.nombre}`} /> : 'Sin fotografía'}</td><td>CURP: {perfil.curp || 'Sin registrar'}</td></tr>
              <tr><th>Datos personales</th><td>Grado y grupo</td><td>{grupo?.grado || '—'}º {grupo?.seccion || '—'}</td><td>Ciclo escolar: {grupo?.ciclo_escolar || '—'}</td></tr>
              {gradesFor(alumno).map(([label, grade]) => <tr key={label}><th>Calificaciones</th><td>{label}</td><td>{grade}</td><td>Calificación trimestral</td></tr>)}
              <tr><th>Calificaciones</th><td>Promedio trimestral</td><td>{alumno.promedioFinal ?? '—'}</td><td>—</td></tr>
              <tr><th>Asistencia</th><td>Asistencias</td><td>{presentes}</td><td>Registros de asistencia del período</td></tr>
              <tr><th>Asistencia</th><td>Faltas</td><td>{faltas.length}</td><td>Justificadas: {justificadas.length}</td></tr>
              {faltas.length ? faltas.map((row, i) => <tr key={`${row.fecha}-${i}`}><th>Falta</th><td>{row.fecha}</td><td>{row.estado}</td><td>{justified(row.estado) ? 'Justificada' : 'Sin indicación de justificación'}</td></tr>) : <tr><th>Asistencia</th><td>Faltas</td><td>Sin faltas registradas</td><td>{periodo?.inicio || '—'} al {periodo?.fin || '—'}</td></tr>}
              {obs.length ? obs.map((note, i) => <tr key={`${note.fecha}-${i}`}><th>Observaciones</th><td>{note.fecha} · {note.campo || 'General'}</td><td>{note.observaciones || ''}</td><td>{[note.retroalimentacion, note.comentarios].filter(Boolean).join(' · ')}</td></tr>) : <tr><th>Observaciones</th><td>{periodName}</td><td>Sin observaciones registradas</td><td>—</td></tr>}
            </tbody>
          </table>
        </article>;
      })}
    </div>
  </section>;
}
