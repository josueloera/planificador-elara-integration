const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const all = (db, sql, args=[]) => new Promise((resolve,reject)=>db.all(sql,args,(e,r)=>e?reject(e):resolve(r)));
const run = (db, sql, args=[]) => new Promise((resolve,reject)=>db.run(sql,args,e=>e?reject(e):resolve()));
const open = (sqlite3, filename, mode) => new Promise((resolve,reject)=>{const db=new sqlite3.Database(filename,mode,e=>e?reject(e):resolve(db));});
const close = db => new Promise((resolve,reject)=>db.close(e=>e?reject(e):resolve()));

// SQLite's online backup API takes a consistent snapshot, including WAL data.
function copyDatabase(db, filename, destination=true) {
  return new Promise((resolve,reject)=>{
    const backup=db.backup(filename,'main','main',destination,error=>{
      if(error){reject(error);return;}
      backup.step(-1,error=>backup.finish(finishError=>error||finishError?reject(error||finishError):resolve()));
    });
  });
}

async function validateBackup(sqlite3, filename, edition) {
  const stat=await fs.stat(filename);
  if(!stat.isFile()||stat.size>2*1024*1024*1024)throw Error('Selecciona una base de datos de hasta 2 GB.');
  const candidate=await open(sqlite3,filename,sqlite3.OPEN_READONLY);
  try {
    const checks=await all(candidate,'PRAGMA integrity_check');
    if(checks.length!==1||Object.values(checks[0])[0]!=='ok')throw Error('El respaldo está dañado.');
    const meta=await all(candidate,'SELECT edition FROM planificador_android_meta');
    if(meta.length!==1||meta[0].edition!==edition)throw Error('El respaldo no pertenece a '+edition+'.');
    const format=await all(candidate,"SELECT name FROM sqlite_master WHERE type='table' AND name='planificador_backup_meta'");
    if(format.length){const rows=await all(candidate,'SELECT format FROM planificador_backup_meta');if(rows.length!==1||rows[0].format!==1)throw Error('Actualiza la aplicación antes de importar este respaldo.');}
    for(const [table,columns] of Object.entries({alumnos:['id','nombre','grupo_id'],grupos_maestro:['id','grado'],criterios:['id','grupo_id','campo'],notas:['alumno_id','criterio_id','fecha','valor'],configuracion:['llave','valor']})){
      const schema=await all(candidate,`PRAGMA table_info("${table}")`);
      if(columns.some(c=>!schema.some(s=>s.name===c)))throw Error('El respaldo está incompleto: '+table);
    }
    const unsafe=await all(candidate,"SELECT name FROM sqlite_master WHERE type IN ('trigger','view')");
    if(unsafe.length)throw Error('El archivo contiene estructuras ajenas a los respaldos del Planificador.');
  } finally {await close(candidate);}
}

async function snapshot({db,sqlite3,edition,version},filename){
  await copyDatabase(db,filename);
  const copy=await open(sqlite3,filename,sqlite3.OPEN_READWRITE);
  try{
    await run(copy,'CREATE TABLE IF NOT EXISTS planificador_android_meta (edition TEXT NOT NULL)');
    await run(copy,'DELETE FROM planificador_android_meta');
    await run(copy,'INSERT INTO planificador_android_meta (edition) VALUES (?)',[edition]);
    await run(copy,'CREATE TABLE IF NOT EXISTS planificador_backup_meta (format INTEGER, edition TEXT, app_version TEXT)');
    await run(copy,'DELETE FROM planificador_backup_meta');
    await run(copy,'INSERT INTO planificador_backup_meta VALUES (1,?,?)',[edition,version]);
  }finally{await close(copy);}
  await validateBackup(sqlite3,filename,edition);
}

async function restore(options,filename,backupDir){
  await validateBackup(options.sqlite3,filename,options.edition);
  await fs.mkdir(backupDir,{recursive:true});
  const preserved=path.join(backupDir,`Antes-de-importar-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID()}.sqlite`);
  await snapshot(options,preserved);
  try{await copyDatabase(options.db,filename,false);}
  catch(error){await copyDatabase(options.db,preserved,false);throw error;}
  return {success:true,restartRequired:true,backupPath:preserved};
}

function registerBackupHandlers(options){
  const {ipcMain,dialog,BrowserWindow,app,dbPath}=options;
  let busy=false;
  const guarded=action=>async event=>{if(busy)throw Error('Espera a que termine el respaldo actual.');busy=true;try{return await action(event);}finally{busy=false;}};
  ipcMain.handle('export-backup',guarded(async event=>{
    const selected=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender),{title:'Exportar respaldo completo',defaultPath:`Planificador-${options.edition}-${new Date().toISOString().slice(0,10)}.sqlite`,filters:[{name:'Respaldo del Planificador',extensions:['sqlite']}]});
    if(selected.canceled)return {cancelled:true};
    if(path.resolve(selected.filePath)===path.resolve(dbPath))throw Error('Guarda el respaldo en una ubicación distinta de la base de datos activa.');
    const temp=path.join(app.getPath('temp'),'planificador-respaldo-'+crypto.randomUUID()+'.sqlite');
    try{await snapshot(options,temp);await fs.copyFile(temp,selected.filePath);return {success:true,path:selected.filePath};}
    finally{await fs.unlink(temp).catch(()=>{});}
  }));
  ipcMain.handle('import-backup',guarded(async event=>{
    const selected=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{title:'Importar respaldo completo',properties:['openFile'],filters:[{name:'Base de datos del Planificador',extensions:['sqlite','db']}]});
    if(selected.canceled)return {cancelled:true};
    return restore(options,selected.filePaths[0],path.join(app.getPath('userData'),'Respaldos'));
  }));
  ipcMain.handle('restart-after-backup',()=>{setTimeout(()=>{app.relaunch();app.quit();},250);return true;});
}
module.exports={copyDatabase,validateBackup,snapshot,restore,registerBackupHandlers};
