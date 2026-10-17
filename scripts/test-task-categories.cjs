const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const sqlite3 = { Database: class {
  constructor(file) { this.db=new DatabaseSync(file); }
  run(sql,params,cb) { try { const r=this.db.prepare(sql).run(...params); cb.call({changes:Number(r.changes),lastID:Number(r.lastInsertRowid)},null); } catch(e) {cb(e);} }
  all(sql,params,cb) {try {cb(null,this.db.prepare(sql).all(...params));}catch(e){cb(e);}}
  close(cb) {this.db.close();cb();}
}};
for (const edition of ['primaria']) {
  test(edition + ': tareas independientes, NEE compartida, fecha, materia y ciclo', async t => {
    const modulePath = path.join(__dirname, '../electron/evaluationQr.js');
    const { registerEvaluationHandlers } = await import(pathToFileURL(modulePath));
    const db = new sqlite3.Database(':memory:');
    t.after(() => new Promise(resolve => db.close(resolve)));
    const run = (sql, params=[]) => new Promise((resolve,reject) => db.run(sql,params,function(e){e?reject(e):resolve(this)}));
    for (const sql of [
      'CREATE TABLE configuracion(llave TEXT PRIMARY KEY, valor TEXT)',
      'CREATE TABLE alumnos(id INTEGER PRIMARY KEY, nombre TEXT, grupo_id INTEGER)',
      'CREATE TABLE trabajos_qr(id INTEGER PRIMARY KEY, alumno_id INTEGER, grupo_id INTEGER, nombre_trabajo TEXT, campo TEXT, fecha TEXT, valor REAL)',
      'CREATE TABLE criterios(id INTEGER PRIMARY KEY, grupo_id INTEGER, campo TEXT, nombre TEXT, porcentaje REAL)',
      'CREATE TABLE notas(id INTEGER PRIMARY KEY, alumno_id INTEGER, criterio_id INTEGER, fecha TEXT, valor REAL)',
      "INSERT INTO alumnos VALUES(1,'General',1),(2,'NEE',1),(3,'Otro grupo',2)",
      "INSERT INTO criterios VALUES(1,1,'LENGUAJES','Trabajos',50),(2,1,'LENGUAJES','TAREAS',50)",
      "INSERT INTO configuracion VALUES('fechaInicioStr','2026-08-31')",
      `INSERT INTO configuracion VALUES('periodos','{"3":{"fin":"2027-07-16"}}')`
    ]) await run(sql);
    const handlers = new Map();
    const variant = edition.endsWith('secundaria') ? 'secundaria' : 'primaria';
    const api = registerEvaluationHandlers({ ipcMain: { handle: (c,h) => handlers.set(c,h) }, db, variant });
    const invoke = (c,...args) => handlers.get(c)(null,...args);
    const save = (nombre,categoria, ids=[1,2],fecha='2026-10-16',extra={}) => invoke('save-qr-actividad',1,fecha,{ nombre,categoria,modo:'TODOS',alumno_ids:ids,campo:'LENGUAJES',...extra });
    const work = (id,nombre,valor,fecha='2026-10-16') => api.transaction(async()=>{
      await api.beforeQrMutation('save-trabajo-qr',[null,id,'LENGUAJES',nombre,fecha,valor,1]);
      await run('INSERT INTO trabajos_qr(alumno_id,grupo_id,nombre_trabajo,campo,fecha,valor) VALUES(?,1,?,\'LENGUAJES\',?,?)',[id,nombre,fecha,valor]);
    });
    await invoke('save-qr-adecuaciones',1,'2026-08-31','2027-07-16','LENGUAJES',[2]);
    await save('Clase compartida','TRABAJO'); await save('Casa compartida','TAREA');
    await save('General','TRABAJO',[1],undefined,{modo:'GENERAL'});
    await assert.rejects(work(2,'General',10),/no está asignada/);
    await work(1,'Clase compartida',10); await work(2,'Clase compartida',8);
    await work(1,'Casa compartida',2); await work(2,'Casa compartida',0);
    await save('Mañana','TAREA',undefined,'2026-10-17'); await work(2,'Mañana',6,'2026-10-17');
    await save('Otro ciclo','TAREA',undefined,'2027-09-01'); await work(2,'Otro ciclo',9,'2027-09-01');
    for (const [criterio,tipo] of [[1,'trabajos'],[2,'tareas']]) await invoke('configurar-evaluacion-automatica',{grupo_id:1,criterio_ids:[criterio],tipo});
    let result=await invoke('get-evaluacion-automatica',1);
    const value=(id,c,fecha='2026-10-16')=>result.notas.find(n=>n.alumno_id===id&&n.criterio_id===c&&n.fecha===fecha)?.valor;
    assert.equal(value(1,1),10); assert.equal(value(2,1),8); assert.equal(value(1,2),2); assert.equal(value(2,2),0); assert.equal(value(2,2,'2026-10-17'),6);
    assert.equal(result.notas.some(n=>n.fecha==='2027-09-01'||n.alumno_id===3),false);
    await save('Casa compartida',undefined,[1,2],undefined,{editar:true});
    const acts=await invoke('get-qr-actividades',1,'2026-10-16','2026-10-16');
    assert.equal(acts.find(a=>a.nombre==='Casa compartida').categoria,'TAREA');
    await run("UPDATE trabajos_qr SET valor=4 WHERE alumno_id=2 AND nombre_trabajo='Casa compartida'");
    result=await invoke('get-evaluacion-automatica',1); assert.equal(value(2,2),4); assert.equal(value(2,1),8);
    await run("DELETE FROM trabajos_qr WHERE alumno_id=2 AND nombre_trabajo='Casa compartida'");
    result=await invoke('get-evaluacion-automatica',1); assert.equal(value(2,2),undefined); assert.equal(value(2,1),8);
    await assert.rejects(save('Inválida','OTRA'),/trabajos o tareas/);
  });
}
