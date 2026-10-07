// Ejecutar desde la raíz del proyecto: node --test scripts/test-evaluation-daily.cjs
// Todas las bases de datos de estas pruebas son SQLite en memoria.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = process.cwd();
const projectRequire = createRequire(path.join(root, 'package.json'));
const sqlite3 = projectRequire('sqlite3');
const { registerEvaluationHandlers } = projectRequire('./electron/evaluationQr');
const frontend = import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/evaluacionAutomatica.js')).toString('base64'));
const days = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'];

async function fixture(t, variant) {
  const db = new sqlite3.Database(':memory:');
  t.after(() => new Promise((resolve, reject) => db.close(err => err ? reject(err) : resolve())));
  const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, err => err ? reject(err) : resolve()));
  const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
  const handlers = new Map();
  const notifications = [];
  await new Promise((resolve, reject) => db.exec(`
    CREATE TABLE configuracion (llave TEXT PRIMARY KEY, valor TEXT);
    CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT, grupo_id INTEGER);
    CREATE TABLE criterios (id INTEGER PRIMARY KEY, nombre TEXT, grupo_id INTEGER, campo TEXT, porcentaje REAL);
    CREATE TABLE trabajos_qr (id INTEGER PRIMARY KEY, alumno_id INTEGER, grupo_id INTEGER, fecha TEXT, campo TEXT, valor);
    CREATE TABLE asistencia (id INTEGER PRIMARY KEY, alumno_id INTEGER, grupo_id INTEGER, fecha TEXT, estado TEXT);
    CREATE TABLE notas (id INTEGER PRIMARY KEY, alumno_id INTEGER, criterio_id INTEGER, fecha TEXT, valor REAL);
    INSERT INTO alumnos VALUES (1, 'Ana', 1), (2, 'Luis', 1), (3, 'Otro grupo', 2);
    INSERT INTO criterios VALUES
      (101, 'Trabajos', 1, 'LENGUAJES', 50), (102, 'Examen', 1, 'LENGUAJES', 50),
      (103, 'Asistencia', 1, 'LENGUAJES', 10), (104, 'Trabajos saberes', 1, 'SABERES', 100),
      (105, 'Asistencia saberes', 1, 'SABERES', 10), (201, 'Otro grupo', 2, 'LENGUAJES', 100);
  `, err => err ? reject(err) : resolve()));
  await run('INSERT INTO configuracion VALUES (?, ?)', ['fechaInicioStr', '2026-08-31']);
  await run('INSERT INTO configuracion VALUES (?, ?)', ['periodos', JSON.stringify({ 1: { fin: '2026-11-27' }, 3: { fin: '2027-07-16' } })]);
  const { transaction } = registerEvaluationHandlers({
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) }, db, variant,
    onChange: id => notifications.push(id)
  });
  const invoke = (name, ...args) => handlers.get(name)(null, ...args);
  const link = (ids, tipo = 'trabajos', escala = 10, grupo_id = 1) => invoke('configurar-evaluacion-automatica', {
    grupo_id, criterio_ids: Array.isArray(ids) ? ids : [ids], tipo, escala
  });
  const addWork = (alumno, fecha, valor, campo = 'LENGUAJES', grupo = 1) => run(
    'INSERT INTO trabajos_qr (alumno_id, grupo_id, fecha, campo, valor) VALUES (?, ?, ?, ?, ?)', [alumno, grupo, fecha, campo, valor]);
  const addAttendance = (alumno, fecha, estado, grupo = 1) => run(
    'INSERT INTO asistencia (alumno_id, grupo_id, fecha, estado) VALUES (?, ?, ?, ?)', [alumno, grupo, fecha, estado]);
  return { run, all, invoke, link, addWork, addAttendance, transaction, notifications };
}

function rowsFor(result, criterio = 101, alumno = 1) {
  return result.notas.filter(n => n.criterio_id === criterio && n.alumno_id === alumno)
    .map(n => [n.fecha, n.valor]).sort((a, b) => a[0].localeCompare(b[0]));
}

