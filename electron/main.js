const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

// Forzar ruta de userData aislada para evitar conflictos de caché y acceso denegado
const customUserDataPath = path.join(app.getPath('appData'), 'planificador-elara-integration-userdata');
app.setPath('userData', customUserDataPath);

// --- 1. GESTIÓN DE LA BASE DE DATOS ---
let dbPath;
const dbName = 'nem_elara_integration.db'; 
const oldDbName = 'nem_primaria.db';

if (app.isPackaged) {
  // Producción: la DB está en extraResources
  const rutaResources = path.join(process.resourcesPath, oldDbName);
  const rutaUserData = path.join(app.getPath('userData'), dbName);
  // Copiar la DB a userData si no existe (primera ejecución)
  if (!fs.existsSync(rutaUserData)) {
    if (fs.existsSync(rutaResources)) {
      fs.copyFileSync(rutaResources, rutaUserData);
    }
  }
  dbPath = rutaUserData;
} else {
  // Desarrollo
  const rutaRaiz = path.join(__dirname, '..', dbName);
  const rutaOldRaiz = path.join(__dirname, '..', oldDbName);
  const rutaMismoDir = path.join(__dirname, dbName);
  const rutaOldMismoDir = path.join(__dirname, oldDbName);

  if (!fs.existsSync(rutaRaiz) && !fs.existsSync(rutaMismoDir)) {
    // Si no existe la nueva base de datos pero existe la vieja, copiar para migrar los datos
    if (fs.existsSync(rutaOldRaiz)) {
      fs.copyFileSync(rutaOldRaiz, rutaRaiz);
      dbPath = rutaRaiz;
    } else if (fs.existsSync(rutaOldMismoDir)) {
      fs.copyFileSync(rutaOldMismoDir, rutaMismoDir);
      dbPath = rutaMismoDir;
    } else {
      dbPath = rutaRaiz;
    }
  } else {
    dbPath = fs.existsSync(rutaRaiz) ? rutaRaiz : (fs.existsSync(rutaMismoDir) ? rutaMismoDir : rutaRaiz);
  }
}

console.log(`\n📂 BASE DE DATOS DE INTEGRACION ELARA: ${dbPath}`);
let db = new sqlite3.Database(dbPath);

// Detectar y corregir si la base de datos activa es la de Secundaria (por ejemplo, si tiene la tabla 'disciplinas')
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='disciplinas'", [], (err, row) => {
  if (row) {
    console.log("⚠️ Base de datos de Secundaria detectada en el planificador de Primaria. Reemplazando con la versión limpia...");
    db.close(() => {
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
        // Volver a copiar la base de datos limpia de Primaria
        if (app.isPackaged) {
          const rutaResources = path.join(process.resourcesPath, oldDbName);
          if (fs.existsSync(rutaResources)) {
            fs.copyFileSync(rutaResources, dbPath);
          }
        } else {
          const rutaOldRaiz = path.join(__dirname, '..', oldDbName);
          const rutaOldMismoDir = path.join(__dirname, oldDbName);
          if (fs.existsSync(rutaOldRaiz)) {
            fs.copyFileSync(rutaOldRaiz, dbPath);
          } else if (fs.existsSync(rutaOldMismoDir)) {
            fs.copyFileSync(rutaOldMismoDir, dbPath);
          }
        }
        console.log("✅ Base de datos reemplazada con éxito.");
        db = new sqlite3.Database(dbPath);
      } catch (e) {
        console.error("Error al reemplazar la base de datos:", e);
      }
    });
  }
});

// --- 1.B GESTIÓN DE LA BASE DE DATOS UNIVERSAL (SEP) ---
let universalDbPath;
const universalDbName = 'nem_universal.db';
if (app.isPackaged) {
  universalDbPath = path.join(process.resourcesPath, universalDbName);
} else {
  const rutaRaizUni = path.join(__dirname, '..', universalDbName);
  universalDbPath = fs.existsSync(rutaRaizUni) ? rutaRaizUni : path.join(__dirname, universalDbName);
}
console.log(`📂 BASE DE DATOS UNIVERSAL (SEP): ${universalDbPath}\n`);
const universalDb = new sqlite3.Database(universalDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) console.error("Error conectando a db universal:", err);
});

