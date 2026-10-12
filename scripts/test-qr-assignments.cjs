const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { registerEvaluationHandlers } = require('../electron/evaluationQr');
const sqlite3 = require('sqlite3');
const helper = import('data:text/javascript;base64,' + fs.readFileSync(require('node:path').join(__dirname, '../src/qrAssignments.js')).toString('base64'));

async function fixture(t, variant) {
  const db = new sqlite3.Database(':memory:');
  const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(e) { e ? reject(e) : resolve(this); }));
  t.after(() => new Promise(resolve => db.close(resolve)));
  for (const sql of [
    'CREATE TABLE configuracion (llave TEXT PRIMARY KEY, valor TEXT)',
    'CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT, grupo_id INTEGER)',
    'CREATE TABLE trabajos_qr (id INTEGER PRIMARY KEY, alumno_id INTEGER, grupo_id INTEGER, nombre_trabajo TEXT, campo TEXT, fecha TEXT, valor REAL)',
    'CREATE TABLE criterios (id INTEGER PRIMARY KEY, grupo_id INTEGER, campo TEXT, nombre TEXT, porcentaje REAL)',
    'CREATE TABLE notas (id INTEGER PRIMARY KEY, alumno_id INTEGER, criterio_id INTEGER, fecha TEXT, valor REAL)',
    "INSERT INTO alumnos VALUES (1,'Ana',1),(2,'Luis',1),(3,'Eva',1),(4,'Otro grupo',2)",
    "INSERT INTO criterios VALUES (1,1,'LENGUAJES','Trabajos',100)",
    "INSERT INTO configuracion VALUES ('fechaInicioStr','2026-08-31')",
    `INSERT INTO configuracion VALUES ('periodos','{"3":{"fin":"2027-07-16"}}')`
  ]) await run(sql);
  const handlers = new Map();
  const api = registerEvaluationHandlers({ ipcMain: { handle: (c,h) => handlers.set(c,h) }, db, variant });
  const invoke = (c,...args) => handlers.get(c)(null,...args);
  const save = (nombre, modo, ids, fecha='2026-10-12', campo='LENGUAJES', editar=false) => invoke('save-qr-actividad',1,fecha,{nombre,modo,alumno_ids:ids,campo,editar});
  const work = (id,nombre,nota=10,fecha='2026-10-12') => api.transaction(async () => {
    await api.beforeQrMutation('save-trabajo-qr',[null,id,'LENGUAJES',nombre,fecha,nota,1]);
    await run('INSERT INTO trabajos_qr (alumno_id,grupo_id,nombre_trabajo,campo,fecha,valor) VALUES (?,1,?,?,?,?)',[id,nombre,'LENGUAJES',fecha,nota]);
  });
  return { api, invoke, save, work, run };
}
for (const variant of ['primaria','secundaria']) {
  test(`${variant}: grupo mixto, tareas sin entregar y denominadores individuales`, async t => {
    const f=await fixture(t,variant), { tareasAsignadas }=await helper;
    await f.save('General','GENERAL',[1]); await f.save('Adaptada A','ADAPTADA',[2]); await f.save('Adaptada B','ADAPTADA',[3]); await f.save('Compartida','TODOS',[1,2,3]);
    const acts=await f.invoke('get-qr-actividades',1,'2026-10-12','2026-10-12');
    assert.equal(acts.length,4);
    for (const id of [1,2,3]) assert.equal(tareasAsignadas(acts,id).length,2);
    await f.work(1,'General'); await f.work(2,'Adaptada A',8); await f.work(3,'Adaptada B',0);
    await assert.rejects(f.work(1,'Adaptada A'),/no está asignada/);
    await assert.rejects(f.work(2,'General'),/no está asignada/);
    await assert.rejects(f.work(4,'General'),/no pertenece/);
    await f.invoke('configurar-evaluacion-automatica',{grupo_id:1,criterio_ids:[1],tipo:'trabajos'});
    const result=await f.invoke('get-evaluacion-automatica',1);
    assert.deepEqual(result.notas.map(n=>[n.alumno_id,n.valor]).sort(),[[1,10],[2,8],[3,0]]);
    assert.deepEqual(await f.invoke('get-qr-actividades',2,'2026-10-12','2026-10-12'),[]);
  });
  test(`${variant}: selección persistida y aislada por ciclo, grupo y materia`,async t=>{
    const f=await fixture(t,variant);
    await f.invoke('save-qr-adecuaciones',1,'2026-08-31','2027-07-16','LENGUAJES',[2]);
    assert.deepEqual(await f.invoke('get-qr-adecuaciones',1,'2026-08-31','2027-07-16','LENGUAJES'),[2]);
    assert.deepEqual(await f.invoke('get-qr-adecuaciones',1,'2027-08-31','2028-07-16','LENGUAJES'),[]);
    assert.deepEqual(await f.invoke('get-qr-adecuaciones',2,'2026-08-31','2027-07-16','LENGUAJES'),[]);
    assert.deepEqual(await f.invoke('get-qr-adecuaciones',1,'2026-08-31','2027-07-16','SABERES'),variant==='secundaria'?[2]:[]);
    await assert.rejects(f.invoke('save-qr-adecuaciones',1,'2026-08-31','2027-07-16','LENGUAJES',[4]),/no pertenecen/);
  });
  test(`${variant}: edición, duplicados, tareas históricas y borrado sin perder destinatarios`,async t=>{
    const f=await fixture(t,variant);
    await f.work(1,'Anterior');
    let list=await f.invoke('get-qr-actividades',1,'2026-10-12','2026-10-12');
    assert.equal(list[0].alumno_ids,null);
    await f.save('Adaptada','ADAPTADA',[2]);
    await assert.rejects(f.save('Adaptada','GENERAL',[1]),/Ya existe/);
    await assert.rejects(f.save('Vacia','ADAPTADA',[]),/al menos/);
    await f.work(2,'Adaptada');
    await assert.rejects(f.save('Adaptada','ADAPTADA',[3],'2026-10-12','LENGUAJES',true),/ya tiene una entrega/);
    await f.api.transaction(()=>f.api.beforeQrMutation('update-actividad-fecha',[null,'2026-10-12','Adaptada','Renombrada','LENGUAJES',1]));
    list=await f.invoke('get-qr-actividades',1,'2026-10-12','2026-10-12');
    assert.deepEqual(list.find(a=>a.nombre==='Renombrada').alumno_ids,[2]);
    await f.api.transaction(()=>f.api.beforeQrMutation('delete-actividad-fecha',[null,'2026-10-12','Renombrada',1]));
    list=await f.invoke('get-qr-actividades',1,'2026-10-12','2026-10-12');
    assert.equal(list.some(a=>a.nombre==='Renombrada'),false);
  });
}