for (const variant of ['primaria', 'secundaria']) {
  test(`${variant}: cada promedio tiene su fecha; los días vacíos no heredan el promedio anual`, async t => {
    const f = await fixture(t, variant);
    await f.link(101);
    await f.addWork(1, days[0], 8);
    await f.addWork(1, days[0], 10);
    await f.addWork(1, days[1], 2);
    for (const value of [null, '', '  ', 'sin nota']) await f.addWork(1, days[2], value);
    await f.addWork(1, days[3], 0);
    await f.addWork(1, '2026-08-01', 100);
    await f.addWork(3, days[0], 100, 'LENGUAJES', 2);
    await f.addWork(1, days[0], 100, 'LENGUAJES', 2);
    await f.addWork(2, days[0], 7, 'LENGUAJES', null);
    const result = await f.invoke('get-evaluacion-automatica', 1);
    assert.deepEqual(rowsFor(result), [[days[0], 9], [days[1], 2], [days[3], 0]]);
    assert.deepEqual(rowsFor(result, 101, 2), [[days[0], 7]]);
    assert.equal(result.notas.some(n => n.alumno_id === 3), false);
    const { mezclarNotasAutomaticas } = await frontend;
    assert.equal(mezclarNotasAutomaticas([], result, days[0])['1-101'], 9);
    assert.equal(mezclarNotasAutomaticas([], result, days[1])['1-101'], 2);
    assert.equal(mezclarNotasAutomaticas([], result, days[2])['1-101'], undefined);
    assert.equal(mezclarNotasAutomaticas([], result, days[3])['1-101'], 0);
    assert.equal(mezclarNotasAutomaticas([], result, '2026-10-09')['1-101'], undefined);
    const dayResult = await f.invoke('get-evaluacion-automatica', 1, { inicio: days[1], fin: days[1] });
    assert.deepEqual(rowsFor(dayResult), [[days[1], 2]]);
    assert.equal(dayResult.inicio, '2026-08-31');
    assert.equal(dayResult.fin, '2027-07-16');
    assert.deepEqual(f.notifications, [1]);
  });

  test(`${variant}: trabajos separados por campo en Primaria y por materia/grupo en Secundaria`, async t => {
    const f = await fixture(t, variant);
    await f.link(101);
    await f.link(104);
    await f.addWork(1, days[0], 8, 'LENGUAJES');
    await f.addWork(1, days[0], 2, 'Saberes y Pensamiento Científico');
    await f.addWork(3, days[0], 100, 'LENGUAJES', 2);
    const result = await f.invoke('get-evaluacion-automatica', 1);
    assert.deepEqual(rowsFor(result, 101), [[days[0], variant === 'primaria' ? 8 : 5]]);
    assert.deepEqual(rowsFor(result, 104), [[days[0], variant === 'primaria' ? 2 : 5]]);
    await assert.rejects(f.link(201), /no pertenece al grupo activo/);
    assert.equal(result.notas.some(n => n.alumno_id === 3), false);
  });

  test(`${variant}: asistencias por fecha y escala sin convertir un día vacío en falta`, async t => {
    const f = await fixture(t, variant);
    await f.link([103, 105], 'asistencia');
    for (let i = 0; i < days.length; i++) await f.addAttendance(1, days[i], ['PRESENTE', 'RETARDO', 'JUSTIFICADO', 'FALTA'][i]);
    await f.addAttendance(3, days[0], 'FALTA', 2);
    await f.addAttendance(1, days[0], 'FALTA', 2);
    const result = await f.invoke('get-evaluacion-automatica', 1);
    const expected = days.map((day, i) => [day, [10, 5, 8, 0][i]]);
    assert.deepEqual(rowsFor(result, 103), expected);
    assert.deepEqual(rowsFor(result, 105), expected);
    const empty = await f.invoke('get-evaluacion-automatica', 1, { inicio: '2026-10-09', fin: '2026-10-09' });
    assert.deepEqual(empty.notas, []);
    await f.link(103, 'asistencia', 100);
    const scaled = await f.invoke('get-evaluacion-automatica', 1, { inicio: days[1], fin: days[1] });
    assert.deepEqual(rowsFor(scaled, 103), [[days[1], 50]]);
    assert.deepEqual(rowsFor(scaled, 105), [[days[1], 5]]);
  });

  test(`${variant}: corregir o eliminar registros actualiza solo su día`, async t => {
    const f = await fixture(t, variant);
    await f.link(101);
    await f.link(103, 'asistencia');
    await f.addWork(1, days[0], 8);
    await f.addWork(1, days[1], 4);
    await f.addAttendance(1, days[0], 'PRESENTE');
    await f.addAttendance(1, days[1], 'RETARDO');
    await f.transaction(async () => {
      await f.run('UPDATE trabajos_qr SET valor = 2 WHERE fecha = ?', [days[0]]);
      await f.run("UPDATE asistencia SET estado = 'FALTA' WHERE fecha = ?", [days[0]]);
    });
    let result = await f.invoke('get-evaluacion-automatica', 1);
    assert.deepEqual(rowsFor(result), [[days[0], 2], [days[1], 4]]);
    assert.deepEqual(rowsFor(result, 103), [[days[0], 0], [days[1], 5]]);
    await f.transaction(async () => {
      await f.run('DELETE FROM trabajos_qr WHERE fecha = ?', [days[0]]);
      await f.run('DELETE FROM asistencia WHERE fecha = ?', [days[0]]);
    });
    result = await f.invoke('get-evaluacion-automatica', 1);
    assert.deepEqual(rowsFor(result), [[days[1], 4]]);
    assert.deepEqual(rowsFor(result, 103), [[days[1], 5]]);
  });

  test(`${variant}: trimestral pondera cada día y respeta el rango solicitado`, async t => {
    const f = await fixture(t, variant);
    await f.link(101);
    await f.addWork(1, days[0], 9);
    await f.addWork(1, days[1], 2);
    await f.addWork(1, '2027-01-01', 100);
    await f.run('INSERT INTO notas (alumno_id, criterio_id, fecha, valor) VALUES (1, 102, ?, 0), (1, 102, ?, 10), (1, 101, ?, 99)', [days[0], days[2], days[3]]);
    const automatic = await f.invoke('get-evaluacion-automatica', 1, { inicio: days[0], fin: days[3] });
    const manual = await f.all('SELECT * FROM notas');
    const criteria = await f.all('SELECT * FROM criterios WHERE id IN (101, 102)');
    const { promedioPeriodo, mezclarNotasAutomaticas } = await frontend;
    // Día 1: (9 + 0) / 2 = 4.5; día 2: 2; día 3: 10. Promedio: 5.5.
    assert.equal(promedioPeriodo(criteria, manual, automatic, 1), 5.5);
    assert.equal(promedioPeriodo(criteria, manual, automatic, 2), null);
    assert.equal(mezclarNotasAutomaticas(manual, automatic, days[3])['1-101'], undefined);
    await f.invoke('desvincular-evaluacion-automatica', 1, 101);
    const unlinked = await f.invoke('get-evaluacion-automatica', 1);
    assert.equal(mezclarNotasAutomaticas(manual, unlinked, days[3])['1-101'], 99);
    assert.equal((await f.all('SELECT * FROM notas')).length, 3);
  });

  test(`${variant}: importación de un rango conserva las fechas de trabajos y asistencias`, async t => {
    const f = await fixture(t, variant);
    await f.addWork(1, days[0], 8);
    await f.addWork(1, days[0], 10);
    await f.addWork(1, days[1], 2);
    await f.addAttendance(1, days[0], 'PRESENTE');
    await f.addAttendance(1, days[1], 'FALTA');
    assert.equal(await f.invoke('importar-promedios-qr-a-criterio', 101, days[0], days[1], 'LENGUAJES', 1, days[3]), 2);
    assert.equal(await f.invoke('importar-asistencia-a-criterio', [103, 105], days[0], days[1], 1, 10, days[3]), 4);
    const result = { notas: await f.all('SELECT * FROM notas') };
    assert.deepEqual(rowsFor(result), [[days[0], 9], [days[1], 2]]);
    assert.deepEqual(rowsFor(result, 103), [[days[0], 10], [days[1], 0]]);
    assert.deepEqual(rowsFor(result, 105), [[days[0], 10], [days[1], 0]]);
    await f.invoke('importar-promedios-qr-a-criterio', 101, days[0], 'LENGUAJES', 1, days[3]);
    assert.equal((await f.all('SELECT * FROM notas')).length, 6);
    assert.equal((await f.all('SELECT * FROM notas WHERE fecha = ?', [days[3]])).length, 0);
    await assert.rejects(f.invoke('importar-promedios-qr-a-criterio', 201, days[0], days[1], 'LENGUAJES', 1), /no pertenece al grupo activo/);
  });

  test(`${variant}: vínculos existentes por ciclo; cambio de año y fecha fuera del ciclo`, async t => {
    const f = await fixture(t, variant);
    // Representa un vínculo ya guardado en 1.0.2, sin volver a configurarlo.
    await f.run('INSERT INTO configuracion VALUES (?, ?)', ['evaluacion_qr_ciclo:1:2026-2027', JSON.stringify([{ criterio_id: 101, tipo: 'trabajos', escala: 10 }])]);
    await f.addWork(1, days[0], 8);
    assert.deepEqual(rowsFor(await f.invoke('get-evaluacion-automatica', 1)), [[days[0], 8]]);
    const outside = await f.invoke('get-evaluacion-automatica', 1, { inicio: '2027-08-01', fin: '2027-08-01' });
    assert.deepEqual(outside.notas, []);
    await f.run("UPDATE configuracion SET valor = '2027-08-30' WHERE llave = 'fechaInicioStr'");
    await f.run('UPDATE configuracion SET valor = ? WHERE llave = ?', [JSON.stringify({ 3: { fin: '2028-07-14' } }), 'periodos']);
    const nextCycle = await f.invoke('get-evaluacion-automatica', 1);
    assert.deepEqual(nextCycle.enlaces, []);
    assert.deepEqual(nextCycle.notas, []);
    assert.equal((await f.all('SELECT * FROM trabajos_qr')).length, 1);
    await assert.rejects(f.invoke('get-evaluacion-automatica', 1, { inicio: days[1], fin: days[0] }), /fechas válidas/);
  });
}

test('Evaluación manual sin vínculos mantiene los promedios diarios y las notas cero', async () => {
  const { promedioPeriodo } = await frontend;
  const criteria = [{ id: 101, porcentaje: 25 }, { id: 102, porcentaje: 75 }];
  const notes = [
    { alumno_id: 1, criterio_id: 101, fecha: days[0], valor: 8 },
    { alumno_id: 1, criterio_id: 102, fecha: days[0], valor: 4 },
    { alumno_id: 1, criterio_id: 101, fecha: days[1], valor: 0 },
    { alumno_id: 1, criterio_id: 102, fecha: days[2], valor: '' },
    { alumno_id: 2, criterio_id: 101, fecha: days[0], valor: 100 }
  ];
  assert.equal(promedioPeriodo(criteria, notes, { enlaces: [], notas: [] }, 1), 2.5);
  assert.equal(promedioPeriodo(criteria, [], null, 1), null);
});
