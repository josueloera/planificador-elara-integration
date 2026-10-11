import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

function removeTemporary(directory) {
  const resolved=path.resolve(directory);
  assert.ok(resolved.startsWith(path.resolve(tmpdir())+path.sep));
  assert.ok(path.basename(resolved).startsWith('alumno-'));
  rmSync(resolved,{recursive:true,force:true});
}

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const android=existsSync(path.join(root,'src/android/studentRecord.js'));
const service=await import(pathToFileURL(path.join(root,android?'src/android/studentRecord.js':'electron/studentRecord.js')));
const installStudentRecord=service.installStudentRecord || service.default.installStudentRecord;
const toModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const evaluationUrl=toModule(readFileSync(path.join(root,'src/evaluacionAutomatica.js'),'utf8'));
const utils=await import(toModule(readFileSync(path.join(root,'src/alumnoUtils.js'),'utf8').replace("'./evaluacionAutomatica.js'",JSON.stringify(evaluationUrl))));

async function fixture(t, filename=':memory:') {
  const sqlite=new DatabaseSync(filename);
  sqlite.exec(`CREATE TABLE IF NOT EXISTS grupos_maestro(id INTEGER PRIMARY KEY,grado INTEGER,seccion TEXT,disciplina_id INTEGER,tipo TEXT,ciclo_escolar TEXT);
    CREATE TABLE IF NOT EXISTS alumnos(id INTEGER PRIMARY KEY,nombre TEXT,grupo_id INTEGER);
    CREATE TABLE IF NOT EXISTS perfil_alumno(alumno_id INTEGER PRIMARY KEY,curp TEXT,foto_url TEXT);
    CREATE TABLE IF NOT EXISTS criterios(id INTEGER PRIMARY KEY,grupo_id INTEGER,campo TEXT,nombre TEXT,porcentaje REAL);
    CREATE TABLE IF NOT EXISTS notas(id INTEGER PRIMARY KEY,alumno_id INTEGER,criterio_id INTEGER,fecha TEXT,valor REAL);
    CREATE TABLE IF NOT EXISTS asistencia(id INTEGER PRIMARY KEY,alumno_id INTEGER,grupo_id INTEGER,fecha TEXT,estado TEXT);
    CREATE TABLE IF NOT EXISTS incidencias(id INTEGER PRIMARY KEY,alumno_id INTEGER,fecha TEXT,situacion TEXT,medidas TEXT);`);
  const db={
    all(sql,params,callback){try{const rows=sqlite.prepare(sql).all(...params);queueMicrotask(()=>callback(null,rows));}catch(e){queueMicrotask(()=>callback(e));}},
    run(sql,params,callback){try{const result=sqlite.prepare(sql).run(...params);queueMicrotask(()=>callback.call({lastID:Number(result.lastInsertRowid),changes:Number(result.changes)},null));}catch(e){queueMicrotask(()=>callback(e));}}
  };
  const handlers=new Map();const api=installStudentRecord({db,ipcMain:{handle(name,fn){assert.ok(!handlers.has(name));handlers.set(name,fn);}}});
  await api.ready;
  const invoke=(name,...args)=>handlers.get(name)({},...args);
  t.after(()=>sqlite.close());
  sqlite.exec(`INSERT OR IGNORE INTO grupos_maestro VALUES(1,1,'A',1,'Secundaria','2026-2027'),(2,2,'B',2,'Secundaria','2026-2027');
    INSERT OR IGNORE INTO alumnos VALUES(1,'José Pérez',1),(2,'José Pérez',2);`);
  return {sqlite,api,invoke};
}
const file=(content='archivo',categoria='CURP')=>({nombre:'documento.txt',mime:'text/plain',categoria,tamano:Buffer.byteLength(content),contenido:Buffer.from(content).toString('base64')});

