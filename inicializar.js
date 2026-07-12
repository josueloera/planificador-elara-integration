// inicializar.js
// Ejecutar con: node inicializar.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Buscamos la base de datos en la raíz del proyecto
const dbPath = path.resolve(__dirname, 'nem_primaria.db');

console.log(`\n📂 Abriendo base de datos en: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar:', err.message);
    process.exit(1);
  }
  console.log('✅ Conexión exitosa.');
});

db.serialize(() => {
  console.log('🛠️  Creando tablas faltantes...');

  // 1. Tabla ALUMNOS
  db.run(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    )
  `);
  console.log('   -> Tabla "alumnos" verificada.');

  // 2. Tabla CRITERIOS
  db.run(`
    CREATE TABLE IF NOT EXISTS criterios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      porcentaje INTEGER NOT NULL
    )
  `);
  console.log('   -> Tabla "criterios" verificada.');

  // 3. Tabla NOTAS
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
  console.log('   -> Tabla "notas" verificada.');

  // 4. Tabla PROYECTOS
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
  console.log('   -> Tabla "proyectos" verificada.');
  
  // 5. Tabla PLANEACION
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
  console.log('   -> Tabla "planeacion" verificada.');
});

db.close(() => {
  console.log('\n✨ ¡LISTO! Tablas creadas. Ya puedes usar la App.');
});