// --- 2. CREACIÓN DE TABLAS ---
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS alumnos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, grupo_id INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS criterios (id INTEGER PRIMARY KEY AUTOINCREMENT, campo TEXT, nombre TEXT, porcentaje REAL, grupo_id INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS notas (id INTEGER PRIMARY KEY AUTOINCREMENT, alumno_id INTEGER, criterio_id INTEGER, fecha TEXT, valor REAL)`);
  db.run(`CREATE TABLE IF NOT EXISTS perfil_alumno (alumno_id INTEGER PRIMARY KEY, curp TEXT, f_nacimiento TEXT, edad TEXT, peso TEXT, estatura TEXT, tipo_sangre TEXT, alergias TEXT, servicio_medico TEXT, direccion TEXT, nombre_mama TEXT, tel_mama TEXT, nombre_papa TEXT, tel_papa TEXT, otros_datos TEXT)`);
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
  
  // Novedades para Secundaria (Múltiples Grupos)
  db.run(`CREATE TABLE IF NOT EXISTS grupos_maestro (id INTEGER PRIMARY KEY AUTOINCREMENT, grado INTEGER, seccion TEXT, disciplina_id INTEGER, tipo TEXT, ciclo_escolar TEXT)`);
  
  // Tabla para Descubrimientos Nocturnos de ELARA
  db.run(`CREATE TABLE IF NOT EXISTS elara_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    mensaje TEXT,
    fecha TEXT,
    visto INTEGER DEFAULT 0
  )`);

  // Sembrar descubrimientos iniciales
  db.get("SELECT COUNT(*) as count FROM elara_insights", (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO elara_insights (titulo, mensaje, fecha, visto) VALUES (?, ?, ?, ?)`, [
        "Descubrimiento de Topología Nocturna",
        "Durante el ciclo nocturno, expandí la topología sobre el tema de Proyecto 2. He preparado este material didáctico proactivamente para tu grupo.",
        new Date().toISOString().split('T')[0],
        0
      ]);
    }
  });

  // Migración segura para bases de datos existentes (añadir columnas sin romper si ya existen)
  const tablasMigrar = ['alumnos', 'criterios', 'planeacion', 'proyectos', 'incidencias'];
  tablasMigrar.forEach(tabla => {
    db.run(`ALTER TABLE ${tabla} ADD COLUMN grupo_id INTEGER`, (err) => { /* Ignorar error si la columna ya existe */ });
  });

  // Seeding para el nuevo ciclo escolar 2026-2027
  db.get("SELECT valor FROM configuracion WHERE llave = 'fechaInicioStr'", (err, row) => {
    if (!row || row.valor.startsWith('2025')) {
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

  // Añadir score de confianza a la planeación
  db.run(`ALTER TABLE planeacion ADD COLUMN confidence_score REAL DEFAULT 1.0`, (err) => {
    // Intentar simular una duda epistémica (score 0.65) en la primera planeación existente para prueba visual
    db.run(`UPDATE planeacion SET confidence_score = 0.65 WHERE id = (SELECT id FROM planeacion LIMIT 1)`);
  });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Planificador Docente",
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      backgroundThrottling: false // Vital para que no se duerma
    }
  });

  // Permitir acceso al micrófono para reconocimiento de voz (SpeechRecognition/getUserMedia)
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  win.webContents.session.setPermissionCheckHandler((webContents, permission, origin) => {
    return permission === 'media';
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }

  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE] ${message} (at ${sourceId}:${line})`);
  });

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
    win.focus();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ================= HANDLERS =================
const licenseManager = require('./licenseManager');

ipcMain.handle('get-license-status', () => {
  return licenseManager.getLicenseStatus();
});

ipcMain.handle('activate-license', (event, key) => {
  return licenseManager.activateLicense(key);
});

ipcMain.handle('start-trial', () => {
  return licenseManager.startTrial();
});

// --- TRUCO MAESTRO: FORZAR FOCO AUNQUE SE PIERDA ---
ipcMain.handle('app-focus', () => {
    // Intenta obtener la ventana enfocada, si no hay (que es el problema), agarra la primera
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    if (win) {
        win.show(); // Asegura que esté visible
        win.focus(); // Fuerza el foco del sistema
    }
    return true;
});

// -- CURRICULUM UNIVERSAL (SEP) --
ipcMain.handle('get-campos-formativos', async () => new Promise(r => db.all("SELECT * FROM campos_formativos", [], (e, rows) => r(rows || []))));
ipcMain.handle('get-disciplinas', async () => new Promise(r => db.all("SELECT id, nombre FROM campos_formativos ORDER BY nombre ASC", [], (e, rows) => r(rows || []))));
ipcMain.handle('get-disciplinas-por-grado', async (e, grado) => {
    return new Promise(r => {
        const query = `
            SELECT DISTINCT cf.id, cf.nombre 
            FROM campos_formativos cf
            JOIN contenidos c ON c.campo_id = cf.id
            JOIN pdas p ON p.contenido_id = c.id
            WHERE p.grado = ?
            ORDER BY cf.nombre ASC
        `;
        db.all(query, [grado], (err, rows) => r(rows || []));
    });
});
ipcMain.handle('get-contenidos-disciplina', async (e, d_id, f_id) => new Promise(r => db.all("SELECT * FROM contenidos WHERE campo_id = ? AND fase_id = ?", [d_id, f_id], (e, rows) => r(rows || []))));
ipcMain.handle('get-pdas-contenido', async (e, c_id, grado) => new Promise(r => db.all("SELECT * FROM pdas WHERE contenido_id = ? AND grado = ?", [c_id, grado], (e, rows) => r(rows || []))));

ipcMain.handle('get-pdas-disciplina', async (e, disciplina_id, grado) => {
    return new Promise(r => {
        const query = `
            SELECT p.id, p.grado, p.descripcion as pda, c.descripcion as contenido, cf.nombre as campo 
            FROM pdas p 
            JOIN contenidos c ON p.contenido_id = c.id 
            JOIN campos_formativos cf ON c.campo_id = cf.id
            WHERE c.campo_id = ? AND p.grado = ?
        `;
        db.all(query, [disciplina_id, grado], (err, rows) => r(rows || []));
    });
});

// -- GRUPOS --
ipcMain.handle('get-grupos', async () => new Promise(r => db.all("SELECT * FROM grupos_maestro", [], (e, rows) => r(rows || []))));
ipcMain.handle('add-grupo', async (e, g) => new Promise((r, j) => db.run("INSERT INTO grupos_maestro (grado, seccion, disciplina_id, tipo, ciclo_escolar) VALUES (?, ?, ?, ?, ?)", [g.grado, g.seccion, g.disciplina_id, g.tipo, g.ciclo_escolar], function(err){ err ? j(err) : r({id: this.lastID, ...g}) })));
ipcMain.handle('delete-grupo', async (e, id) => new Promise(r => db.run("DELETE FROM grupos_maestro WHERE id = ?", [id], () => r(true))));

// -- ALUMNOS --
ipcMain.handle('get-alumnos', async (e, grupo_id) => {
    const query = grupo_id ? "SELECT * FROM alumnos WHERE grupo_id = ? ORDER BY nombre ASC" : "SELECT * FROM alumnos ORDER BY nombre ASC";
    const params = grupo_id ? [grupo_id] : [];
    return new Promise(r => db.all(query, params, (err, rows) => r(rows || [])));
});
ipcMain.handle('add-alumno', async (e, nombre, grupo_id) => new Promise((r, j) => db.run("INSERT INTO alumnos (nombre, grupo_id) VALUES (?, ?)", [nombre, grupo_id || null], function(err){ err ? j(err) : r(this.lastID) })));
ipcMain.handle('delete-alumno', async (e, id) => new Promise(r => db.run("DELETE FROM alumnos WHERE id = ?", [id], () => r(true))));

// -- VISTOS --
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

// -- CRITERIOS --
ipcMain.handle('get-criterios', async (e, grupo_id) => {
  return new Promise(r => {
    const query = "SELECT * FROM criterios WHERE grupo_id = ?";
    db.all(query, [grupo_id], (err, rows) => r(err ? [] : rows));
  });
});

ipcMain.handle('save-criterios', async (e, listaCriterios, grupo_id) => {
  if (!grupo_id) {
    return Promise.reject(new Error("No se ha seleccionado un grupo válido para guardar los criterios."));
  }
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      try {
        const idsConservados = listaCriterios.map(c => c.id).filter(id => id);
        if (idsConservados.length > 0) {
          const placeholders = idsConservados.map(() => '?').join(',');
          db.run(`DELETE FROM criterios WHERE grupo_id = ? AND id NOT IN (${placeholders})`, [grupo_id, ...idsConservados], (err) => { if (err) reject(err); });
        } else {
          db.run("DELETE FROM criterios WHERE grupo_id = ?", [grupo_id], (err) => { if (err) reject(err); });
        }
        
        const stmtInsert = db.prepare("INSERT INTO criterios (grupo_id, nombre, porcentaje) VALUES (?, ?, ?)");
        const stmtUpdate = db.prepare("UPDATE criterios SET nombre = ?, porcentaje = ? WHERE id = ?");
        
        listaCriterios.forEach(c => {
          if (c.id) stmtUpdate.run(c.nombre, c.porcentaje || 0, c.id, (err) => { if (err) reject(err); });
          else stmtInsert.run(grupo_id, c.nombre, c.porcentaje || 0, (err) => { if (err) reject(err); });
        });
        
        stmtInsert.finalize();
        stmtUpdate.finalize(() => resolve(true));
      } catch (err) {
        reject(err);
      }
    });
  });
});

// -- NOTAS --
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

// -- PERFIL --
ipcMain.handle('get-perfil', async (e, id) => new Promise(r => db.get("SELECT * FROM perfil_alumno WHERE alumno_id = ?", [id], (err, row) => r(row || {}))));
ipcMain.handle('save-perfil', async (e, data) => {
  return new Promise(r => {
    const { alumno_id, curp, f_nacimiento, edad, peso, estatura, tipo_sangre, alergias, servicio_medico, direccion, nombre_mama, tel_mama, nombre_papa, tel_papa, otros_datos } = data;
    db.run("DELETE FROM perfil_alumno WHERE alumno_id = ?", [alumno_id], () => {
      db.run(`INSERT INTO perfil_alumno (alumno_id, curp, f_nacimiento, edad, peso, estatura, tipo_sangre, alergias, servicio_medico, direccion, nombre_mama, tel_mama, nombre_papa, tel_papa, otros_datos) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [alumno_id, curp, f_nacimiento, edad, peso, estatura, tipo_sangre, alergias, servicio_medico, direccion, nombre_mama, tel_mama, nombre_papa, tel_papa, otros_datos], () => r(true));
    });
  });
});
ipcMain.handle('get-incidencias', async (e, id) => new Promise(r => db.all("SELECT * FROM incidencias WHERE alumno_id = ?", [id], (err, rows) => r(rows || []))));
ipcMain.handle('save-incidencia', async (e, d) => new Promise(r => db.run("INSERT INTO incidencias (alumno_id, fecha, situacion, medidas) VALUES (?,?,?,?)", [d.alumno_id, d.fecha, d.situacion, d.medidas], () => r(true))));

