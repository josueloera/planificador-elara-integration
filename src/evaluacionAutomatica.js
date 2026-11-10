// Las fuentes QR conservan la fecha original de cada trabajo y asistencia.
export function rangoDelCiclo(config = {}) {
  const finales = Object.values(config.periodos || {}).map(p => p?.fin).filter(Boolean).sort();
  return { inicio: config.fechaInicioStr || '', fin: finales[finales.length - 1] || '' };
}

function notasConAutomaticas(notas, automatica) {
  const ids = new Set((automatica?.enlaces || []).map(e => Number(e.criterio_id)));
  const automaticas = (automatica?.notas || [])
    .filter(n => ids.has(Number(n.criterio_id)) && n.fecha)
    .map(n => ({ ...n, alumno_id: Number(n.alumno_id), criterio_id: Number(n.criterio_id) }));
  const clavesAutomaticas = new Set(automaticas.map(n => JSON.stringify([
    Number(n.alumno_id), Number(n.criterio_id), n.fecha
  ])));
  const manuales = (notas || []).filter(n => {
    const idCriterio = Number(n.criterio_id);
    if (!ids.has(idCriterio)) return true;
    const clave = JSON.stringify([Number(n.alumno_id), idCriterio, n.fecha]);
    return !clavesAutomaticas.has(clave);
  }).map(n => ({ ...n, alumno_id: Number(n.alumno_id), criterio_id: Number(n.criterio_id) }));
  // La nota QR reemplaza a la manual solo para el mismo alumno, criterio y fecha.
  return [...manuales, ...automaticas];
}

export function mezclarNotasAutomaticas(notas, automatica, fecha) {
  const mapa = {};
  for (const nota of notasConAutomaticas(notas, automatica)) {
    if (nota.fecha === fecha) mapa[`${nota.alumno_id}-${nota.criterio_id}`] = nota.valor;
  }
  return mapa;
}

const normalizarEstadoAsistencia = estado => String(estado ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
const ESTADOS_PRESENTE = new Set(['PRESENTE', 'ASISTENCIA', 'ASISTIO', 'RETARDO']);

export function asistenciaConfirmaPresente(asistencias, alumnoId, fecha) {
  const registros = Array.isArray(asistencias) ? asistencias : [];
  return registros.some(registro =>
    Number(registro.alumno_id) === Number(alumnoId) &&
    (!fecha || registro.fecha === fecha) &&
    ESTADOS_PRESENTE.has(normalizarEstadoAsistencia(registro.estado))
  );
}

export function promedioPeriodo(criterios, todasNotas, automatica, alumnoId, asistencias = []) {
  const ids = new Set(criterios.map(c => c.id));
  const porFecha = new Map();
  const notasEvaluadas = notasConAutomaticas(todasNotas, automatica);
  const fechasConActividad = new Set(notasEvaluadas.filter(nota =>
    ids.has(nota.criterio_id) && nota.fecha && nota.valor != null && String(nota.valor).trim() !== '' && Number.isFinite(Number(nota.valor))
  ).map(nota => nota.fecha));
  for (const nota of notasEvaluadas) {
    if (Number(nota.alumno_id) !== Number(alumnoId) || !ids.has(nota.criterio_id) || !nota.fecha) continue;
    if (!porFecha.has(nota.fecha)) porFecha.set(nota.fecha, new Map());
    porFecha.get(nota.fecha).set(nota.criterio_id, nota.valor);
  }
  const diarios = [];
  const fechasDelAlumno = new Set([
    ...porFecha.keys(),
    ...[...fechasConActividad].filter(fecha => asistenciaConfirmaPresente(asistencias, alumnoId, fecha))
  ]);
  for (const fecha of fechasDelAlumno) {
    const notasDia = porFecha.get(fecha) || new Map();
    const presente = asistenciaConfirmaPresente(asistencias, alumnoId, fecha);
    let suma = 0;
    let pesos = 0;
    for (const criterio of criterios) {
      const valor = notasDia.get(criterio.id);
      const peso = Number(criterio.porcentaje) || 0;
      if (valor != null && String(valor).trim() !== '' && Number.isFinite(Number(valor)) && peso > 0) {
        suma += Number(valor) * peso;
        pesos += peso;
      } else if (presente && fechasConActividad.has(fecha) && peso > 0) {
        // Si hay una actividad evaluada ese día, la asistencia confirma que la falta de nota es no entrega: cuenta como 0.
        pesos += peso;
      }
    }
    if (pesos > 0) diarios.push(suma / pesos);
  }
  return diarios.length ? Number((diarios.reduce((a, b) => a + b, 0) / diarios.length).toFixed(1)) : null;
}
