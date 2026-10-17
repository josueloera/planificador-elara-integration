const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const sqlite3=require(path.join(process.cwd(),'node_modules/sqlite3'));
const {snapshot,restore,validateBackup}=require(path.join(process.cwd(),'electron/databaseBackup.cjs'));
const open=p=>new Promise((res,rej)=>{const d=new sqlite3.Database(p,e=>e?rej(e):res(d));});
const run=(d,s,p=[])=>new Promise((res,rej)=>d.run(s,p,e=>e?rej(e):res()));
const all=(d,s)=>new Promise((res,rej)=>d.all(s,(e,r)=>e?rej(e):res(r)));
const close=d=>new Promise((res,rej)=>d.close(e=>e?rej(e):res()));
for(const edition of ['primaria','secundaria'])test(edition+': copia completa, cruce de plataformas y rechazo sin pérdida',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'planificador-backup-test-'));
 const source=path.join(dir,'desktop.sqlite'),dest=path.join(dir,'destination.sqlite'),backup=path.join(dir,'portable.sqlite');
 const db=await open(source),target=await open(dest);
 t.after(async()=>{await close(db);await close(target);});
 for(const d of [db,target])for(const sql of [
  'CREATE TABLE IF NOT EXISTS configuracion(llave TEXT PRIMARY KEY, valor TEXT)',
  'CREATE TABLE IF NOT EXISTS alumnos(id INTEGER PRIMARY KEY,nombre TEXT,grupo_id INTEGER)',
  'CREATE TABLE IF NOT EXISTS grupos_maestro(id INTEGER PRIMARY KEY,grado INTEGER)',
  'CREATE TABLE IF NOT EXISTS criterios(id INTEGER PRIMARY KEY,grupo_id INTEGER,campo TEXT)',
  'CREATE TABLE IF NOT EXISTS notas(alumno_id INTEGER,criterio_id INTEGER,fecha TEXT,valor REAL)'
 ])await run(d,sql);
 for(const d of [db,target])for(const table of ['alumnos','criterios']){
  const columns=await all(d,'PRAGMA table_info('+table+')');
  if(!columns.some(c=>c.name==='grupo_id'))await run(d,'ALTER TABLE '+table+' ADD COLUMN grupo_id INTEGER');
 }
 await run(db,'DROP TABLE IF EXISTS planificador_android_meta');
 await run(db,'CREATE TABLE backup_blob_probe (id INTEGER PRIMARY KEY, bytes BLOB, label TEXT)');
 const blob=Buffer.from([0,1,127,128,255,0,42]);
 await run(db,'INSERT INTO backup_blob_probe VALUES(1,?,?)',[blob,'María Ñ á']);
 await run(db,"INSERT OR REPLACE INTO configuracion VALUES('qr_actividades:7:2026-10-17',?)",[JSON.stringify([{nombre:'Tarea',categoria:'TAREA',alumno_ids:[1,2]}])]);
 await run(target,"INSERT OR REPLACE INTO configuracion VALUES('before-import','preserve me')");
 await snapshot({db,sqlite3,edition,version:'1.0.17'},backup);
 await validateBackup(sqlite3,backup,edition);
 await assert.rejects(validateBackup(sqlite3,backup,edition==='primaria'?'secundaria':'primaria'),/pertenece/);
 const before=await all(target,'SELECT * FROM configuracion ORDER BY llave');
 await assert.rejects(restore({db:target,sqlite3,edition:edition==='primaria'?'secundaria':'primaria',version:'1.0.17'},backup,path.join(dir,'preserved')),/pertenece/);
 assert.deepEqual(await all(target,'SELECT * FROM configuracion ORDER BY llave'),before);
 const result=await restore({db:target,sqlite3,edition,version:'1.0.17'},backup,path.join(dir,'preserved'));
 assert.equal(result.restartRequired,true);
 const rows=await all(target,'SELECT * FROM backup_blob_probe');assert.deepEqual(rows[0].bytes,blob);assert.equal(rows[0].label,'María Ñ á');
 const saved=await open(result.backupPath);
 assert.equal((await all(saved,"SELECT valor FROM configuracion WHERE llave='before-import'"))[0].valor,'preserve me');await close(saved);
 // Re-export the restored DB (Android-compatible marker) and restore back to desktop.
 const returned=path.join(dir,'returned.sqlite');await snapshot({db:target,sqlite3,edition,version:'1.0.17'},returned);
 await restore({db,sqlite3,edition,version:'1.0.17'},returned,path.join(dir,'preserved-again'));
 assert.deepEqual((await all(db,'SELECT * FROM backup_blob_probe'))[0].bytes,blob);
 const corrupt=path.join(dir,'corrupt.sqlite');await fs.writeFile(corrupt,'not a database');
 await assert.rejects(restore({db:target,sqlite3,edition,version:'1.0.17'},corrupt,path.join(dir,'preserved')));
 assert.deepEqual((await all(target,'SELECT * FROM backup_blob_probe'))[0].bytes,blob);
});