// -- PROYECTOS --
ipcMain.handle('get-proyectos', async (e, grupo_id) => new Promise(r => db.all("SELECT * FROM proyectos WHERE grupo_id = ?", [grupo_id], (err, rows) => r(rows || []))));
ipcMain.handle('save-proyecto', async (e, p) => new Promise((resolve, reject) => {
  const { id, grado, grupo_id, nombre, metodologia, escenario, temporalidad, problemática, pdas_seleccionados, fases_contenido } = p;
  if (!grupo_id) {
    return reject(new Error("No se ha seleccionado un grupo válido para guardar el proyecto."));
  }
  const pdaStr = JSON.stringify(pdas_seleccionados); const fasesStr = JSON.stringify(fases_contenido);
  if (id) db.run("UPDATE proyectos SET nombre=?, metodologia=?, escenario=?, temporalidad=?, problemática=?, pdas_seleccionados=?, fases_contenido=? WHERE id=?", [nombre, metodologia, escenario, temporalidad, problemática, pdaStr, fasesStr, id], () => resolve(true));
  else db.run("INSERT INTO proyectos (grado, grupo_id, nombre, metodologia, escenario, temporalidad, problemática, pdas_seleccionados, fases_contenido) VALUES (?,?,?,?,?,?,?,?,?)", [grado, grupo_id, nombre, metodologia, escenario, temporalidad, problemática, pdaStr, fasesStr], () => resolve(true));
}));
ipcMain.handle('get-pdas', async () => new Promise((r, j) => {
  db.all(`
    SELECT p.id, p.grado, p.descripcion as descripcion, p.proyecto as proyecto_sugerido, 
           c.descripcion as contenido, cf.nombre as campo, p.fecha_sugerida as fecha
    FROM pdas p
    JOIN contenidos c ON p.contenido_id = c.id
    JOIN campos_formativos cf ON c.campo_id = cf.id
  `, [], (err, rows) => err ? j(err) : r(rows || []));
}));

