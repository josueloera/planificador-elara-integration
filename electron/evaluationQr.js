// Comunicación entre Control QR y Evaluación. No modifica el esquema de SQLite.
function normalizarCampo(value) {
  const text = String(value || 'LENGUAJES').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toUpperCase().replace(/\s+/g, ' ');
  if (text === 'SABERES' || text.startsWith('SABERES Y')) return 'SABERES';
  if (text === 'ETICA' || text.startsWith('ETICA,') || text.startsWith('ETICA ')) return 'ETICA';
  if (text === 'HUMANO' || text.startsWith('DE LO HUMANO')) return 'HUMANO';
  if (text === 'LENGUAJES') return 'LENGUAJES';
  return text;
}

function registerEvaluationHandlers({ ipcMain, db, variant = 'primaria', onChange = () => {} }) {
  const secundaria = variant === 'secundaria';
  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
  });
  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
  let pendingWrites = Promise.resolve();
  const transaction = (work) => {
    const result = pendingWrites.then(async () => {
      await run('BEGIN IMMEDIATE TRANSACTION');
      try {
        const value = await work();
        await run('COMMIT');
        return value;
      } catch (err) {
        await run('ROLLBACK').catch(() => {});
        throw err;
      }
    });
    pendingWrites = result.catch(() => {});
    return result;
  };
  const grupoValido = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Selecciona un grupo válido antes de exportar o guardar criterios.');
    return id;
  };
  const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const validarFechas = (inicio, fin, destino) => {
    if (!isDate(inicio) || !isDate(fin) || !isDate(destino) || inicio > fin) {
      throw new Error('Revisa el rango de fechas y la fecha de destino de la evaluación.');
    }
  };
  const criteriosDestino = async (value, grupoId) => {
    const ids = [...new Set((Array.isArray(value) ? value : [value]).map(Number))];
    if (!ids.length || ids.some(id => !Number.isInteger(id) || id <= 0)) {
      throw new Error('Selecciona un criterio de evaluación válido.');
    }
    const rows = await all(`SELECT * FROM criterios WHERE grupo_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [grupoId, ...ids]);
    if (rows.length !== ids.length) throw new Error('El criterio de destino no pertenece al grupo activo o ya fue eliminado.');
    return rows;
  };
  const guardarNotas = async (rows, criterios, fecha) => {
    let count = 0;
    for (const row of rows) {
      for (const criterio of criterios) {
        const changed = await run('UPDATE notas SET valor = ? WHERE alumno_id = ? AND criterio_id = ? AND fecha = ?',
          [row.valor, row.alumno_id, criterio.id, fecha]);
        if (!changed.changes) {
          await run('INSERT INTO notas (alumno_id, criterio_id, fecha, valor) VALUES (?, ?, ?, ?)',
            [row.alumno_id, criterio.id, fecha, row.valor]);
        }
        count++;
      }
    }
    return count;
  };
  const trabajosDelGrupo = async (grupoId, inicio, fin, campo) => {
    const rows = await all(`SELECT t.*, al.nombre AS alumno_nombre FROM trabajos_qr t
      JOIN alumnos al ON al.id = t.alumno_id
      WHERE al.grupo_id = ? AND (t.grupo_id = ? OR t.grupo_id IS NULL)
        AND t.fecha >= ? AND t.fecha <= ? ORDER BY t.fecha DESC, t.id DESC`, [grupoId, grupoId, inicio, fin]);
    return rows.filter(t => secundaria || !campo || campo === 'TODOS' || normalizarCampo(t.campo) === normalizarCampo(campo));
  };

  require('./evaluationCycle').registerCycleHandlers({
    ipcMain, all, run, transaction, normalizarCampo, trabajosDelGrupo,
    grupoValido, criteriosDestino, secundaria, onChange,
    waitForWrites: () => pendingWrites
  });

  ipcMain.handle('get-trabajos-rango', async (_, grupo_id, inicio, fin, campo) => {
    if (!grupo_id) return [];
    validarFechas(inicio, fin, fin);
    return trabajosDelGrupo(grupoValido(grupo_id), inicio, fin, campo);
  });
  ipcMain.handle('get-resumen-trabajos', async (_, grupo_id, inicio, fin, campo) => {
    if (!grupo_id) return [];
    const grupoId = grupoValido(grupo_id);
    validarFechas(inicio, fin, fin);
    const [alumnos, trabajos] = await Promise.all([
      all('SELECT id, nombre FROM alumnos WHERE grupo_id = ? ORDER BY nombre', [grupoId]),
      trabajosDelGrupo(grupoId, inicio, fin, campo)
    ]);
    const stats = new Map();
    for (const trabajo of trabajos) {
      const item = stats.get(trabajo.alumno_id) || { total: 0, suma: 0, notas: 0 };
      item.total++;
      if (trabajo.valor != null && trabajo.valor !== '' && Number.isFinite(Number(trabajo.valor))) {
        item.suma += Number(trabajo.valor);
        item.notas++;
      }
      stats.set(trabajo.alumno_id, item);
    }
    return alumnos.map(a => {
      const item = stats.get(a.id);
      return { alumno_id: a.id, alumno_nombre: a.nombre, total_trabajos: item?.total || 0,
        promedio: item?.notas ? Number((item.suma / item.notas).toFixed(1)) : null };
    });
  });

  ipcMain.handle('get-criterios', async (_, grupo_id, campo) => {
    if (!grupo_id) return [];
    const rows = await all('SELECT * FROM criterios WHERE grupo_id = ? ORDER BY id', [grupoValido(grupo_id)]);
    if (secundaria) return rows;
    const normalizados = rows.map(c => ({ ...c, campo: normalizarCampo(c.campo) }));
    if (!campo || campo === 'TODOS') return normalizados;
    return normalizados.filter(c => c.campo === normalizarCampo(campo));
  });

  ipcMain.handle('save-criterios', async (_, lista, grupo_id, campo) => {
    const grupoId = grupoValido(grupo_id);
    const targetCampo = normalizarCampo(campo);
    const validos = (lista || []).filter(c => c.nombre && c.nombre.trim());
    return transaction(async () => {
      const existentes = await all('SELECT * FROM criterios WHERE grupo_id = ?', [grupoId]);
      const scoped = existentes.filter(c => secundaria || normalizarCampo(c.campo) === targetCampo);
      const keptIds = validos.filter(c => c.id != null).map(c => Number(c.id));
      if (keptIds.some(id => !scoped.some(c => c.id === id))) {
        throw new Error('Hay criterios que pertenecen a otra materia o grupo. Vuelve a cargar la evaluación.');
      }
      const removedIds = scoped.filter(c => !keptIds.includes(c.id)).map(c => c.id);
      if (removedIds.length) {
        await run(`DELETE FROM criterios WHERE grupo_id = ? AND id IN (${removedIds.map(() => '?').join(',')})`, [grupoId, ...removedIds]);
      }
      for (const c of validos) {
        const old = existentes.find(item => item.id === Number(c.id));
        const storedCampo = secundaria ? (old?.campo || c.campo || null) : targetCampo;
        const pct = parseFloat(c.porcentaje) || 0;
        if (c.id != null) {
          await run('UPDATE criterios SET nombre = ?, porcentaje = ?, campo = ? WHERE id = ? AND grupo_id = ?',
            [c.nombre.trim(), pct, storedCampo, Number(c.id), grupoId]);
        } else {
          await run('INSERT INTO criterios (grupo_id, campo, nombre, porcentaje) VALUES (?, ?, ?, ?)',
            [grupoId, storedCampo, c.nombre.trim(), pct]);
        }
      }
      return true;
    });
  });

  ipcMain.handle('importar-promedios-qr-a-criterio', async (_, criterio_id, arg2, arg3, arg4, arg5, arg6) => {
    // Compatibilidad con las llamadas existentes de día único y de rango.
    const rango = isDate(arg3);
    const inicio = arg2;
    const fin = rango ? arg3 : arg2;
    const campo = rango ? arg4 : arg3;
    const grupoId = grupoValido(rango ? arg5 : arg4);
    const fecha = (rango ? arg6 : arg5) || fin;
    validarFechas(inicio, fin, fecha);
    return transaction(async () => {
      const criterios = await criteriosDestino(criterio_id, grupoId);
      if (criterios.length !== 1) throw new Error('Selecciona un solo criterio de destino para los trabajos.');
      const [criterio] = criterios;
      const destinoCampo = normalizarCampo(criterio.campo);
      if (!secundaria && campo && campo !== 'TODOS' && normalizarCampo(campo) !== destinoCampo) {
        throw new Error('La materia de los trabajos no coincide con la del criterio de destino.');
      }
      const trabajos = await trabajosDelGrupo(grupoId, inicio, fin, secundaria ? 'TODOS' : destinoCampo);
      const promedios = new Map();
      for (const trabajo of trabajos) {
        // En Secundaria cada grupo representa una materia, tutoría o taller.
        // Sus trabajos anteriores pueden estar etiquetados con campos de Primaria.
        if (trabajo.valor == null || trabajo.valor === '' || !Number.isFinite(Number(trabajo.valor))) continue;
        const item = promedios.get(trabajo.alumno_id) || { suma: 0, total: 0 };
        item.suma += Number(trabajo.valor);
        item.total++;
        promedios.set(trabajo.alumno_id, item);
      }
      const rows = [...promedios].map(([alumno_id, item]) => ({ alumno_id, valor: Number((item.suma / item.total).toFixed(1)) }));
      return guardarNotas(rows, [criterio], fecha);
    });
  });

  ipcMain.handle('importar-asistencia-a-criterio', async (_, criterio_id, arg2, arg3, arg4, arg5, arg6) => {
    const rango = isDate(arg3);
    const inicio = arg2;
    const fin = rango ? arg3 : arg2;
    const grupoId = grupoValido(rango ? arg4 : arg3);
    const escala = Number(rango ? arg5 : arg4) || 10;
    const fecha = (rango ? arg6 : arg5) || fin;
    validarFechas(inicio, fin, fecha);
    if (escala <= 0 || !Number.isFinite(escala)) throw new Error('La escala de evaluación debe ser mayor que cero.');
    return transaction(async () => {
      const criterios = await criteriosDestino(criterio_id, grupoId);
      const asistencia = await all(`SELECT al.id AS alumno_id, COUNT(a.id) AS total_dias,
        SUM(CASE WHEN a.estado = 'PRESENTE' THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN a.estado = 'RETARDO' THEN 1 ELSE 0 END) AS retardos,
        SUM(CASE WHEN a.estado = 'JUSTIFICADO' THEN 1 ELSE 0 END) AS justificados
        FROM alumnos al JOIN asistencia a ON a.alumno_id = al.id
        WHERE al.grupo_id = ? AND (a.grupo_id = ? OR a.grupo_id IS NULL)
          AND a.fecha >= ? AND a.fecha <= ? GROUP BY al.id`, [grupoId, grupoId, inicio, fin]);
      const rows = asistencia.filter(r => r.total_dias > 0).map(r => ({
        alumno_id: r.alumno_id,
        valor: Number(((r.presentes + r.retardos * 0.5 + r.justificados * 0.8) / r.total_dias * escala).toFixed(1))
      }));
      return guardarNotas(rows, criterios, fecha);
    });
  });
  return { transaction };
}

module.exports = { normalizarCampo, registerEvaluationHandlers };
