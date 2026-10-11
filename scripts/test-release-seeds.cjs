const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { prepareReleaseSeeds } = require('./prepare-release-seeds.cjs');

test('El instalador conserva catálogos y elimina datos personales solo en copias', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alumno-release-'));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(resolved).startsWith('alumno-release-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ build: { appId: 'test', extraResources: [{ from: 'seed.db', to: 'seed.db' }] } }));
  const original = path.join(root, 'seed.db');
  const db = new DatabaseSync(original);
  db.exec(`CREATE TABLE contenidos(id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT);
    INSERT INTO contenidos(nombre) VALUES('Catálogo NEM');
    CREATE TABLE alumnos(id INTEGER PRIMARY KEY AUTOINCREMENT,nombre TEXT);
    INSERT INTO alumnos(nombre) VALUES('Alumno de prueba');
    CREATE TABLE expediente_alumno(id INTEGER,contenido TEXT);
    INSERT INTO expediente_alumno VALUES(1,'archivo');
    CREATE TABLE configuracion(llave TEXT,valor TEXT);
    INSERT INTO configuracion VALUES('periodos','{}'),('fechaInicioStr','2026-08-01'),('clave_secreta','prueba');`);
  db.close();
  const hash = () => crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex');
  const before = hash();
  const configPath = await prepareReleaseSeeds(root);
  assert.equal(hash(), before);
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(config.appId, 'test');
  assert.equal(config.extraResources[0].to, 'seed.db');
  const clean = new DatabaseSync(config.extraResources[0].from, { readOnly: true });
  try {
    assert.equal(clean.prepare('SELECT nombre FROM contenidos').get().nombre, 'Catálogo NEM');
    assert.equal(clean.prepare('SELECT COUNT(*) AS n FROM alumnos').get().n, 0);
    assert.equal(clean.prepare('SELECT COUNT(*) AS n FROM expediente_alumno').get().n, 0);
    assert.deepEqual(clean.prepare('SELECT llave FROM configuracion ORDER BY llave').all().map(row => row.llave), ['fechaInicioStr', 'periodos']);
    assert.equal(clean.prepare("SELECT COUNT(*) AS n FROM sqlite_sequence WHERE name='alumnos'").get().n, 0);
  } finally {
    clean.close();
  }
});