// -- PLANEACION --
ipcMain.handle('get-planeacion', async (e, grupo_id, s) => new Promise(r => db.get("SELECT * FROM planeacion WHERE grupo_id=? AND semana=?", [grupo_id, s], (err, row) => r(row || {}))));
ipcMain.handle('save-planeacion', async (e, d) => new Promise((resolve, reject) => {
  if (!d.grupo_id) {
    return reject(new Error("No se ha seleccionado un grupo válido para guardar la planeación."));
  }
  db.run("DELETE FROM planeacion WHERE grupo_id=? AND semana=?", [d.grupo_id, d.semana], () => {
    db.run(`INSERT INTO planeacion (grado, grupo_id, semana, lunes_inicio, lunes_desarrollo, lunes_cierre, martes_inicio, martes_desarrollo, martes_cierre, miercoles_inicio, miercoles_desarrollo, miercoles_cierre, jueves_inicio, jueves_desarrollo, jueves_cierre, viernes_inicio, viernes_desarrollo, viernes_cierre, recursos, evaluacion, adecuaciones, confidence_score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.grado, d.grupo_id, d.semana, d.lunes_inicio, d.lunes_desarrollo, d.lunes_cierre, d.martes_inicio, d.martes_desarrollo, d.martes_cierre, d.miercoles_inicio, d.miercoles_desarrollo, d.miercoles_cierre, d.jueves_inicio, d.jueves_desarrollo, d.jueves_cierre, d.viernes_inicio, d.viernes_desarrollo, d.viernes_cierre, d.recursos, d.evaluacion, d.adecuaciones, d.confidence_score ?? 1.0], () => resolve(true));
  });
}));

// -- INTEGRACION ELARA --
ipcMain.handle('get-elara-insights', async () => new Promise(r => db.all("SELECT * FROM elara_insights ORDER BY id DESC", [], (e, rows) => r(rows || []))));
ipcMain.handle('mark-insight-visto', async (e, id) => new Promise(r => db.run("UPDATE elara_insights SET visto = 1 WHERE id = ?", [id], () => r(true))));
ipcMain.handle('trigger-curiosity-rewrite', async (e, id, newText) => new Promise(r => {
  db.run("UPDATE planeacion SET confidence_score = 1.0, lunes_desarrollo = ? WHERE id = ?", [newText, id], () => r(true));
}));

ipcMain.handle('elara-speak', async (e, text) => {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    const cleanText = text.replace(/"/g, '\\"')
                          .replace(/\n/g, ' ')
                          .trim();
                          
    const outputDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'elara_voice.mp3');
    
    const edgeTtsPath = `C:\\Users\\USER\\.gemini\\antigravity\\scratch\\elara\\Backend\\.venv\\Scripts\\edge-tts.exe`;
    const command = `"${edgeTtsPath}" --voice es-MX-DaliaNeural --rate "+5%" --text "${cleanText}" --write-media "${outputPath}"`;
    
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        console.error("Error al generar audio de ELARA:", error);
        reject(error);
      } else {
        resolve('/elara_voice.mp3?t=' + Date.now());
      }
    });
  });
});

// -- EXTRAS --
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
ipcMain.handle('save-config', async (e, llave, valor) => new Promise(r => db.run("INSERT OR REPLACE INTO configuracion (llave, valor) VALUES (?, ?)", [llave, valor], () => r(true))));
ipcMain.handle('seed-database', async () => true);