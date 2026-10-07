// Las fuentes QR conservan la fecha original de cada trabajo y asistencia.
export function rangoDelCiclo(config = {}) {
  const finales = Object.values(config.periodos || {}).map(p => p?.fin).filter(Boolean).sort();
  return { inicio: config.fechaInicioStr || '', fin: finales[finales.length - 1] || '' };
}

function notasConAutomaticas(notas, automatica) {
  const ids = new Set((automatica?.enlaces || []).map(e => e.criterio_id));
  return [
    ...(notas || []).filter(n => !ids.has(n.criterio_id)),
    ...(automatica?.notas || []).filter(n => ids.has(n.criterio_id) && n.fecha)
  ];
}

export function mezclarNotasAutomaticas(notas, automatica, fecha) {
  const mapa = {};
  for (const nota of notasConAutomaticas(notas, automatica)) {
    if (nota.fecha === fecha) mapa[`${nota.alumno_id}-${nota.criterio_id}`] = nota.valor;
  }
  return mapa;
}

export function promedioPeriodo(criterios, todasNotas, automatica, alumnoId) {
  const ids = new Set(criterios.map(c => c.id));
  const porFecha = new Map();
  for (const nota of notasConAutomaticas(todasNotas, automatica)) {
    if (nota.alumno_id !== alumnoId || !ids.has(nota.criterio_id) || !nota.fecha) continue;
    if (!porFecha.has(nota.fecha)) porFecha.set(nota.fecha, new Map());
    porFecha.get(nota.fecha).set(nota.criterio_id, nota.valor);
  }
  const diarios = [];
  for (const notasDia of porFecha.values()) {
    let suma = 0;
    let pesos = 0;
    for (const criterio of criterios) {
      const valor = notasDia.get(criterio.id);
      const peso = Number(criterio.porcentaje) || 0;
      if (valor != null && String(valor).trim() !== '' && Number.isFinite(Number(valor)) && peso > 0) {
        suma += Number(valor) * peso;
        pesos += peso;
      }
    }
    if (pesos > 0) diarios.push(suma / pesos);
  }
  return diarios.length ? Number((diarios.reduce((a, b) => a + b, 0) / diarios.length).toFixed(1)) : null;
}
