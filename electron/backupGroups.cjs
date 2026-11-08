// Preview old backups without modifying them or weakening edition/integrity validation.
async function readBackupGroups(db, all) {
  const columns = await all(db, 'PRAGMA table_info(grupos_maestro)');
  const school = columns.some(c => c.name === 'escuela') ? 'escuela' : "'' AS escuela";
  return all(db, `SELECT id,grado,seccion,${school},ciclo_escolar FROM grupos_maestro`);
}
module.exports = { readBackupGroups };
