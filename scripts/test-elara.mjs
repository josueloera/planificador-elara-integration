import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {cteKey,newSessions,validateAssignment,reconcileResponses} from '../src/elaraDomain.mjs';
import {deriveKey,seal,unseal,randomBase64,compatible} from '../src/lanCrypto.mjs';
const require=createRequire(import.meta.url),{createReceiver,request,address}=require('../electron/lanServer.cjs');
test('CTE shares a school across groups and isolates schools, editions and cycles',()=>{
 const a={id:1,escuela:'Escuela Á',ciclo_escolar:'2026-2027'},cycle={fechaInicioStr:'2026-08-31'};
 assert.equal(cteKey('primaria',a,cycle),cteKey('primaria',{...a,id:2},cycle));
 for(const [edition,g] of [['secundaria',a],['primaria',{...a,escuela:'Escuela B'}],['primaria',{...a,ciclo_escolar:'2027-2028'}]])assert.notEqual(cteKey('primaria',a,cycle),cteKey(edition,g,cycle));
 const savedSchool={fechaInicioStr:'2026-08-31',nombreEscuela:'Escuela de Ajustes',cct:'15EPR0123X'};
 assert.doesNotThrow(()=>cteKey('primaria',{id:4,escuela:''},savedSchool));
 assert.equal(cteKey('primaria',{id:4,escuela:''},savedSchool),cteKey('primaria',{id:8},savedSchool));
 assert.throws(()=>cteKey('primaria',{},cycle),/escuela/);const sessions=newSessions();assert.equal(sessions.length,13);assert.equal(sessions.filter(s=>s.type==='Extraordinaria').length,5);assert.equal(sessions.filter(s=>s.type==='Ordinaria').length,8);
});
test('Specialist records preserve pending grades and handle corrections idempotently',()=>{
 let a=validateAssignment({subject:'Artes',email:'profe@example.com',start:'2026-09-01',end:'2026-11-27',criterionId:'10'},[{id:1,nombre:'Ana'},{id:2,nombre:'José'}],[{id:10,porcentaje:20},{id:11,porcentaje:80}]);
 const r={studentId:1,grade:'9',timestamp:'2026-10-20T20:00:00Z',responseId:'r1',email:a.email};
 a=reconcileResponses(a,[r,{...r,studentId:2,grade:''}]);assert.equal(a.records[1].grade,9);assert.equal(a.records[2],undefined);assert.deepEqual(reconcileResponses(a,[r]),a);
 const fixed=reconcileResponses(a,[{...r,grade:10,timestamp:'2026-10-21T20:00:00Z'}]);assert.equal(fixed.records[1].grade,10);assert.equal(fixed.history.length,1);assert.equal(reconcileResponses(fixed,[r]).records[1].grade,10);
 assert.throws(()=>reconcileResponses(a,[{...r,studentId:99}]),/ajeno/);assert.throws(()=>reconcileResponses(a,[{...r,grade:11}]),/escala/);
 assert.equal(reconcileResponses(a,[{...r,email:'otro@example.com',grade:5}]).records[1].grade,9);
});
test('LAN encryption rejects wrong PIN, tampering, editions and versions',async()=>{
 const salt=randomBase64(24),key=await deriveKey('123456789012',salt),other=await deriveKey('111111111111',salt);const p=await seal(key,{student:'María',grade:10});assert.deepEqual(await unseal(key,p),{student:'María',grade:10});await assert.rejects(unseal(other,p));await assert.rejects(unseal(key,{...p,data:p.data.slice(0,6)+'AB'+p.data.slice(8)}));
 assert.throws(()=>compatible({edition:'primaria',version:'1.0.25'},{edition:'secundaria',version:'1.0.25',protocol:1}),/misma/);assert.throws(()=>address('8.8.8.8:80'),/local/);assert.throws(()=>address('192.168.1.1:80@evil.com'),/local/);
});
test('LAN needs receiver approval, binds ticket and prevents replay',async t=>{
 const receiver=createReceiver({edition:'primaria',version:'1.0.25',salt:randomBase64(24)}),h=await receiver.start();t.after(()=>receiver.stop());const host='127.0.0.1:'+h.port;
 assert.equal((await request(host,'/hello')).session,h.session);
 await assert.rejects(request(host,'/transfer',{ticket:'wrong',packet:{iv:'x',data:'x'}}),/autorizada/);
 const {ticket}=await request(host,'/pair',{iv:'proof',data:'proof'});assert.equal(receiver.status().phase,'pairing');
 await assert.rejects(request(host,'/transfer',{ticket,packet:{iv:'x',data:'x'}}),/autorizada/);
 receiver.accept(ticket);assert.equal((await request(host,'/status/'+ticket)).phase,'accepted');
 await request(host,'/transfer',{ticket,packet:{iv:'x',data:'x'}});assert.equal(receiver.status().phase,'received');
 await assert.rejects(request(host,'/transfer',{ticket,packet:{iv:'x',data:'x'}}),/autorizada/);receiver.finish();assert.equal((await request(host,'/status/'+ticket)).phase,'done');
});
test('Specialist import is atomic, scoped, blocks manual conflicts and QR overlap',async t=>{
 const sqlite=require('../node_modules/sqlite3'),{registerEvaluationHandlers}=require('../electron/evaluationQr.js'),{registerSpecialists}=require('../electron/specialists.cjs');
 const db=new sqlite.Database(':memory:');t.after(()=>new Promise(r=>db.close(r)));const all=(s,p=[])=>new Promise((r,j)=>db.all(s,p,(e,v)=>e?j(e):r(v))),run=(s,p=[])=>new Promise((r,j)=>db.run(s,p,e=>e?j(e):r()));
 for(const sql of ['CREATE TABLE grupos_maestro(id INTEGER,grado INTEGER,escuela TEXT,ciclo_escolar TEXT)','CREATE TABLE alumnos(id INTEGER,nombre TEXT,grupo_id INTEGER)','CREATE TABLE criterios(id INTEGER,nombre TEXT,grupo_id INTEGER,campo TEXT,porcentaje REAL)','CREATE TABLE notas(alumno_id INTEGER,criterio_id INTEGER,fecha TEXT,valor REAL)','CREATE TABLE configuracion(llave TEXT PRIMARY KEY,valor TEXT)'])await run(sql);
 await run("INSERT INTO grupos_maestro VALUES(1,3,'Escuela Á','2026-2027')");await run("INSERT INTO alumnos VALUES(1,'Ana',1),(2,'José',1),(3,'Otra escuela',2)");await run("INSERT INTO criterios VALUES(10,'Artes',1,'LENGUAJES',20),(11,'Titular',1,'LENGUAJES',80)");await run("INSERT INTO configuracion VALUES('fechaInicioStr','2026-08-31')");
 const handlers=new Map(),ipcMain={handle:(n,h)=>handlers.set(n,h)};const {transaction}=registerEvaluationHandlers({ipcMain,db});registerSpecialists({ipcMain,db,transaction});
 const context={school:'Escuela Á',groupId:1,grade:3,cycle:'2026-2027',start:'2026-08-31'},key='elara:specialists:v1:'+JSON.stringify(context);
 let old={id:'a',formId:'form',criterionId:10,weight:20,field:'LENGUAJES',start:'2026-09-01',end:'2026-11-27',email:'profe@example.com',students:[{id:1},{id:2}],records:{},history:[]};await run('INSERT INTO configuracion VALUES(?,?)',[key,JSON.stringify([old])]);
 const response=(id,g)=>({studentId:id,grade:g,email:old.email,responseId:'r'+id,timestamp:'2026-10-20T20:00:00Z'});
 const invoke=a=>handlers.get('elara-specialists-import')(null,{key,context,assignment:a,expectedRecords:old.records});
 let next=reconcileResponses(old,[response(1,8),response(2,9)]);await run("INSERT INTO notas VALUES(2,10,'2026-11-27',5)");await assert.rejects(invoke(next),/manual/);assert.equal((await all('SELECT * FROM notas WHERE alumno_id=1')).length,0);
 await run('DELETE FROM notas');const entries=await invoke(next);assert.equal((await all('SELECT * FROM notas')).length,2);old=entries[0];await invoke(old);assert.equal((await all('SELECT * FROM notas')).length,2);
 await run("INSERT INTO configuracion VALUES('evaluacion_qr_ciclo:1:2026-2027',?)",[JSON.stringify([{criterio_id:10}])]);await assert.rejects(invoke(old),/QR/);
});