test('Excel incluye actividades sin entregas, No aplica y denominadores individuales', async () => {
  const path = require('node:path');
  const helperSource = fs.readFileSync(path.join(__dirname,'../src/qrAssignments.js')).toString('base64');
  const source = fs.readFileSync(path.join(__dirname,'../src/utils/excelExporter.js'),'utf8')
    .replace("'../qrAssignments'", JSON.stringify('data:text/javascript;base64,' + helperSource));
  const { exportarTrabajosExcel } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const originalDocument = global.document, originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  let blob;
  global.document = { createElement: () => ({ click() {} }), body: { appendChild() {}, removeChild() {} } };
  URL.createObjectURL = value => { blob=value; return 'blob:test'; }; URL.revokeObjectURL = () => {};
  try {
    exportarTrabajosExcel({ grupoNombre:'Prueba', fechaInicio:'2026-10-12',fechaFin:'2026-10-12',campo:'TODOS',
      actividades:[{nombre:'General',fecha:'2026-10-12',campo:'LENGUAJES',alumno_ids:[1]},
        {nombre:'Adaptada',fecha:'2026-10-12',campo:'LENGUAJES',alumno_ids:[2]},
        {nombre:'Sin entrega',fecha:'2026-10-12',campo:'LENGUAJES',alumno_ids:[2]}],
      trabajos:[{nombre_trabajo:'General',fecha:'2026-10-12',campo:'LENGUAJES',alumno_id:1,valor:10},
        {nombre_trabajo:'Adaptada',fecha:'2026-10-12',campo:'LENGUAJES',alumno_id:2,valor:8}],
      resumenAlumnos:[{alumno_id:1,alumno_nombre:'Ana'},{alumno_id:2,alumno_nombre:'Luis'}] });
    const xml=await blob.text();
    assert.match(xml,/No aplica/); assert.match(xml,/Sin entrega/);
    assert.match(xml,/>1\/1<\/Data>/); assert.match(xml,/>1\/2<\/Data>/);
    assert.doesNotMatch(xml,/>1\/3<\/Data>/);
  } finally { global.document=originalDocument; URL.createObjectURL=originalCreate; URL.revokeObjectURL=originalRevoke; }
});
