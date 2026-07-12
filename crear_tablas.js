const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Nombre de tu base de datos
const dbPath = path.resolve(__dirname, 'nem_primaria.db');

console.log(`\n🚧 Intentando reparar base de datos en: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al abrir la base de datos:', err.message);
  } else {
    console.log('✅ Conexión exitosa.');
  }
});

db.serialize(() => {
  // 1. Crear Tabla ALUMNOS
  db.run(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    )
  `);
  console.log(' -> Tabla "alumnos" creada/verificada.');

  // 2. Crear Tabla CRITERIOS
  db.run(`
    CREATE TABLE IF NOT EXISTS criterios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      porcentaje INTEGER NOT NULL
    )
  `);
  console.log(' -> Tabla "criterios" creada/verificada.');

  // 3. Crear Tabla NOTAS
  db.run(`
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumno_id INTEGER,
      criterio_id INTEGER,
      fecha TEXT,
      valor REAL,
      FOREIGN KEY(alumno_id) REFERENCES alumnos(id),
      FOREIGN KEY(criterio_id) REFERENCES criterios(id)
    )
  `);
  console.log(' -> Tabla "notas" creada/verificada.');

  // 4. Crear Tabla PROYECTOS
  db.run(`
    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grado INTEGER,
      nombre TEXT,
      metodologia TEXT,
      escenario TEXT,
      temporalidad TEXT,
      problemática TEXT,
      pdas_seleccionados TEXT,
      fases_contenido TEXT
    )
  `);
  console.log(' -> Tabla "proyectos" creada/verificada.');

  // 5. Crear Tabla PLANEACION
  db.run(`
    CREATE TABLE IF NOT EXISTS planeacion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grado INTEGER,
      semana INTEGER,
      lunes_inicio TEXT, lunes_desarrollo TEXT, lunes_cierre TEXT,
      martes_inicio TEXT, martes_desarrollo TEXT, martes_cierre TEXT,
      miercoles_inicio TEXT, miercoles_desarrollo TEXT, miercoles_cierre TEXT,
      jueves_inicio TEXT, jueves_desarrollo TEXT, jueves_cierre TEXT,
      viernes_inicio TEXT, viernes_desarrollo TEXT, viernes_cierre TEXT,
      recursos TEXT, evaluacion TEXT, adecuaciones TEXT
    )
  `);
  console.log(' -> Tabla "planeacion" creada/verificada.');
  
  // 6. Crear Tabla INCIDENCIAS (Bitácora)
  db.run(`
    CREATE TABLE IF NOT EXISTS incidencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumno_id INTEGER,
      fecha TEXT,
      situacion TEXT,
      involucrados TEXT,
      medidas TEXT,
      FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
    )
  `);
  console.log(' -> Tabla "incidencias" creada/verificada.');

  // 7. Crear Tabla PERFILES (Ficha técnica)
  db.run(`
    CREATE TABLE IF NOT EXISTS perfiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alumno_id INTEGER UNIQUE,
      tipo_sangre TEXT,
      servicio_medico TEXT,
      alergias TEXT,
      direccion TEXT,
      nombre_mama TEXT,
      tel_mama TEXT,
      nombre_papa TEXT,
      tel_papa TEXT,
      FOREIGN KEY(alumno_id) REFERENCES alumnos(id)
    )
  `);
  console.log(' -> Tabla "perfiles" creada/verificada.');
});

db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('\n✨ ¡REPARACIÓN COMPLETADA! Ahora puedes usar la App.');
});