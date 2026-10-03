// Los criterios vinculados muestran el acumulado del ciclo; las notas manuales siguen por fecha.
export function rangoDelCiclo(config = {}) {
  const finales = Object.values(config.periodos || {}).map(p => p?.fin).filter(Boolean).sort();
  return { inicio: config.fechaInicioStr || '', fin: finales[finales.length - 1] || '' };
}

export function mezclarNotasAutomaticas(notas, automatica) {
  const mapa = {};
  const ids = new Set((automatica?.enlaces || []).map(e => e.criterio_id));
  for (const nota of notas || []) {
    if (!ids.has(nota.criterio_id)) mapa[`${nota.alumno_id}-${nota.criterio_id}`] = nota.valor;
  }
  for (const nota of automatica?.notas || []) mapa[`${nota.alumno_id}-${nota.criterio_id}`] = nota.valor;
  return mapa;
}

export function promedioPeriodo(criterios, todasNotas, automatica, alumnoId) {
  const ids = new Set(criterios.map(c => c.id));
  const notas = (todasNotas || []).filter(n => n.alumno_id === alumnoId && ids.has(n.criterio_id));
  const enlaces = new Set((automatica?.enlaces || []).map(e => e.criterio_id));
  // Con vínculos QR, cada criterio aporta su promedio del periodo una sola vez.
  if (criterios.some(c => enlaces.has(c.id))) {
    let suma = 0;
    let pesos = 0;
    for (const c of criterios) {
      const valores = enlaces.has(c.id)
        ? (automatica.notas || []).filter(n => n.alumno_id === alumnoId && n.criterio_id === c.id).map(n => n.valor)
        : notas.filter(n => n.criterio_id === c.id).map(n => n.valor);
      const numericos = valores.filter(v => v != null && String(v).trim() !== '' && Number.isFinite(Number(v))).map(Number);
      const peso = Number(c.porcentaje) || 0;
      if (numericos.length && peso > 0) {
        suma += numericos.reduce((a, b) => a + b, 0) / numericos.length * peso;
        pesos += peso;
      }
    }
    return pesos ? Number((suma / pesos).toFixed(1)) : null;
  }
  // Conservar el cálculo diario de los grupos que todavía no han vinculado QR.
  const fechas = [...new Set(notas.map(n => n.fecha))];
  const diarios = [];
  for (const fecha of fechas) {
    let suma = 0;
    let pesos = 0;
    for (const c of criterios) {
      const n = notas.find(n => n.fecha === fecha && n.criterio_id === c.id);
      const valor = n ? parseFloat(n.valor) : NaN;
      const peso = parseFloat(c.porcentaje) || 0;
      if (!Number.isNaN(valor) && peso > 0) { suma += valor * peso; pesos += peso; }
    }
    if (pesos > 0) diarios.push(suma / pesos);
  }
  return diarios.length ? Number((diarios.reduce((a, b) => a + b, 0) / diarios.length).toFixed(1)) : null;
}
