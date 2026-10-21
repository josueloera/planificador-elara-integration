const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const lan=require('./lanServer.cjs'),backup=require('./databaseBackup.cjs');
function registerElara(options){
 const {ipcMain,app,db,sqlite3,edition,version}=options;let receiver=null,pending=null,busy=false;
 const guarded=fn=>async(...args)=>{if(busy)throw Error('Espera a que termine la operación actual.');busy=true;try{return await fn(...args);}finally{busy=false;}};
 const temporary=()=>path.join(app.getPath('temp'),'elara-'+crypto.randomUUID()+'.sqlite');
 const all=(connection,sql)=>new Promise((ok,no)=>connection.all(sql,(e,r)=>e?no(e):ok(r)));
 const close=d=>new Promise((ok,no)=>d.close(e=>e?no(e):ok()));
 ipcMain.handle('elara-info',()=>({version,edition,protocol:1}));
 ipcMain.handle('elara-google-request',async(_,request)=>{
  if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(request.url))throw Error('URL de Google inválida.');
  const response=await fetch(request.url,{method:'POST',body:JSON.stringify(request.body),headers:{'content-type':'application/json'},signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error('Google no respondió. Revisa la conexión y la implementación.');return response.json();
 });
 ipcMain.handle('elara-lan-start',async(_,salt)=>{if(receiver)await receiver.stop();if(typeof salt!=='string'||salt.length!==32)throw Error('Código de sesión inválido.');receiver=lan.createReceiver({version,edition,salt});return receiver.start();});
 ipcMain.handle('elara-lan-stop',async()=>{if(receiver)await receiver.stop();receiver=null;if(pending){await fs.unlink(pending.file).catch(()=>{});pending=null;}return true;});
 ipcMain.handle('elara-lan-state',()=>receiver?.status()||{phase:'closed'});
 ipcMain.handle('elara-lan-accept',(_,ticket)=>{receiver?.accept(ticket);return true;});
 ipcMain.handle('elara-lan-reject',()=>{receiver?.reject();return true;});
 ipcMain.handle('elara-lan-discover',()=>lan.discover());
 ipcMain.handle('elara-lan-request',(_,host,route,body)=>{if(!/^\/(hello|pair|transfer|status\/[a-f0-9-]+)$/.test(route))throw Error('Ruta inválida.');return lan.request(host,route,body);});
 ipcMain.handle('elara-lan-export',guarded(async()=>{const file=temporary();try{await backup.snapshot(options,file);if((await fs.stat(file)).size>24*1024*1024)throw Error('Este respaldo supera 24 MB. Utiliza la exportación a archivo.');return {data:(await fs.readFile(file)).toString('base64'),edition,version,protocol:1};}finally{await fs.unlink(file).catch(()=>{});}}));
 ipcMain.handle('elara-lan-preview',guarded(async(_,payload)=>{
  if(payload.version!==version||payload.edition!==edition||payload.protocol!==1||typeof payload.data!=='string'||payload.data.length>34*1024*1024)throw Error('Respaldo incompatible.');
  const file=temporary();try{
   await fs.writeFile(file,Buffer.from(payload.data,'base64'));await backup.validateBackup(sqlite3,file,edition);
   const candidate=await new Promise((ok,no)=>{const d=new sqlite3.Database(file,sqlite3.OPEN_READONLY,e=>e?no(e):ok(d));});
   let groups,students,meta;try{groups=await all(candidate,'SELECT id,grado,seccion,escuela,ciclo_escolar FROM grupos_maestro');students=(await all(candidate,'SELECT count(*) AS total FROM alumnos'))[0].total;meta=await all(candidate,'SELECT app_version FROM planificador_backup_meta');}finally{await close(candidate);}
   if(meta.length!==1||meta[0].app_version!==version)throw Error('La base de datos pertenece a otra versión.');
   if(pending)await fs.unlink(pending.file).catch(()=>{});pending={file,token:crypto.randomUUID()};return {token:pending.token,groups,students,bytes:(await fs.stat(file)).size};
  }catch(e){await fs.unlink(file).catch(()=>{});throw e;}
 }));
 ipcMain.handle('elara-lan-import',guarded(async(_,token)=>{if(!pending||pending.token!==token)throw Error('Vuelve a revisar el respaldo.');const result=await backup.restore(options,pending.file,path.join(app.getPath('userData'),'Respaldos'));await fs.unlink(pending.file);pending=null;receiver?.finish();return result;}));
 app.on('before-quit',()=>{receiver?.stop();if(pending)fs.unlink(pending.file).catch(()=>{});});
}
module.exports={registerElara};
