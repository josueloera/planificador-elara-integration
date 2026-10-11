export const ESTADOS_ASISTENCIA = {
  PRESENTE: { clase: 'presente', letra: 'P', nombre: 'Presente' },
  RETARDO: { clase: 'retardo', letra: 'R', nombre: 'Retardo' },
  FALTA: { clase: 'falta', letra: 'F', nombre: 'Falta' },
  JUSTIFICADO: { clase: 'justificado', letra: 'J', nombre: 'Justificado' },
  SIN_REGISTRO: { clase: 'sin-registro', letra: '—', nombre: 'Sin registro' }
};

export function fechaEscolar(value) {
  const fecha = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return '';
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? fecha : '';
}

export function limitesSeguimiento(config = {}) {
  const periodos = Object.values(config?.periodos || {});
  const inicios = periodos.map(p => fechaEscolar(p?.inicio)).filter(Boolean).sort();
  const finales = periodos.map(p => fechaEscolar(p?.fin)).filter(Boolean).sort();
  return { inicio: fechaEscolar(config?.fechaInicioStr) || inicios[0] || '', fin: finales.at(-1) || '' };
}

export function diasDelMes(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return [];
  const [year, month] = mes.split('-').map(Number);
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - offset + 1;
      return day < 1 || day > count ? null : `${mes}-${String(day).padStart(2, '0')}`;
    })
  );
}

export function moverMes(mes, delta) {
  const [year, month] = mes.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function mesInicial(limites, hoy = new Date()) {
  let mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  if (limites.inicio && mes < limites.inicio.slice(0, 7)) mes = limites.inicio.slice(0, 7);
  if (limites.fin && mes > limites.fin.slice(0, 7)) mes = limites.fin.slice(0, 7);
  return mes;
}

export function crearSeguimiento(detalle, automaticas = {}, config = {}) {
  const limites = limitesSeguimiento(config);
  const dias = {};
  const alumnoId = Number(detalle.alumno.id), grupoId = Number(detalle.alumno.grupo_id);
  const pertenece = row => (row.alumno_id == null || Number(row.alumno_id) === alumnoId) &&
    (row.grupo_id == null || Number(row.grupo_id) === grupoId);
  const getDia = value => {
    const fecha = fechaEscolar(value);
    if (!fecha || (limites.inicio && fecha < limites.inicio) || (limites.fin && fecha > limites.fin)) return null;
    return dias[fecha] ||= { fecha, estado: 'SIN_REGISTRO', asistencia: null, trabajos: [], evaluaciones: [], incidencias: [] };
  };
  for (const row of detalle.asistencia || []) {
    if (!pertenece(row)) continue;
    const dia = getDia(row.fecha);
    if (dia && (!dia.asistencia || Number(row.id || 0) >= Number(dia.asistencia.id || 0))) {
      dia.asistencia = row;
      const estado = String(row.estado || '').trim().toUpperCase();
      dia.estado = ESTADOS_ASISTENCIA[estado] ? estado : 'SIN_REGISTRO';
    }
  }
  for (const [source, key] of [[detalle.trabajos, 'trabajos'], [detalle.incidencias, 'incidencias']]) {
    for (const row of source || []) {
      if (!pertenece(row)) continue;
      getDia(row.fecha)?.[key].push(row);
    }
  }
  const criterios = new Map((detalle.criterios || []).filter(pertenece).map(c => [Number(c.id), c]));
  const enlaces = new Set(Object.values(automaticas).flatMap(a => a?.enlaces || []).map(e => Number(e.criterio_id)));
  const notas = [
    ...(detalle.notas || []).filter(n => !enlaces.has(Number(n.criterio_id))),
    ...Object.values(automaticas).flatMap(a => (a?.notas || []).filter(n => enlaces.has(Number(n.criterio_id))))
  ];
  const unicas = new Map();
  for (const nota of notas) {
    if (!pertenece(nota) || !criterios.has(Number(nota.criterio_id))) continue;
    const dia = getDia(nota.fecha);
    if (!dia) continue;
    unicas.set(`${dia.fecha}:${nota.criterio_id}`, { ...nota, fecha: dia.fecha, criterio: criterios.get(Number(nota.criterio_id)) });
  }
  for (const nota of unicas.values()) dias[nota.fecha].evaluaciones.push(nota);
  return { dias, limites };
}