test('Migración compatible y perfil compartido conservan la foto y datos del tutor',async t=>{
  const f=await fixture(t);const photo='data:image/png;base64,aG9sYQ==';
  await f.invoke('alumno-save-perfil',{alumno_id:1,curp:'PRUEBA',foto_url:photo,nombre_tutor:'Tutor',tel_tutor:'5555555555'});
  await f.api.savePerfil({alumno_id:1,direccion:'Nuevo domicilio'});
  const data=await f.invoke('alumno-get-detalle',1);
  assert.equal(data.perfil.foto_url,photo);assert.equal(data.perfil.nombre_tutor,'Tutor');assert.equal(data.perfil.curp,'PRUEBA');assert.equal(data.perfil.direccion,'Nuevo domicilio');
  assert.equal((await f.invoke('alumno-get-detalle',2)).perfil.curp,undefined);
});
test('Expedientes de homónimos no se mezclan y rechazan lectura/eliminación ajena',async t=>{
  const f=await fixture(t);const saved=await f.invoke('alumno-add-documento',1,file());
  assert.equal((await f.invoke('alumno-list-expediente',1)).length,1);assert.deepEqual(await f.invoke('alumno-list-expediente',2),[]);
  await assert.rejects(f.invoke('alumno-get-documento',2,saved.id),/no pertenece/);await assert.rejects(f.invoke('alumno-delete-documento',2,saved.id),/no pertenece/);
  assert.equal((await f.invoke('alumno-get-documento',1,saved.id)).contenido,file().contenido);
  await f.invoke('alumno-delete-documento',1,saved.id);assert.deepEqual(await f.invoke('alumno-list-expediente',1),[]);
});
test('Archivo de más de 2 MB se recupera por fragmentos sin alterar sus bytes',async t=>{
  const f=await fixture(t);const text='á'.repeat(1500000),original=file(text);const saved=await f.invoke('alumno-add-documento',1,original);
  const restored=await f.invoke('alumno-get-documento',1,saved.id);assert.equal(restored.contenido,original.contenido);assert.equal(restored.tamano,3000000);
  assert.equal('contenido' in (await f.invoke('alumno-list-expediente',1))[0],false);
});
test('Valida alumno, tamaño real, categoría y contenido antes de guardar',async t=>{
  const f=await fixture(t);
  await assert.rejects(f.invoke('alumno-add-documento',999,file()),/ya no existe/);
  await assert.rejects(f.invoke('alumno-add-documento',1,{...file(),tamano:50}),/20 MB/);
  await assert.rejects(f.invoke('alumno-add-documento',1,file('hola','Inexistente')),/categoría/);
  await assert.rejects(f.invoke('alumno-add-documento',1,{...file(),contenido:'<script>'}),/válidos/);
  await assert.rejects(f.invoke('alumno-save-perfil',{alumno_id:1,foto_url:'javascript:alert(1)'}),/foto/);
  assert.deepEqual(await f.invoke('alumno-list-expediente',1),[]);
});
test('Notas y criterios quedan aislados por alumno y grupo',async t=>{
  const f=await fixture(t);f.sqlite.exec(`INSERT INTO criterios VALUES(1,1,'LENGUAJES','Trabajo',100),(2,2,'LENGUAJES','Trabajo',100);
    INSERT INTO notas VALUES(1,1,1,'2026-10-10',8),(2,2,2,'2026-10-10',2),(3,1,2,'2026-10-10',0);`);
  const a=await f.invoke('alumno-get-detalle',1);assert.deepEqual(a.notas.map(n=>n.valor),[8]);assert.deepEqual(a.criterios.map(c=>c.id),[1]);
});
test('Búsqueda ignora acentos y distingue grado y materia',()=>{
  const alumnos=[{id:1,nombre:'José Pérez',grado:1,materia:'Español'},{id:2,nombre:'José Pérez',grado:2,materia:'Matemáticas'}];
  assert.deepEqual(utils.filtrarAlumnos(alumnos,'jose perez','2').map(a=>a.id),[2]);assert.deepEqual(utils.filtrarAlumnos(alumnos,'jose español').map(a=>a.id),[1]);
});
test('Calificaciones QR respetan trimestre, alumno y campos; sin nota se conserva null',()=>{
  const d={alumno:{id:1},criterios:[{id:1,campo:'LENGUAJES',porcentaje:100},{id:2,campo:'SABERES',porcentaje:100}],notas:[{alumno_id:1,criterio_id:1,fecha:'2026-10-10',valor:1},{alumno_id:1,criterio_id:2,fecha:'2026-10-10',valor:7},{alumno_id:2,criterio_id:2,fecha:'2026-10-10',valor:0}]};
  const periods={1:{nombre:'Primero',inicio:'2026-08-01',fin:'2026-11-01'},2:{nombre:'Segundo',inicio:'2026-11-02',fin:'2027-02-01'}};
  const auto={1:{enlaces:[{criterio_id:1}],notas:[{alumno_id:1,criterio_id:1,fecha:'2026-10-10',valor:9},{alumno_id:1,criterio_id:1,fecha:'2027-01-01',valor:0},{alumno_id:2,criterio_id:1,fecha:'2026-10-10',valor:0}]}};
  const rows=utils.construirCalificaciones(d,auto,periods,'primaria','Primaria');assert.equal(rows[0].nota,9);assert.equal(rows[1].nota,7);assert.equal(rows[4].nota,null);
  const secondary=utils.construirCalificaciones(d,auto,periods,'secundaria','Español');assert.equal(secondary[0].nota,8);assert.equal(secondary[0].materia,'Español');
});
test('HTML exportado escapa datos y ZIP conserva nombres Unicode y archivos originales',async t=>{
  const html=utils.htmlPerfil({alumno:{nombre:'<script>alert(1)</script>'},perfil:{direccion:'<img onerror=x>'},calificaciones:[],archivos:[]});
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img onerror'));
  const zip=utils.crearZip([{name:'Perfil.html',data:html},{name:'Documentos/CURP/niño.txt',data:new TextEncoder().encode('contenido original á')}]);
  const dir=mkdtempSync(path.join(tmpdir(),'alumno-zip-'));t.after(()=>removeTemporary(dir));
  writeFileSync(path.join(dir,'expediente.zip'),Buffer.from(await zip.arrayBuffer()));
  const {spawnSync}=await import('node:child_process');const result=spawnSync(process.platform==='win32'?'python':'python3',['-c',"import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;assert z.read('Documentos/CURP/niño.txt').decode()=='contenido original á';assert 'Perfil.html' in z.namelist()",path.join(dir,'expediente.zip')],{encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr);
});
test('Persistencia de expediente y migración repetida tras reabrir SQLite',async t=>{
  const dir=mkdtempSync(path.join(tmpdir(),'alumno-persistencia-'));t.after(()=>removeTemporary(dir));const dbPath=path.join(dir,'user.sqlite');
  const first=await fixture({after:()=>{}},dbPath);await first.invoke('alumno-add-documento',1,file('persistente'));await first.api.savePerfil({alumno_id:1,nombre_tutor:'Persona tutora'});first.sqlite.close();
  const second=await fixture({after:()=>{}},dbPath);try{const data=await second.invoke('alumno-get-detalle',1);assert.equal(data.archivos.length,1);assert.equal(data.perfil.nombre_tutor,'Persona tutora');assert.equal(Buffer.from((await second.invoke('alumno-get-documento',1,data.archivos[0].id)).contenido,'base64').toString(),'persistente');}finally{second.sqlite.close();}
});
