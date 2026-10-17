// Destinatarios persistidos junto con los datos del docente, incluidos en respaldos.
function registerQrAssignments({ ipcMain, all, run, transaction, grupoValido, normalizarCampo, secundaria, onChange }) {
  const dayKey = (g, d) => `qr_actividades:${g}:${d}`;
  const checkDate = d => {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) throw new Error('Fecha no válida.');
  };
  const read = async (key, fallback) => {
    const rows = await all('SELECT valor FROM configuracion WHERE llave = ?', [key]);
    return rows.length ? JSON.parse(rows[0].valor) : fallback;
  };
  const write = (key, value) => run('INSERT OR REPLACE INTO configuracion (llave, valor) VALUES (?, ?)', [key, JSON.stringify(value)]);
  const roster = g => all('SELECT id, nombre FROM alumnos WHERE grupo_id = ? ORDER BY nombre', [g]);
  const idsValidos = (ids, alumnos) => {
    if (!Array.isArray(ids)) throw new Error('Selecciona los alumnos destinatarios.');
    const result = [...new Set(ids.map(Number))];
    if (result.some(id => !alumnos.some(a => a.id === id))) throw new Error('Hay alumnos que no pertenecen al grupo.');
    return result;
  };
  const profileKey = (g, inicio, fin, campo) => {
    checkDate(inicio); checkDate(fin);
    if (inicio > fin) throw new Error('Revisa el ciclo escolar.');
    return `qr_adecuaciones:${g}:${inicio}:${fin}:${secundaria ? 'MATERIA' : normalizarCampo(campo)}`;
  };
  const applies = (act, id) => !Array.isArray(act?.alumno_ids) || act.alumno_ids.includes(Number(id));
  const list = async (g, inicio, fin, campo) => {
    checkDate(inicio); checkDate(fin);
    if (inicio > fin) throw new Error('Revisa el rango de fechas.');
    const configs = await all('SELECT llave, valor FROM configuracion WHERE llave >= ? AND llave <= ?', [dayKey(g, inicio), dayKey(g, fin)]);
    const items = new Map();
    for (const row of configs) {
      if (!row.llave.startsWith(`qr_actividades:${g}:`)) continue;
      const fecha = row.llave.slice(-10);
      for (const a of JSON.parse(row.valor)) items.set(JSON.stringify([fecha, a.nombre]), { ...a, fecha });
    }
    const trabajos = await all(`SELECT t.* FROM trabajos_qr t JOIN alumnos a ON a.id = t.alumno_id
      WHERE a.grupo_id = ? AND (t.grupo_id = ? OR t.grupo_id IS NULL) AND t.fecha >= ? AND t.fecha <= ?`, [g, g, inicio, fin]);
    for (const t of trabajos) {
      const key = JSON.stringify([t.fecha, t.nombre_trabajo]);
      if (!items.has(key)) items.set(key, { nombre: t.nombre_trabajo, campo: t.campo, fecha: t.fecha, modo: 'TODOS', alumno_ids: null });
    }
    return [...items.values()].filter(a => secundaria || !campo || campo === 'TODOS' || normalizarCampo(a.campo) === normalizarCampo(campo));
  };
  ipcMain.handle('get-qr-adecuaciones', async (_, g, inicio, fin, campo) => read(profileKey(grupoValido(g), inicio, fin, campo), []));
  ipcMain.handle('save-qr-adecuaciones', async (_, g, inicio, fin, campo, ids) => {
    g = grupoValido(g);
    const key = profileKey(g, inicio, fin, campo);
    const result = await transaction(async () => {
      const valid = idsValidos(ids, await roster(g));
      await write(key, valid);
      return valid;
    });
    onChange(g); return result;
  });
  ipcMain.handle('get-qr-actividades', async (_, g, inicio, fin, campo) => g ? list(grupoValido(g), inicio, fin, campo) : []);
  ipcMain.handle('save-qr-actividad', async (_, g, fecha, actividad) => {
    g = grupoValido(g); checkDate(fecha);
    const result = await transaction(async () => {
      const nombre = String(actividad.nombre || '').trim();
      if (!nombre) throw new Error('Escribe el nombre de la actividad.');
      if (!['GENERAL', 'ADAPTADA', 'TODOS'].includes(actividad.modo)) throw new Error('Selecciona el tipo de actividad.');
      const alumnos = await roster(g);
      const ids = idsValidos(actividad.alumno_ids, alumnos);
      if (actividad.modo === 'ADAPTADA' && !ids.length) throw new Error('Selecciona al menos un alumno para la tarea adaptada.');
      const old = await list(g, fecha, fecha);
      const previous = old.find(a => a.nombre === nombre);
      if (previous && !actividad.editar) throw new Error('Ya existe una actividad con ese nombre en esta fecha. Edita su asignación.');
      const entregas = await all(`SELECT t.alumno_id FROM trabajos_qr t JOIN alumnos a ON a.id = t.alumno_id
        WHERE a.grupo_id = ? AND (t.grupo_id = ? OR t.grupo_id IS NULL) AND t.fecha = ? AND t.nombre_trabajo = ?`, [g, g, fecha, nombre]);
      if (entregas.some(t => !ids.includes(t.alumno_id))) throw new Error('Un alumno que intentas excluir ya tiene una entrega. Elimina primero esa calificación si no le corresponde.');
      const categoria = actividad.categoria ?? previous?.categoria ?? 'TRABAJO';
      if (!['TRABAJO', 'TAREA'].includes(categoria)) throw new Error('Selecciona trabajos o tareas.');
      const saved = { categoria, nombre, campo: previous?.campo || actividad.campo || 'LENGUAJES', modo: actividad.modo, alumno_ids: ids };
      const stored = await read(dayKey(g, fecha), []);
      await write(dayKey(g, fecha), [...stored.filter(a => a.nombre !== nombre), saved]);
      return { ...saved, fecha };
    });
    onChange(g); return result;
  });
  // Se ejecuta dentro de la misma transacción que las mutaciones QR existentes.
  const beforeMutation = async (channel, args) => {
    if (channel === 'save-trabajo-qr') {
      const [, alumno, , nombre, fecha, , grupo] = args;
      const g = grupoValido(grupo); checkDate(fecha);
      if (!(await roster(g)).some(a => a.id === Number(alumno))) throw new Error('El alumno no pertenece al grupo activo.');
      const act = (await read(dayKey(g, fecha), [])).find(a => a.nombre === nombre);
      if (act && !secundaria && normalizarCampo(act.campo) !== normalizarCampo(args[2])) throw new Error('La materia no coincide con la actividad seleccionada.');
      if (!applies(act, alumno)) throw new Error('Esta actividad no está asignada al alumno. Selecciona una de sus actividades.');
    }
    if (channel === 'update-actividad-fecha' || channel === 'delete-actividad-fecha') {
      const [, fecha, nombre] = args;
      const g = grupoValido(channel === 'update-actividad-fecha' ? args[5] : args[3]);
      checkDate(fecha);
      const stored = await read(dayKey(g, fecha), []);
      if (channel === 'update-actividad-fecha') {
        const nuevo = String(args[3] || '').trim();
        if (!nuevo) throw new Error('Escribe el nombre de la actividad.');
        if (nuevo !== nombre && (await list(g, fecha, fecha)).some(a => a.nombre === nuevo)) throw new Error('Ya existe una actividad con ese nombre.');
        await write(dayKey(g, fecha), stored.map(a => a.nombre === nombre ? { ...a, nombre: nuevo, campo: args[4] } : a));
      } else await write(dayKey(g, fecha), stored.filter(a => a.nombre !== nombre));
    }
  };
  const filterWorks = async (g, rows) => {
    const days = [...new Set(rows.map(t => t.fecha))];
    const plans = new Map(await Promise.all(days.map(async day => [day, await read(dayKey(g, day), [])])));
    return rows.filter(t => applies(plans.get(t.fecha)?.find(a => a.nombre === t.nombre_trabajo), t.alumno_id))
      .map(t => ({ ...t, categoria: plans.get(t.fecha)?.find(a => a.nombre === t.nombre_trabajo)?.categoria || 'TRABAJO' }));
  };
  return { beforeMutation, filterWorks };
}
module.exports = { registerQrAssignments };
