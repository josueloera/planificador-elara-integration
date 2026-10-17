import { promedioPeriodo } from '../evaluacionAutomatica.js';
export function construirReporteTrimestral({ alumnos, criterios, notas, automatica, variante }) {
  return alumnos.map(alumno => {
    const fila = { id: alumno.id, nombre: alumno.nombre };
    if (variante === 'secundaria') {
      const promedio = promedioPeriodo(criterios, notas, automatica, alumno.id);
      fila.promedioFinal = promedio === null ? '-' : promedio.toFixed(1);
    } else {
      const promedios = [];
      for (const campo of ['LENGUAJES', 'SABERES', 'ETICA', 'HUMANO']) {
        const seleccion = criterios.filter(c => c.campo === campo || (!c.campo && campo === 'LENGUAJES'));
        const promedio = promedioPeriodo(seleccion, notas, automatica, alumno.id);
        fila[campo] = promedio === null ? '-' : promedio.toFixed(1);
        if (promedio !== null) promedios.push(promedio);
      }
      fila.promedioFinal = promedios.length ? (promedios.reduce((a,b)=>a+b,0)/promedios.length).toFixed(1) : '-';
    }
    return fila;
  });
}
export async function cargarReporteTrimestral(ipcRenderer, { grupoId, periodo, variante }) {
  if (!grupoId) throw new Error('Selecciona primero un grupo.');
  const [alumnos, criterios, notas, automatica] = await Promise.all([
    ipcRenderer.invoke('get-alumnos', grupoId),
    ipcRenderer.invoke('get-criterios', grupoId),
    ipcRenderer.invoke('get-notas-rango', periodo.inicio, periodo.fin),
    ipcRenderer.invoke('get-evaluacion-automatica', grupoId, { inicio: periodo.inicio, fin: periodo.fin })
  ]);
  return construirReporteTrimestral({ alumnos: alumnos || [], criterios: criterios || [], notas: notas || [], automatica, variante });
}
