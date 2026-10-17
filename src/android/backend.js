import { installIncidencias } from './incidencias.js';
import { installStudentRecord } from './studentRecord.js';
import * as evaluationQr from './evaluationQr.js';
export function installHandlers({ db, universalDb, ipcMain, BrowserWindow }) {
installIncidencias({ db, ipcMain });
db.serialize(() => {
db.run(`CREATE TABLE IF NOT EXISTS alumnos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, grupo_id INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS criterios (id INTEGER PRIMARY KEY AUTOINCREMENT, campo TEXT, nombre TEXT, porcentaje REAL, grupo_id INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS notas (id INTEGER PRIMARY KEY AUTOINCREMENT, alumno_id INTEGER, criterio_id INTEGER, fecha TEXT, valor REAL)`);
db.run(`CREATE TABLE IF NOT EXISTS asistencia (id INTEGER PRIMARY KEY AUTOINCREMENT, alumno_id INTEGER, fecha TEXT, estado TEXT DEFAULT 'PRESENTE', grupo_id INTEGER, UNIQUE(alumno_id, fecha))`);
db.run(`CREATE TABLE IF NOT EXISTS perfil_alumno (alumno_id INTEGER PRIMARY KEY, curp TEXT, f_nacimiento TEXT, edad TEXT, peso TEXT, estatura TEXT, tipo_sangre TEXT, alergias TEXT, servicio_medico TEXT, direccion TEXT, nombre_mama TEXT, tel_mama TEXT, nombre_papa TEXT, tel_papa TEXT, otros_datos TEXT, foto_url TEXT)`);
db.run(`ALTER TABLE perfil_alumno ADD COLUMN foto_url TEXT`, () => {});
db.run(`CREATE TABLE IF NOT EXISTS trabajos_qr (id INTEGER PRIMARY KEY AUTOINCREMENT, alumno_id INTEGER, campo TEXT, nombre_trabajo TEXT, fecha TEXT, valor REAL, grupo_id INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS incidencias (id INTEGER PRIMARY KEY AUTOINCREMENT, alumno_id INTEGER, fecha TEXT, situacion TEXT, medidas TEXT, grupo_id INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS proyectos (id INTEGER PRIMARY KEY AUTOINCREMENT, grado INTEGER, nombre TEXT, metodologia TEXT, escenario TEXT, temporalidad TEXT, problemática TEXT, pdas_seleccionados TEXT, fases_contenido TEXT, grupo_id INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS planeacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grado INTEGER,
    grupo_id INTEGER,
    semana INTEGER,
    lunes_inicio TEXT, lunes_desarrollo TEXT, lunes_cierre TEXT,
    martes_inicio TEXT, martes_desarrollo TEXT, martes_cierre TEXT,
    miercoles_inicio TEXT, miercoles_desarrollo TEXT, miercoles_cierre TEXT,
    jueves_inicio TEXT, jueves_desarrollo TEXT, jueves_cierre TEXT,
    viernes_inicio TEXT, viernes_desarrollo TEXT, viernes_cierre TEXT,
    recursos TEXT, evaluacion TEXT, adecuaciones TEXT
  )`);
db.run(`CREATE TABLE IF NOT EXISTS comisiones (id INTEGER PRIMARY KEY, descripcion TEXT, fecha TEXT, tipo TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS eventos_oficiales (fecha TEXT PRIMARY KEY, tipo TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS configuracion (llave TEXT PRIMARY KEY, valor TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS vistos (tipo TEXT, item_id TEXT, PRIMARY KEY(tipo, item_id))`);
db.run(`CREATE TABLE IF NOT EXISTS grupos_maestro (id INTEGER PRIMARY KEY AUTOINCREMENT, grado INTEGER, seccion TEXT, disciplina_id INTEGER, tipo TEXT, ciclo_escolar TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS elara_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    mensaje TEXT,
    fecha TEXT,
    visto INTEGER DEFAULT 0
  )`);

const tablasMigrar = ['alumnos', 'criterios', 'planeacion', 'proyectos', 'incidencias'];
tablasMigrar.forEach(tabla => {
    db.run(`ALTER TABLE ${tabla} ADD COLUMN grupo_id INTEGER`, (err) => { /* Ignorar error si la columna ya existe */ });
  });
db.get("SELECT valor FROM configuracion WHERE llave = 'fechaInicioStr'", (err, row) => {
    if (!err && !row) {
      const defaultPeriodosStr = JSON.stringify({
        1: { nombre: '1º Trimestre', inicio: '2026-08-31', fin: '2026-11-27' },
        2: { nombre: '2º Trimestre', inicio: '2026-11-30', fin: '2027-03-19' },
        3: { nombre: '3º Trimestre', inicio: '2027-03-20', fin: '2027-07-21' }
      });
      db.run("INSERT OR REPLACE INTO configuracion (llave, valor) VALUES ('fechaInicioStr', '2026-08-31')");
      db.run("INSERT OR REPLACE INTO configuracion (llave, valor) VALUES ('periodos', ?)", [defaultPeriodosStr]);

      // Sembrar eventos oficiales del ciclo 2026-2027
      const defaultEventos = {
        // CTE (Consejo Técnico Escolar)
        "2026-08-24": "CTE", "2026-08-25": "CTE", "2026-08-26": "CTE", "2026-08-27": "CTE", "2026-08-28": "CTE",
        "2026-09-25": "CTE", "2026-10-30": "CTE", "2026-11-27": "CTE", "2027-01-29": "CTE", "2027-02-26": "CTE",
        "2027-04-30": "CTE", "2027-05-28": "CTE", "2027-06-25": "CTE",
        // Suspensiones (Feriados)
        "2026-09-16": "SUSPENSION", "2026-11-02": "SUSPENSION", "2026-11-16": "SUSPENSION", "2027-01-01": "SUSPENSION",
        "2027-02-01": "SUSPENSION", "2027-03-15": "SUSPENSION", "2027-05-05": "SUSPENSION", "2027-05-15": "SUSPENSION",
        // Vacaciones (Periodos Vacacionales)
        "2026-12-21": "VACACIONES", "2026-12-22": "VACACIONES", "2026-12-23": "VACACIONES", "2026-12-24": "VACACIONES", "2026-12-25": "VACACIONES",
        "2026-12-28": "VACACIONES", "2026-12-29": "VACACIONES", "2026-12-30": "VACACIONES", "2026-12-31": "VACACIONES",
        "2027-01-04": "VACACIONES", "2027-01-05": "VACACIONES", "2027-01-06": "VACACIONES", "2027-01-07": "VACACIONES", "2027-01-08": "VACACIONES",
        "2027-03-22": "VACACIONES", "2027-03-23": "VACACIONES", "2027-03-24": "VACACIONES", "2027-03-25": "VACACIONES", "2027-03-26": "VACACIONES",
        "2027-03-29": "VACACIONES", "2027-03-30": "VACACIONES", "2027-03-31": "VACACIONES", "2027-04-01": "VACACIONES", "2027-04-02": "VACACIONES"
      };

      db.serialize(() => {
        const stmt = db.prepare("INSERT OR REPLACE INTO eventos_oficiales (fecha, tipo) VALUES (?, ?)");
        for (const [fecha, tipo] of Object.entries(defaultEventos)) {
          stmt.run(fecha, tipo);
        }
        stmt.finalize();
      });
    }
  });
db.run("ALTER TABLE planeacion ADD COLUMN confidence_score REAL DEFAULT 1.0", () => {});
});
ipcMain.handle('get-campos-formativos', async () => new Promise(r => universalDb.all("SELECT * FROM campos_formativos", [], (e, rows) => r(rows || []))));
ipcMain.handle('get-disciplinas', async () => new Promise(r => universalDb.all("SELECT * FROM disciplinas", [], (e, rows) => r(rows || []))));
ipcMain.handle('get-disciplinas-por-grado', async (e, grado) => {
    return new Promise(r => {
        const query = `
            SELECT DISTINCT d.id, d.nombre 
            FROM disciplinas d
            JOIN contenidos c ON c.disciplina_id = d.id
            JOIN pdas p ON p.contenido_id = c.id
            WHERE p.grado = ?
            ORDER BY d.nombre ASC
        `;
        universalDb.all(query, [grado], (err, rows) => r(rows || []));
    });
});
ipcMain.handle('get-contenidos-disciplina', async (e, d_id, f_id) => new Promise(r => universalDb.all("SELECT * FROM contenidos WHERE disciplina_id = ? AND fase_id = ?", [d_id, f_id], (e, rows) => r(rows || []))));
ipcMain.handle('get-pdas-contenido', async (e, c_id, grado) => new Promise(r => universalDb.all("SELECT * FROM pdas WHERE contenido_id = ? AND grado = ?", [c_id, grado], (e, rows) => r(rows || []))));
ipcMain.handle('get-pdas-disciplina', async (e, disciplina_id, grado) => {
    return new Promise(r => {
        const targetGrado = parseInt(grado) || 3;
        const query = `
            SELECT p.id, p.grado, cf.nombre as campo, c.descripcion as contenido, p.descripcion as pda, p.proyecto as proyecto_sugerido
            FROM pdas p 
            JOIN contenidos c ON p.contenido_id = c.id 
            JOIN campos_formativos cf ON c.campo_id = cf.id
            WHERE p.grado = ?
            ORDER BY p.id ASC
        `;
        universalDb.all(query, [targetGrado], (err, rows) => {
            if (err) {
                console.error("Error al consultar PDAs de Primaria:", err);
                r([]);
            } else {
                r(rows || []);
            }
        });
    });
});
ipcMain.handle('get-grupos', async () => new Promise(r => db.all("SELECT * FROM grupos_maestro", [], (e, rows) => r(rows || []))));
ipcMain.handle('add-grupo', async (e, g) => new Promise((r, j) => db.run("INSERT INTO grupos_maestro (grado, seccion, disciplina_id, tipo, ciclo_escolar) VALUES (?, ?, ?, ?, ?)", [g.grado, g.seccion, g.disciplina_id, g.tipo, g.ciclo_escolar], function(err){ err ? j(err) : r({id: this.lastID, ...g}) })));
ipcMain.handle('delete-grupo', async (e, id) => new Promise(r => db.run("DELETE FROM grupos_maestro WHERE id = ?", [id], () => r(true))));
ipcMain.handle('get-alumnos', async (e, grupo_id) => {
    const query = grupo_id ? "SELECT * FROM alumnos WHERE grupo_id = ? ORDER BY nombre ASC" : "SELECT * FROM alumnos ORDER BY nombre ASC";
    const params = grupo_id ? [grupo_id] : [];
    return new Promise(r => db.all(query, params, (err, rows) => r(rows || [])));
});
ipcMain.handle('add-alumno', async (e, nombre, grupo_id) => new Promise((r, j) => db.run("INSERT INTO alumnos (nombre, grupo_id) VALUES (?, ?)", [nombre, grupo_id || null], function(err){ err ? j(err) : r(this.lastID) })));
ipcMain.handle('delete-alumno', async (e, id) => new Promise(r => db.run("DELETE FROM alumnos WHERE id = ?", [id], () => r(true))));
ipcMain.handle('get-vistos', async () => new Promise(r => db.all("SELECT * FROM vistos", (err, rows) => {
    const vistosMap = {};
    (rows || []).forEach(row => {
        if (!vistosMap[row.tipo]) vistosMap[row.tipo] = [];
        vistosMap[row.tipo].push(row.item_id);
    });
    r(vistosMap);
})));
ipcMain.handle('toggle-visto', async (e, tipo, itemId, completado) => {
    return new Promise(r => {
        if (completado) {
            db.run("INSERT OR IGNORE INTO vistos (tipo, item_id) VALUES (?, ?)", [tipo, itemId], () => r(true));
        } else {
            db.run("DELETE FROM vistos WHERE tipo = ? AND item_id = ?", [tipo, itemId], () => r(true));
        }
    });
});
const notifyEvaluationChange = (grupoId = null) => {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send('evaluacion-qr-actualizada', { grupo_id: grupoId });
    }
  }
};
const { transaction: evaluationTransaction, beforeQrMutation } = evaluationQr.registerEvaluationHandlers({
  ipcMain, db, variant: 'primaria', onChange: notifyEvaluationChange
});
const registerQrMutation = (channel, handler) => ipcMain.handle(channel, async (...args) => {
  const result = await evaluationTransaction(async () => {
    await beforeQrMutation(channel, args);
    const value = await handler(...args);
    if (value?.success === false) throw new Error('No se pudo guardar el cambio de Control QR.');
    return value;
  });
  if (result?.success !== false) notifyEvaluationChange();
  return result;
});
ipcMain.handle('get-notas-fecha', async (e, fecha) => new Promise(r => db.all("SELECT * FROM notas WHERE fecha = ?", [fecha], (err, rows) => r(rows || []))));
ipcMain.handle('get-notas-rango', async (e, f1, f2) => new Promise(r => db.all("SELECT * FROM notas WHERE fecha >= ? AND fecha <= ?", [f1, f2], (err, rows) => r(rows || []))));
ipcMain.handle('save-nota', async (e, aid, cid, fecha, valor) => {
  return new Promise((r) => {
    if (valor === null || valor === '') {
        db.run("DELETE FROM notas WHERE alumno_id = ? AND criterio_id = ? AND fecha = ?", [aid, cid, fecha], () => r(true));
    } else {
        db.run(`UPDATE notas SET valor = ? WHERE alumno_id = ? AND criterio_id = ? AND fecha = ?`, [valor, aid, cid, fecha], function() {
          if (this.changes === 0) db.run(`INSERT INTO notas (alumno_id, criterio_id, fecha, valor) VALUES (?, ?, ?, ?)`, [aid, cid, fecha, valor], () => r(true));
          else r(true);
        });
    }
  });
});
ipcMain.handle('check-hay-datos', async () => new Promise(r => db.get("SELECT count(*) as count FROM notas", (e, row) => r(row?.count > 0))));
ipcMain.handle('get-perfil', async (e, id) => new Promise(r => db.get("SELECT * FROM perfil_alumno WHERE alumno_id = ?", [id], (err, row) => r(row || {}))));
ipcMain.handle('save-perfil', (_event, data) => alumnoService.savePerfil(data));


