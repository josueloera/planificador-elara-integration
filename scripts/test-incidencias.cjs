const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { installIncidencias } = require('../electron/incidencias.js');

test('Migración compatible, CRUD, validación y aislamiento por alumno', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE alumnos(id INTEGER PRIMARY KEY, grupo_id INTEGER);
    INSERT INTO alumnos VALUES(1,10),(2,20);
    CREATE TABLE incidencias(id INTEGER PRIMARY KEY,alumno_id INTEGER,fecha TEXT,situacion TEXT,medidas TEXT,grupo_id INTEGER);
    INSERT INTO incidencias VALUES(1,1,'2026-10-01','Registro anterior','Acuerdo anterior',10);`);
  const db = {
    all(sql,params,cb) { try { const rows=sqlite.prepare(sql).all(...params); queueMicrotask(()=>cb(null,rows)); } catch(e) {queueMicrotask(()=>cb(e));} },
    run(sql,params,cb) { try {const r=sqlite.prepare(sql).run(...params); queueMicrotask(()=>cb.call({lastID:Number(r.lastInsertRowid),changes:Number(r.changes)},null));} catch(e) {queueMicrotask(()=>cb(e));} }
  };
  let handlers = {};
  const ipcMain = {handle(name, fn) {handlers[name]=fn;}};
  installIncidencias({db,ipcMain});
  const call = (name,d) => handlers[name](null,d);
  const [legacy] = await call('get-incidencias',1);
  assert.equal(legacy.medidas,'Acuerdo anterior');
  assert.equal(legacy.creado_en,null);
  const data = {alumno_id:1,fecha:'2026-10-13',hora:'10:35',lugar:'Patio',involucrados:'Alumno y docente',situacion:'Descripción\nsegunda línea',acciones:'Diálogo',medidas:'Dar seguimiento'};
  const {id} = await call('save-incidencia',data);
  let [row] = await call('get-incidencias',1);
  for (const key of Object.keys(data)) assert.equal(row[key],data[key]);
  assert.equal(row.grupo_id,10);
  assert.ok(row.creado_en);
  const creation=row.creado_en;
  await assert.rejects(call('save-incidencia',{...data,id,alumno_id:2}),/otro alumno/);
  await assert.rejects(call('delete-incidencia',{id,alumno_id:2}),/otro alumno/);
  await call('save-incidencia',{...data,id,acciones:'Acción corregida'});
  [row]=await call('get-incidencias',1);
  assert.equal(row.acciones,'Acción corregida');
  assert.equal(row.creado_en,creation);
  assert.ok(row.actualizado_en);
  await assert.rejects(call('save-incidencia',{...data,fecha:'2026-02-30'}),/fecha válida/);
  await assert.rejects(call('save-incidencia',{...data,hora:'25:00'}),/Hora/);
  await assert.rejects(call('save-incidencia',{...data,situacion:' '}),/Describe/);
  await assert.rejects(call('save-incidencia',{...data,alumno_id:999}),/no existe/);
  await call('delete-incidencia',{id,alumno_id:1});
  assert.equal((await call('get-incidencias',1)).length,1);
  assert.equal((await call('get-incidencias',2)).length,0);
  handlers={}; installIncidencias({db,ipcMain});
  assert.equal((await call('get-incidencias',1))[0].situacion,'Registro anterior');
  sqlite.close();
});
