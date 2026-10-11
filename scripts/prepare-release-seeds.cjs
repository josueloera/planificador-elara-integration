// Genera copias para distribuir; nunca modifica las bases del proyecto o del usuario.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync, backup } = require('node:sqlite');

const catalogTables = new Set(['fases', 'grados', 'campos_formativos', 'disciplinas', 'contenidos', 'pdas', 'contenido_pda']);
const quote = value => '"' + value.replaceAll('"', '""') + '"';

async function prepareReleaseSeeds(projectDir = path.resolve(__dirname, '..')) {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
  const config = structuredClone(pkg.build);
  const directory = path.join(projectDir, '.release-seeds');
  fs.mkdirSync(directory, { recursive: true });
  for (const resource of config.extraResources) {
    if (path.basename(resource.from) !== resource.from || !resource.from.endsWith('.db')) {
      throw new Error('Base de distribución no admitida: ' + resource.from);
    }
    const sourcePath = path.join(projectDir, resource.from);
    const destination = path.join(directory, resource.from);
    if (fs.existsSync(destination)) throw new Error('Ya existe una copia de distribución: ' + destination);
    const source = new DatabaseSync(sourcePath, { readOnly: true });
    try {
      await backup(source, destination);
    } finally {
      source.close();
    }
    const clean = new DatabaseSync(destination);
    try {
      clean.exec('PRAGMA foreign_keys=OFF; BEGIN');
      const tables = clean.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => row.name);
      for (const table of tables) {
        if (catalogTables.has(table)) continue;
        if (table === 'configuracion') {
          clean.exec("DELETE FROM configuracion WHERE llave NOT IN ('fechaInicioStr','periodos')");
        } else {
          clean.exec('DELETE FROM ' + quote(table));
        }
      }
      if (clean.prepare("SELECT 1 FROM sqlite_master WHERE name='sqlite_sequence'").get()) {
        for (const row of clean.prepare('SELECT name FROM sqlite_sequence').all()) {
          if (!catalogTables.has(row.name)) clean.prepare('DELETE FROM sqlite_sequence WHERE name=?').run(row.name);
        }
      }
      clean.exec('COMMIT; VACUUM');
      if (clean.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Copia SQLite dañada');
      for (const table of tables) {
        if (!catalogTables.has(table) && table !== 'configuracion' && clean.prepare('SELECT COUNT(*) AS count FROM ' + quote(table)).get().count) {
          throw new Error('Datos personales en la copia: ' + table);
        }
      }
    } finally {
      clean.close();
    }
    resource.from = destination;
    console.log('Catálogo de distribución limpio: ' + path.basename(destination));
  }
  const configPath = path.join(directory, 'build.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  return configPath;
}

module.exports = { prepareReleaseSeeds };
if (require.main === module) prepareReleaseSeeds().catch(error => { console.error(error.message); process.exitCode = 1; });
