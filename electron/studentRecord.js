/* Persistencia compartida por Electron y el adaptador SQLite de Android. */
const PROFILE_FIELDS = ['curp','f_nacimiento','edad','peso','estatura','tipo_sangre','alergias','servicio_medico','direccion','nombre_mama','tel_mama','nombre_papa','tel_papa','otros_datos','foto_url','nombre_tutor','tel_tutor','email_tutor','parentesco_tutor','contacto_emergencia','tel_emergencia'];
const CATEGORIES = ['Comprobante de domicilio','INE del tutor','Acta de nacimiento','CURP','Examen trimestral','Trabajo','Otro'];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function installStudentRecord({ db, ipcMain }) {
  const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
  const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { err ? reject(err) : resolve({ id: this.lastID, changes: this.changes }); }));
  const validId = value => { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw new Error('Selecciona un alumno válido.'); return id; };
  const ready = (async () => {
    await run(`CREATE TABLE IF NOT EXISTS expediente_alumno (id INTEGER PRIMARY KEY AUTOINCREMENT, alumno_id INTEGER NOT NULL, categoria TEXT NOT NULL, nombre TEXT NOT NULL, mime TEXT NOT NULL, tamano INTEGER NOT NULL, contenido TEXT NOT NULL, fecha TEXT NOT NULL)`);
    await run('CREATE INDEX IF NOT EXISTS idx_expediente_alumno ON expediente_alumno(alumno_id)');
    const columns = new Set((await all('PRAGMA table_info(perfil_alumno)')).map(c => c.name));
    for (const field of PROFILE_FIELDS) if (!columns.has(field)) await run(`ALTER TABLE perfil_alumno ADD COLUMN ${field} TEXT`);
  })();
  // Las llamadas esperan la migración; se comunica cualquier error al solicitante.
  ready.catch(error => console.error('No se pudo preparar el expediente:', error.message));
  const student = async value => {
    await ready;
    const id = validId(value);
    const [row] = await all(`SELECT a.*, g.grado, g.seccion, g.disciplina_id, g.tipo, g.ciclo_escolar FROM alumnos a LEFT JOIN grupos_maestro g ON a.grupo_id = g.id WHERE a.id = ?`, [id]);
    if (!row) throw new Error('El alumno ya no existe. Actualiza la búsqueda.');
    return row;
  };
  const documents = async id => all('SELECT id, alumno_id, categoria, nombre, mime, tamano, fecha FROM expediente_alumno WHERE alumno_id = ? ORDER BY fecha DESC, id DESC', [id]);
  async function savePerfil(data) {
    const alumno = await student(data?.alumno_id);
    const [previous = {}] = await all('SELECT * FROM perfil_alumno WHERE alumno_id = ?', [alumno.id]);
    const merged = { ...previous, ...data };
    if (merged.foto_url && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(merged.foto_url) || merged.foto_url.length > 4 * 1024 * 1024)) {
      // Conserva referencias antiguas al editar otros datos, pero rechaza nuevas rutas arbitrarias.
      if (merged.foto_url !== previous.foto_url) throw new Error('La foto debe ser una imagen JPG, PNG o WebP de hasta 3 MB.');
    }
    await run(`INSERT INTO perfil_alumno (alumno_id, ${PROFILE_FIELDS.join(',')}) VALUES (?,${PROFILE_FIELDS.map(() => '?').join(',')}) ON CONFLICT(alumno_id) DO UPDATE SET ${PROFILE_FIELDS.map(field => `${field}=excluded.${field}`).join(',')}`, [alumno.id, ...PROFILE_FIELDS.map(field => String(merged[field] ?? ''))]);
    return { alumno_id: alumno.id, ...Object.fromEntries(PROFILE_FIELDS.map(field => [field, String(merged[field] ?? '')])) };
  }
  const handle = (name, fn) => ipcMain.handle(name, async (_event, ...args) => { await ready; return fn(...args); });
  handle('alumno-buscar', () => all(`SELECT a.id, a.nombre, a.grupo_id, g.grado, g.seccion, g.disciplina_id, g.tipo, g.ciclo_escolar FROM alumnos a LEFT JOIN grupos_maestro g ON g.id = a.grupo_id ORDER BY a.nombre COLLATE NOCASE, g.grado, g.seccion, a.id`));
  handle('alumno-get-detalle', async id => {
    const alumno = await student(id);
    const [perfiles, criterios, notas, incidencias, asistencia, archivos] = await Promise.all([
      all('SELECT * FROM perfil_alumno WHERE alumno_id = ?', [alumno.id]),
      alumno.grupo_id ? all('SELECT * FROM criterios WHERE grupo_id = ?', [alumno.grupo_id]) : Promise.resolve([]),
      all(`SELECT n.* FROM notas n JOIN criterios c ON c.id = n.criterio_id WHERE n.alumno_id = ? AND c.grupo_id = ? ORDER BY n.fecha DESC, n.id DESC`, [alumno.id, alumno.grupo_id]),
      all('SELECT * FROM incidencias WHERE alumno_id = ? ORDER BY fecha DESC, id DESC', [alumno.id]),
      all('SELECT * FROM asistencia WHERE alumno_id = ? AND (grupo_id = ? OR grupo_id IS NULL) ORDER BY fecha DESC', [alumno.id, alumno.grupo_id]),
      documents(alumno.id)
    ]);
    return { alumno, perfil: perfiles[0] || {}, criterios, notas, incidencias, asistencia, archivos };
  });
  handle('alumno-save-perfil', savePerfil);
  handle('alumno-list-expediente', async id => documents((await student(id)).id));
  handle('alumno-add-documento', async (id, file) => {
    const alumno = await student(id);
    if (!CATEGORIES.includes(file?.categoria)) throw new Error('Selecciona una categoría de expediente.');
    const contenido = String(file.contenido || '');
    if (!contenido || contenido.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(contenido)) throw new Error('El archivo no contiene datos válidos.');
    const tamano = contenido.length * 3 / 4 - (contenido.endsWith('==') ? 2 : contenido.endsWith('=') ? 1 : 0);
    if (tamano > MAX_FILE_SIZE || tamano !== Number(file.tamano)) throw new Error('Cada archivo debe pesar como máximo 20 MB.');
    const nombre = String(file.nombre || '').split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, '').slice(0,180);
    if (!nombre) throw new Error('El archivo necesita un nombre.');
    const result = await run('INSERT INTO expediente_alumno (alumno_id,categoria,nombre,mime,tamano,contenido,fecha) VALUES (?,?,?,?,?,?,?)', [alumno.id, file.categoria, nombre, String(file.mime || 'application/octet-stream').slice(0,120), tamano, contenido, new Date().toISOString()]);
    return { id: result.id, nombre };
  });
  handle('alumno-get-documento', async (id, documentId) => {
    const alumno = await student(id);
    const [file] = await all('SELECT id,alumno_id,categoria,nombre,mime,tamano,fecha,length(contenido) AS longitud FROM expediente_alumno WHERE id = ? AND alumno_id = ?', [validId(documentId), alumno.id]);
    if (!file) throw new Error('El archivo no pertenece al alumno seleccionado.');
    // CursorWindow en Android limita el tamaño de cada fila. Se lee en fragmentos.
    const chunks = [];
    for (let start = 1; start <= file.longitud; start += 262144) {
      const [chunk] = await all('SELECT substr(contenido,?,262144) AS parte FROM expediente_alumno WHERE id = ? AND alumno_id = ?', [start, file.id, alumno.id]);
      chunks.push(chunk.parte);
    }
    return { ...file, contenido: chunks.join('') };
  });
  handle('alumno-delete-documento', async (id, documentId) => {
    const alumno = await student(id);
    const result = await run('DELETE FROM expediente_alumno WHERE id = ? AND alumno_id = ?', [validId(documentId), alumno.id]);
    if (!result.changes) throw new Error('El archivo no pertenece al alumno seleccionado.');
    return true;
  });
  return { ready, savePerfil };
}

module.exports = { installStudentRecord };
