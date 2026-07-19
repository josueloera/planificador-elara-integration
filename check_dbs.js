const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const appData = process.env.APPDATA;
const dbs = ['planificador-docente-elara-integration', 'planificador-docente-secundaria', 'planificador-elara-integration-userdata'];

dbs.forEach(folder => {
  const dbName = folder === 'planificador-elara-integration-userdata' ? 'nem_elara_integration.db' : 'nem_primaria.db';
  const dbPath = path.join(appData, folder, dbName);
  if (fs.existsSync(dbPath)) {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
      if (err) return console.error(err);
    });
    db.all("SELECT * FROM grupos_maestro", [], (err, rows) => {
      if (err) {
        console.error('Error in ' + folder + ':', err.message);
      } else {
        console.log('=== ' + folder + ' (' + dbName + ') ===');
        console.log(rows);
      }
      db.close();
    });
  }
});
