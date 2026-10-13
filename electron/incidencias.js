function installIncidencias({ db, ipcMain }) {
  const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
  const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(error) { error ? reject(error) : resolve({ id: this.lastID, changes: this.changes }); }));
  let ready;
  const ensure = () => ready ||= (async () => {
    const columns = await all('PRAGMA table_info(incidencias)');
    for (const name of ['hora', 'lugar', 'involucrados', 'acciones', 'creado_en', 'actualizado_en']) {
      if (!columns.some(c => c.name === name)) await run(`ALTER TABLE incidencias ADD COLUMN ${name} TEXT`);
    }
  })().catch(error => { ready = undefined; throw error; });
  const positive = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
  ipcMain.handle('get-incidencias', async (_e, alumnoId) => {
    await ensure();
    if (!positive(alumnoId)) throw new Error('Alumno inválido.');
    return all('SELECT * FROM incidencias WHERE alumno_id = ? ORDER BY fecha DESC, hora DESC, id DESC', [alumnoId]);
  });
  ipcMain.handle('save-incidencia', async (_e, data) => {
    await ensure();
    const d = data || {};
    const date = /^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '') && new Date(d.fecha + 'T12:00:00Z');
    if (!positive(d.alumno_id) || !date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== d.fecha) throw new Error('Indica un alumno y una fecha válida.');
    const text = name => String(d[name] || '').trim();
    if (!text('situacion')) throw new Error('Describe los hechos de la incidencia.');
    if (text('hora') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(text('hora'))) throw new Error('Hora inválida.');
    const alumnos = await all('SELECT id, grupo_id FROM alumnos WHERE id = ?', [d.alumno_id]);
    if (!alumnos.length) throw new Error('El alumno ya no existe.');
    const values = [d.fecha, text('situacion'), text('medidas'), text('hora'), text('lugar'), text('involucrados'), text('acciones')];
    const now = new Date().toISOString();
    if (d.id != null) {
      if (!positive(d.id)) throw new Error('Incidencia inválida.');
      const result = await run('UPDATE incidencias SET fecha=?, situacion=?, medidas=?, hora=?, lugar=?, involucrados=?, acciones=?, actualizado_en=? WHERE id=? AND alumno_id=?', [...values, now, d.id, d.alumno_id]);
      if (!result.changes) throw new Error('La incidencia ya no existe o pertenece a otro alumno.');
      return { success: true, id: d.id };
    }
    const result = await run('INSERT INTO incidencias (fecha,situacion,medidas,hora,lugar,involucrados,acciones,creado_en,actualizado_en,alumno_id,grupo_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [...values, now, now, d.alumno_id, alumnos[0].grupo_id]);
    return { success: true, id: result.id };
  });
  ipcMain.handle('delete-incidencia', async (_e, data) => {
    await ensure();
    if (!positive(data?.id) || !positive(data?.alumno_id)) throw new Error('Incidencia inválida.');
    const result = await run('DELETE FROM incidencias WHERE id=? AND alumno_id=?', [data.id, data.alumno_id]);
    if (!result.changes) throw new Error('La incidencia ya no existe o pertenece a otro alumno.');
    return { success: true };
  });
}
module.exports = { installIncidencias };
