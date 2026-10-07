// Una nota por alumno y fecha; los trabajos sin calificación no cuentan como cero.
function promediosDiarios(trabajos) {
  const promedios = new Map();
  for (const trabajo of trabajos) {
    if (!trabajo.fecha || trabajo.valor == null || String(trabajo.valor).trim() === ''
      || !Number.isFinite(Number(trabajo.valor))) continue;
    const key = JSON.stringify([trabajo.alumno_id, trabajo.fecha]);
    const item = promedios.get(key) || {
      alumno_id: trabajo.alumno_id, fecha: trabajo.fecha, suma: 0, total: 0
    };
    item.suma += Number(trabajo.valor);
    item.total++;
    promedios.set(key, item);
  }
  return [...promedios.values()].map(({ alumno_id, fecha, suma, total }) => ({
    alumno_id, fecha, valor: Number((suma / total).toFixed(1))
  }));
}

module.exports = { promediosDiarios };
