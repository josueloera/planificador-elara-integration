// Vinculación permanente de Control QR con Evaluación, usando la configuración existente.
function registerCycleHandlers({
  ipcMain, all, run, transaction, normalizarCampo, trabajosDelGrupo,
  grupoValido, criteriosDestino, secundaria, onChange, waitForWrites
}) {
  const fechaValida = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

  const leerCiclo = async () => {
    const rows = await all("SELECT llave, valor FROM configuracion WHERE llave IN ('fechaInicioStr', 'periodos')");
    const cfg = Object.fromEntries(rows.map(row => [row.llave, row.valor]));
    let periodos;
    try { periodos = JSON.parse(cfg.periodos || '{}'); }
    catch { throw new Error('Revisa los trimestres en Configuración del ciclo escolar.'); }
    const finales = Object.values(periodos || {}).map(p => p?.fin).filter(fechaValida).sort();
    const inicio = cfg.fechaInicioStr;
    const fin = finales[finales.length - 1];
    if (!fechaValida(inicio) || !fechaValida(fin) || inicio > fin) {
      throw new Error('Configura las fechas de inicio y fin del ciclo escolar antes de vincular Control QR.');
    }
    return { inicio, fin, ciclo: inicio.slice(0, 4) + '-' + fin.slice(0, 4) };
  };
  const llave = (grupoId, ciclo) => 'evaluacion_qr_ciclo:' + grupoId + ':' + ciclo;
  const leerEnlaces = async (grupoId, ciclo) => {
    const rows = await all('SELECT valor FROM configuracion WHERE llave = ?', [llave(grupoId, ciclo)]);
    if (!rows.length) return [];
    let enlaces;
    try { enlaces = JSON.parse(rows[0].valor); }
    catch { throw new Error('No se pudo leer la vinculación de Control QR de este grupo.'); }
    if (!Array.isArray(enlaces)) throw new Error('La configuración de Control QR de este grupo no es válida.');
    const criterios = await all('SELECT id FROM criterios WHERE grupo_id = ?', [grupoId]);
    const ids = new Set(criterios.map(c => c.id));
    return enlaces.filter(e => ids.has(e.criterio_id) && ['trabajos', 'asistencia'].includes(e.tipo));
  };
  const guardarEnlaces = (grupoId, ciclo, enlaces) => run(
    'INSERT OR REPLACE INTO configuracion (llave, valor) VALUES (?, ?)',
    [llave(grupoId, ciclo), JSON.stringify(enlaces)]
  );

  const evaluacion = async (grupoId, rango) => {
    const ciclo = await leerCiclo();
    const enlaces = await leerEnlaces(grupoId, ciclo.ciclo);
    let inicio = ciclo.inicio;
    let fin = ciclo.fin;
    if (rango) {
      if (!fechaValida(rango.inicio) || !fechaValida(rango.fin) || rango.inicio > rango.fin) {
        throw new Error('El periodo solicitado no tiene fechas válidas.');
      }
      inicio = rango.inicio > inicio ? rango.inicio : inicio;
      fin = rango.fin < fin ? rango.fin : fin;
    }
    const notas = [];
    if (!enlaces.length || inicio > fin) return { ...ciclo, enlaces, notas };
    const criterios = await all('SELECT * FROM criterios WHERE grupo_id = ?', [grupoId]);
    const cacheTrabajos = new Map();
    let asistencia;
    for (const enlace of enlaces) {
      const criterio = criterios.find(c => c.id === enlace.criterio_id);
      if (!criterio) continue;
      if (enlace.tipo === 'trabajos') {
        const campo = secundaria ? 'TODOS' : normalizarCampo(criterio.campo);
        if (!cacheTrabajos.has(campo)) {
          const trabajos = await trabajosDelGrupo(grupoId, inicio, fin, campo);
          const promedios = new Map();
          for (const t of trabajos) {
            if (t.valor == null || String(t.valor).trim() === '' || !Number.isFinite(Number(t.valor))) continue;
            const item = promedios.get(t.alumno_id) || { suma: 0, total: 0 };
            item.suma += Number(t.valor);
            item.total++;
            promedios.set(t.alumno_id, item);
          }
          cacheTrabajos.set(campo, [...promedios].map(([alumno_id, p]) =>
            ({ alumno_id, valor: Number((p.suma / p.total).toFixed(1)) })));
        }
        notas.push(...cacheTrabajos.get(campo).map(n => ({ ...n, criterio_id: criterio.id })));
      } else {
        if (!asistencia) asistencia = await all(`SELECT al.id AS alumno_id, COUNT(a.id) AS total_dias,
          SUM(CASE WHEN a.estado = 'PRESENTE' THEN 1 ELSE 0 END) AS presentes,
          SUM(CASE WHEN a.estado = 'RETARDO' THEN 1 ELSE 0 END) AS retardos,
          SUM(CASE WHEN a.estado = 'JUSTIFICADO' THEN 1 ELSE 0 END) AS justificados
          FROM alumnos al JOIN asistencia a ON a.alumno_id = al.id
          WHERE al.grupo_id = ? AND (a.grupo_id = ? OR a.grupo_id IS NULL)
            AND a.fecha >= ? AND a.fecha <= ? GROUP BY al.id`, [grupoId, grupoId, inicio, fin]);
        for (const a of asistencia) {
          if (a.total_dias > 0) notas.push({
            alumno_id: a.alumno_id, criterio_id: criterio.id,
            valor: Number(((a.presentes + a.retardos * 0.5 + a.justificados * 0.8)
              / a.total_dias * enlace.escala).toFixed(1))
          });
        }
      }
    }
    return { ...ciclo, enlaces, notas };
  };

  ipcMain.handle('get-evaluacion-automatica', async (_, grupo_id, rango) => {
    const grupoId = grupoValido(grupo_id);
    // Esperar la configuración pendiente evita mostrar una vinculación anterior.
    await waitForWrites();
    return evaluacion(grupoId, rango);
  });
  ipcMain.handle('configurar-evaluacion-automatica', async (_, opciones = {}) => {
    const grupoId = grupoValido(opciones.grupo_id);
    if (!['trabajos', 'asistencia'].includes(opciones.tipo)) throw new Error('Selecciona trabajos o asistencia.');
    const escala = opciones.escala == null ? 10 : Number(opciones.escala);
    if (!Number.isFinite(escala) || escala <= 0) throw new Error('La escala debe ser mayor que cero.');
    const result = await transaction(async () => {
      const criterios = await criteriosDestino(opciones.criterio_ids, grupoId);
      if (opciones.tipo === 'trabajos' && criterios.length !== 1) {
        throw new Error('Selecciona un solo criterio para los trabajos de la materia.');
      }
      const ciclo = await leerCiclo();
      const enlaces = await leerEnlaces(grupoId, ciclo.ciclo);
      const ids = new Set(criterios.map(c => c.id));
      const siguientes = enlaces.filter(e => !ids.has(e.criterio_id));
      siguientes.push(...criterios.map(c => ({ criterio_id: c.id, tipo: opciones.tipo, escala })));
      await guardarEnlaces(grupoId, ciclo.ciclo, siguientes);
      return { ...ciclo, enlaces: siguientes };
    });
    onChange(grupoId);
    return result;
  });
  ipcMain.handle('desvincular-evaluacion-automatica', async (_, grupo_id, criterio_id) => {
    const grupoId = grupoValido(grupo_id);
    await transaction(async () => {
      const [criterio] = await criteriosDestino(criterio_id, grupoId);
      const ciclo = await leerCiclo();
      const enlaces = await leerEnlaces(grupoId, ciclo.ciclo);
      await guardarEnlaces(grupoId, ciclo.ciclo, enlaces.filter(e => e.criterio_id !== criterio.id));
    });
    onChange(grupoId);
    return true;
  });
}

module.exports = { registerCycleHandlers };