ipcMain.handle('get-pdas', async () => new Promise((r, j) => {
  db.all(`
    SELECT p.id, p.grado, p.descripcion as descripcion, p.proyecto as proyecto_sugerido, 
           c.descripcion as contenido, cf.nombre as campo, p.fecha_sugerida as fecha
    FROM pdas p
    JOIN contenidos c ON p.contenido_id = c.id
    JOIN campos_formativos cf ON c.campo_id = cf.id
  `, [], (err, rows) => err ? j(err) : r(rows || []));
}));


ipcMain.handle('get-comisiones', async () => new Promise(r => db.all("SELECT * FROM comisiones", [], (e, rows) => r(rows || []))));
ipcMain.handle('add-comision', async (e, c) => new Promise(r => db.run("INSERT INTO comisiones (descripcion, fecha, tipo) VALUES (?,?,?)", [c.descripcion, c.fecha, c.tipo], () => r(true))));
ipcMain.handle('get-eventos-oficiales', async () => new Promise(r => db.all("SELECT * FROM eventos_oficiales", [], (e, rows) => { const map = {}; (rows || []).forEach(x => map[x.fecha] = x.tipo); r(map); })));
ipcMain.handle('save-evento-oficial', async (e, fecha, tipo) => new Promise(r => { if (tipo === 'BORRAR') db.run("DELETE FROM eventos_oficiales WHERE fecha = ?", [fecha], () => r(true)); else db.run("INSERT OR REPLACE INTO eventos_oficiales (fecha, tipo) VALUES (?, ?)", [fecha, tipo], () => r(true)); }));
ipcMain.handle('save-multiple-events', async (e, eventosObj) => {
    return new Promise(resolve => {
        db.serialize(() => {
            const stmt = db.prepare("INSERT OR REPLACE INTO eventos_oficiales (fecha, tipo) VALUES (?, ?)");
            for (const [fecha, tipo] of Object.entries(eventosObj)) {
                stmt.run(fecha, tipo);
            }
            stmt.finalize(() => resolve(true));
        });
    });
});
ipcMain.handle('clear-evaluaciones-rango', async (e, f1, f2) => new Promise(r => db.run("DELETE FROM notas WHERE fecha >= ? AND fecha <= ?", [f1, f2], () => r(true))));
ipcMain.handle('get-config', async () => new Promise(r => db.all("SELECT * FROM configuracion", [], (e, rows) => { const map = {}; (rows || []).forEach(x => map[x.llave] = x.valor); r(map); })));
registerQrMutation('save-config', async (e, llave, valor) => new Promise((resolve, reject) => {
  db.run("INSERT OR REPLACE INTO configuracion (llave, valor) VALUES (?, ?)", [llave, valor],
    err => err ? reject(err) : resolve(true));
}));
ipcMain.handle('seed-database', async () => true);
ipcMain.handle('get-asistencia-fecha', async (e, fecha, grupo_id) => new Promise(r => {
  db.all("SELECT * FROM asistencia WHERE fecha = ? AND (grupo_id = ? OR grupo_id IS NULL)", [fecha, grupo_id || null], (err, rows) => r(rows || []));
}));
registerQrMutation('save-asistencia-qr', async (e, alumno_id, fecha, estado, grupo_id) => new Promise((resolve, reject) => {
  db.run("INSERT OR REPLACE INTO asistencia (alumno_id, fecha, estado, grupo_id) VALUES (?, ?, ?, ?)",
    [alumno_id, fecha, estado || 'PRESENTE', grupo_id || null], function(err) {
      if (err) reject(err);
      else resolve(true);
    });
}));
registerQrMutation('save-asistencia-bulk', async (e, asistencias, fecha, grupo_id) => new Promise((resolve, reject) => {
  db.serialize(() => {
    const stmt = db.prepare("INSERT OR REPLACE INTO asistencia (alumno_id, fecha, estado, grupo_id) VALUES (?, ?, ?, ?)");
    let writeError;
    (asistencias || []).forEach(a => {
      stmt.run(a.alumno_id, fecha, a.estado || 'PRESENTE', grupo_id || null, err => {
        if (err && !writeError) writeError = err;
      });
    });
    stmt.finalize(err => (writeError || err) ? reject(writeError || err) : resolve(true));
  });
}));
ipcMain.handle('get-asistencia-rango', async (e, grupo_id, fechaInicio, fechaFin) => new Promise(r => {
  let sql = `
    SELECT a.*, al.nombre as alumno_nombre
    FROM asistencia a
    JOIN alumnos al ON a.alumno_id = al.id
    WHERE a.fecha >= ? AND a.fecha <= ?
  `;
  const params = [fechaInicio, fechaFin];
  if (grupo_id) {
    sql += " AND al.grupo_id = ? AND (a.grupo_id = ? OR a.grupo_id IS NULL)";
    params.push(grupo_id, grupo_id);
  }
  sql += " ORDER BY a.fecha ASC, al.nombre ASC";
  db.all(sql, params, (err, rows) => r(rows || []));
}));
ipcMain.handle('get-resumen-asistencia', async (e, grupo_id, fechaInicio, fechaFin) => new Promise(r => {
  let sql = `
    SELECT 
      al.id as alumno_id,
      al.nombre as alumno_nombre,
      COUNT(a.id) as total_dias,
      SUM(CASE WHEN a.estado = 'PRESENTE' THEN 1 ELSE 0 END) as presentes,
      SUM(CASE WHEN a.estado = 'RETARDO' THEN 1 ELSE 0 END) as retardos,
      SUM(CASE WHEN a.estado = 'FALTA' THEN 1 ELSE 0 END) as faltas,
      SUM(CASE WHEN a.estado = 'JUSTIFICADO' THEN 1 ELSE 0 END) as justificados
    FROM alumnos al
    LEFT JOIN asistencia a ON al.id = a.alumno_id AND a.fecha >= ? AND a.fecha <= ?
      AND (a.grupo_id = ? OR a.grupo_id IS NULL)
    WHERE (al.grupo_id = ? OR ? IS NULL)
    GROUP BY al.id, al.nombre
    ORDER BY al.nombre ASC
  `;
  db.all(sql, [fechaInicio, fechaFin, grupo_id || null, grupo_id || null, grupo_id || null], (err, rows) => {
    if (err || !rows) return r([]);
    const res = rows.map(row => {
      const tot = row.total_dias || 0;
      const pres = row.presentes || 0;
      const ret = row.retardos || 0;
      const fal = row.faltas || 0;
      const just = row.justificados || 0;
      const pct = tot > 0 ? Number((((pres + ret * 0.5 + just * 0.8) / tot) * 100).toFixed(1)) : 0;
      return {
        alumno_id: row.alumno_id,
        alumno_nombre: row.alumno_nombre,
        total_dias: tot,
        presentes: pres,
        retardos: ret,
        faltas: fal,
        justificados: just,
        porcentaje: pct
      };
    });
    r(res);
  });
}));
ipcMain.handle('save-nota-qr', async (e, alumno_id, criterio_id, fecha, valor) => new Promise((resolve, reject) => {
  if (!criterio_id) return resolve(false);
  db.run("INSERT OR REPLACE INTO notas (alumno_id, criterio_id, fecha, valor) VALUES (?, ?, ?, ?)",
    [alumno_id, criterio_id, fecha, valor], function(err) {
      if (err) reject(err);
      else resolve(true);
    });
}));
ipcMain.handle('get-todos-perfiles', async () => new Promise(r => {
  db.all("SELECT * FROM perfil_alumno", [], (err, rows) => {
    const map = {};
    (rows || []).forEach(row => { map[row.alumno_id] = row; });
    r(map);
  });
}));
registerQrMutation('save-trabajo-qr', async (e, alumno_id, campo, nombre_trabajo, fecha, valor, grupo_id) => new Promise((resolve, reject) => {
  const c = campo || 'GENERAL';
  const nt = nombre_trabajo || 'Trabajo';
  const gId = grupo_id || null;
  
  db.get(
    "SELECT id FROM trabajos_qr WHERE alumno_id = ? AND nombre_trabajo = ? AND fecha = ? AND (grupo_id = ? OR (grupo_id IS NULL AND ? IS NULL))",
    [alumno_id, nt, fecha, gId, gId],
    (err, existing) => {
      if (err) return reject(err);
      if (existing) {
        db.run(
          "UPDATE trabajos_qr SET valor = ?, campo = ? WHERE id = ?",
          [valor, c, existing.id],
          function(uErr) {
            if (uErr) reject(uErr);
            else resolve({ id: existing.id, alumno_id, campo: c, nombre_trabajo: nt, fecha, valor, grupo_id: gId, updated: true });
          }
        );
      } else {
        db.run(
          "INSERT INTO trabajos_qr (alumno_id, campo, nombre_trabajo, fecha, valor, grupo_id) VALUES (?, ?, ?, ?, ?, ?)",
          [alumno_id, c, nt, fecha, valor, gId],
          function(iErr) {
            if (iErr) reject(iErr);
            else resolve({ id: this.lastID, alumno_id, campo: c, nombre_trabajo: nt, fecha, valor, grupo_id: gId, updated: false });
          }
        );
      }
    }
  );
}));
ipcMain.handle('get-tareas-lista-grupo', async (e, grupo_id) => new Promise(r => {
  db.all(
    "SELECT DISTINCT nombre_trabajo FROM trabajos_qr WHERE (grupo_id = ? OR grupo_id IS NULL) ORDER BY id DESC",
    [grupo_id || null],
    (err, rows) => {
      r((rows || []).map(row => row.nombre_trabajo).filter(Boolean));
    }
  );
}));
ipcMain.handle('get-trabajos-qr', async (e, fecha, grupo_id) => new Promise(r => {
  db.all("SELECT * FROM trabajos_qr WHERE fecha = ? AND (grupo_id = ? OR grupo_id IS NULL) ORDER BY id DESC",
    [fecha, grupo_id || null], (err, rows) => r(rows || []));
}));
registerQrMutation('delete-actividad-fecha', async (e, fecha, nombreTrabajo, grupo_id) => new Promise(r => {
  db.run(
    "DELETE FROM trabajos_qr WHERE fecha = ? AND nombre_trabajo = ? AND (grupo_id = ? OR grupo_id IS NULL) AND alumno_id IN (SELECT id FROM alumnos WHERE grupo_id = ?)",
    [fecha, nombreTrabajo, grupo_id || null, grupo_id || null],
    function(err) {
      r({ success: !err, changes: this ? this.changes : 0 });
    }
  );
}));
registerQrMutation('update-actividad-fecha', async (e, fecha, nombreViejo, nombreNuevo, campoNuevo, grupo_id) => new Promise(r => {
  db.run(
    "UPDATE trabajos_qr SET nombre_trabajo = ?, campo = ? WHERE fecha = ? AND nombre_trabajo = ? AND (grupo_id = ? OR grupo_id IS NULL) AND alumno_id IN (SELECT id FROM alumnos WHERE grupo_id = ?)",
    [nombreNuevo, campoNuevo, fecha, nombreViejo, grupo_id || null, grupo_id || null],
    function(err) {
      r({ success: !err, changes: this ? this.changes : 0 });
    }
  );
}));
registerQrMutation('delete-trabajo-qr', async (e, id) => new Promise((resolve, reject) => {
  db.run("DELETE FROM trabajos_qr WHERE id = ?", [id], err => err ? reject(err) : resolve(true));
}));

  const grupoAndroid = async value => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Selecciona un grupo antes de guardar.');
    const grupo = await new Promise((resolve,reject) => db.get('SELECT * FROM grupos_maestro WHERE id = ?', [id], (error,row) => error ? reject(error) : resolve(row)));
    if (!grupo) throw new Error('El grupo seleccionado ya no existe.');
    return grupo;
  };
  const runAndroid = (sql, params) => new Promise((resolve,reject) => db.run(sql, params, function(error) { error ? reject(error) : resolve({changes:this.changes,lastID:this.lastID}); }));
  ipcMain.handle('get-planeacion', async (_, grupoId, semana, grado) => {
    if (!grupoId) return {};
    const params = [Number(grupoId), Number(semana)];
    let sql = 'SELECT * FROM planeacion WHERE grupo_id = ? AND semana = ?';
    if (grado) { sql += ' AND grado = ?'; params.push(Number(grado)); }
    return new Promise((resolve,reject) => db.get(sql + ' ORDER BY id DESC LIMIT 1', params, (error,row) => error ? reject(error) : resolve(row || {})));
  });
  ipcMain.handle('get-proyectos', async (_, grupoId, grado) => {
    if (!grupoId) return [];
    let sql = 'SELECT * FROM proyectos WHERE grupo_id = ?'; const params = [Number(grupoId)];
    if (grado) { sql += ' AND grado = ?'; params.push(Number(grado)); }
    return new Promise((resolve,reject) => db.all(sql + ' ORDER BY id DESC', params, (error,rows) => error ? reject(error) : resolve(rows || [])));
  });
  ipcMain.handle('save-proyecto', async (_, project) => {
    const grupo = await grupoAndroid(project.grupo_id);
    const fields = ['grado','grupo_id','nombre','metodologia','escenario','temporalidad','problemática','pdas_seleccionados','fases_contenido'];
    const values = [Number(project.grado || grupo.grado),grupo.id,project.nombre,project.metodologia,project.escenario,project.temporalidad,project.problemática,JSON.stringify(project.pdas_seleccionados || []),JSON.stringify(project.fases_contenido || {})];
    if (project.id) {
      const result = await runAndroid('UPDATE proyectos SET '+fields.map(field=>field+'=?').join(',')+' WHERE id=? AND grupo_id=?',[...values,project.id,grupo.id]);
      if (!result.changes) throw new Error('El proyecto no pertenece al grupo activo.');
    } else await runAndroid('INSERT INTO proyectos ('+fields.join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')',values);
    return true;
  });
  ipcMain.handle('save-planeacion', async (_, plan) => {
    const grupo = await grupoAndroid(plan.grupo_id);
    const grado = Number(plan.grado || grupo.grado), semana = Number(plan.semana);
    if (!Number.isInteger(semana) || semana < 1) throw new Error('Selecciona una semana válida.');
    const fields = ['grado','grupo_id','semana'];
    const values = [grado,grupo.id,semana];
    for (const day of ['lunes','martes','miercoles','jueves','viernes']) for (const moment of ['inicio','desarrollo','cierre']) { const field=day+'_'+moment;fields.push(field);values.push(plan[field] || ''); }
    for (const field of ['recursos','evaluacion','adecuaciones']) {fields.push(field);values.push(plan[field] || '');}
    const existing = await new Promise((resolve,reject)=>db.get('SELECT id FROM planeacion WHERE grupo_id=? AND grado=? AND semana=?',[grupo.id,grado,semana],(error,row)=>error?reject(error):resolve(row)));
    if (existing) await runAndroid('UPDATE planeacion SET '+fields.map(field=>field+'=?').join(',')+' WHERE id=? AND grupo_id=?',[...values,existing.id,grupo.id]);
    else await runAndroid('INSERT INTO planeacion ('+fields.join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')',values);
    return true;
  });
  const alumnoService = installStudentRecord({ db, ipcMain, variante: 'primaria' });

}
