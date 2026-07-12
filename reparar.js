// reparar.js
// Script de reparación de Base de Datos para Josue Loera
// Ejecutar con: node reparar.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Nombre de tu base de datos
const dbName = 'nem_primaria.db';
const dbPath = path.resolve(__dirname, dbName);

console.log(`\n🔍 Buscando base de datos en: ${dbPath}`);

// Conectar a la base de datos (se crea si no existe)
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al abrir la base de datos:', err.message);
    process.exit(1);
  }
  console.log('✅ Conexión exitosa a la base de datos SQLite.');
});

db.serialize(() => {
  console.log('🛠️  Iniciando creación de tablas faltantes...');

  // 1. Tabla ALUMNOS
  db.run(`
    CREATE TABLE IF NOT EXISTS alumnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creando tabla alumnos:', err);
    else console.log('   -> Tabla "alumnos": OK');
  });

  // 2. Tabla CRITERIOS (La que te daba error)
  db.run(`
    CREATE TABLE IF NOT EXISTS criterios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      porcentaje INTEGER NOT NULL
    )
  `, (err) => {
    if (err) console.error('Error creando tabla criterios:', err);
    else console.log('   -> Tabla "criterios": OK');
  });

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
  `, (err) => {
    if (err) console.error('Error creando tabla notas:', err);
    else console.log('   -> Tabla "notas": OK');
  });

  // 4. Tabla PROYECTOS (Por si acaso falta)
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
  `, (err) => {
    if (err) console.error('Error creando tabla proyectos:', err);
    else console.log('   -> Tabla "proyectos": OK');
  });

});

db.close((err) => {
  if (err) {
    console.error('Error al cerrar la base de datos:', err.message);
  }
  console.log('\n✨ ¡MANTENIMIENTO COMPLETADO!');
  console.log('👉 Ahora puedes reiniciar tu aplicación (npm start) y guardar criterios sin errores.\n');
});