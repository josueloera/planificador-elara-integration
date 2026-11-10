const { randomUUID } = require('crypto');

const EXAM_SCAN_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS examscan_exams (
    id TEXT PRIMARY KEY, grupo_id INTEGER NOT NULL, grado INTEGER NOT NULL, seccion TEXT NOT NULL,
    ciclo_escolar TEXT NOT NULL, trimestre INTEGER NOT NULL, campo_formativo TEXT NOT NULL,
    contenido TEXT NOT NULL, pda TEXT NOT NULL, titulo TEXT NOT NULL, preguntas_json TEXT NOT NULL,
    tipo_examen TEXT NOT NULL DEFAULT 'TRIMESTRAL', periodo_nombre TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT 'validado', creado_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS examscan_attempts (
    id TEXT PRIMARY KEY, examen_id TEXT NOT NULL REFERENCES examscan_exams(id),
    alumno_id INTEGER NOT NULL, qr_token TEXT NOT NULL UNIQUE, creado_en TEXT NOT NULL,
    UNIQUE(examen_id, alumno_id)
  )`,
  `CREATE TABLE IF NOT EXISTS examscan_evaluation_links (
    exam_id TEXT PRIMARY KEY REFERENCES examscan_exams(id),
    grupo_id INTEGER NOT NULL, criterio_id INTEGER NOT NULL, fecha TEXT NOT NULL,
    creado_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS examscan_attempt_results (
    intento_id TEXT PRIMARY KEY REFERENCES examscan_attempts(id),
    respuestas_json TEXT NOT NULL, puntos_obtenidos REAL NOT NULL,
    puntos_posibles REAL NOT NULL, calificacion REAL NOT NULL,
    actualizado_en TEXT NOT NULL
  )`
];

function installSchema(db) {
  EXAM_SCAN_SCHEMA.forEach(sql => db.run(sql));
  db.run("ALTER TABLE examscan_exams ADD COLUMN tipo_examen TEXT NOT NULL DEFAULT 'TRIMESTRAL'", () => {});
  db.run("ALTER TABLE examscan_exams ADD COLUMN periodo_nombre TEXT NOT NULL DEFAULT ''", () => {});
}

function validateDraft(draft) {
  const required = ['grupo_id', 'grado', 'seccion', 'ciclo_escolar', 'trimestre', 'campo_formativo', 'contenido', 'pda', 'titulo'];
  if (!draft || required.some(key => !String(draft[key] ?? '').trim())) throw new Error('Completa los datos académicos del examen.');
  if (!Number.isInteger(Number(draft.trimestre)) || Number(draft.trimestre) < 1 || Number(draft.trimestre) > 3) throw new Error('El trimestre debe ser 1, 2 o 3.');
  if (!['TRIMESTRAL', 'PARCIAL'].includes(draft.tipo_examen)) throw new Error('Selecciona si el examen es trimestral o parcial.');
  if (draft.tipo_examen === 'PARCIAL' && !String(draft.periodo_nombre || '').trim()) throw new Error('Escribe el periodo o unidad del examen parcial.');
  if (!Array.isArray(draft.preguntas) || draft.preguntas.length === 0) throw new Error('Agrega al menos una pregunta validada.');
  if (draft.preguntas.length > 20) throw new Error('El formato de hoja de respuestas admite hasta 20 reactivos por examen.');
  draft.preguntas.forEach((question, index) => {
    if (!question.texto?.trim() || !['A', 'B', 'C', 'D'].every(key => question.opciones?.[key]?.trim()) || !['A', 'B', 'C', 'D'].includes(question.correcta) || !(Number(question.puntos) > 0)) {
      throw new Error(`Revisa pregunta ${index + 1}: requiere cuatro opciones, respuesta correcta y puntaje positivo.`);
    }
    if (question.imagen && (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(question.imagen) || question.imagen.length > 1_500_000)) {
      throw new Error(`La imagen del reactivo ${index + 1} no es válida o supera el tamaño permitido.`);
    }
  });
  if (draft.preguntas.reduce((total, question) => total + (question.imagen?.length || 0), 0) > 8_000_000) throw new Error('El conjunto de imágenes supera el tamaño permitido.');
}

function createAttempts(students, examId = randomUUID()) {
  return students.map(student => {
    const id = randomUUID();
    const token = randomUUID();
    // Keep the printed QR compact so it remains easy to read from a phone photo.
    return { id, alumno_id: student.id, nombre: student.nombre, qr_token: token, qr: { v: 1, t: token } };
  });
}

function scoreAnswers(questions, answers) {
  if (!Array.isArray(answers) || answers.length !== questions.length) throw new Error('El número de respuestas no coincide con los reactivos del examen.');
  const normalized = answers.map(answer => answer === '' || answer == null ? '' : String(answer).trim().toUpperCase());
  if (normalized.some(answer => answer && !['A', 'B', 'C', 'D'].includes(answer))) throw new Error('Hay una respuesta inválida.');
  const possible = questions.reduce((sum, question) => sum + Number(question.puntos), 0);
  const earned = questions.reduce((sum, question, index) => sum + (normalized[index] === question.correcta ? Number(question.puntos) : 0), 0);
  return { respuestas: normalized, puntos_obtenidos: earned, puntos_posibles: possible, calificacion: possible ? Math.round((earned / possible) * 100) / 10 : 0 };
}

function get(db, sql, values = []) {
  return new Promise((resolve, reject) => db.get(sql, values, (error, row) => error ? reject(error) : resolve(row)));
}

async function saveAttemptResult(db, payload = {}) {
  const attemptId = String(payload.intento_id || '').trim();
  if (!attemptId) throw new Error('El folio del alumno no es válido.');
  const attempt = await get(db, `SELECT a.id AS intento_id,a.alumno_id,e.id AS examen_id,e.grupo_id,e.titulo,e.campo_formativo,e.preguntas_json,l.criterio_id,l.fecha,s.nombre AS alumno
    FROM examscan_attempts a JOIN examscan_exams e ON e.id=a.examen_id
    JOIN examscan_evaluation_links l ON l.exam_id=e.id
    JOIN alumnos s ON s.id=a.alumno_id AND s.grupo_id=e.grupo_id
    JOIN criterios c ON c.id=l.criterio_id AND c.grupo_id=e.grupo_id WHERE a.id=?`, [attemptId]);
  if (!attempt) throw new Error('No se encontró el intento o no tiene un criterio del evaluador vinculado.');
  let questions;
  try { questions = JSON.parse(attempt.preguntas_json); } catch { throw new Error('La clave de respuestas del examen no se puede leer.'); }
  const score = scoreAnswers(questions, payload.respuestas);
  const updatedAt = new Date().toISOString();
  const activity = `ExamScan · ${attempt.titulo} · ${attempt.examen_id.slice(0, 8)}`;
  await new Promise((resolve, reject) => db.serialize(() => {
    const fail = error => db.run('ROLLBACK', () => reject(error));
    db.run('BEGIN IMMEDIATE', beginError => {
      if (beginError) return reject(beginError);
      const dayKey = `qr_actividades:${attempt.grupo_id}:${attempt.fecha}`;
      db.get('SELECT valor FROM configuracion WHERE llave=?', [dayKey], (readError, row) => {
        if (readError) return fail(readError);
        let activities = [];
        try { activities = row ? JSON.parse(row.valor) : []; }
        catch { return fail(new Error('No se puede actualizar la lista QR del día porque su configuración no es válida.')); }
        if (!Array.isArray(activities)) return fail(new Error('La configuración de actividades QR del día no es válida.'));
        const current = activities.find(item => item.nombre === activity);
        if (current && current.categoria !== 'EXAMEN') return fail(new Error('Ya existe otra actividad QR con este nombre. Cambia el título del examen para conservar sus calificaciones.'));
        if (current) {
          if (Array.isArray(current.alumno_ids) && !current.alumno_ids.includes(Number(attempt.alumno_id))) current.alumno_ids.push(Number(attempt.alumno_id));
        } else activities.push({ categoria: 'EXAMEN', nombre: activity, campo: attempt.campo_formativo, modo: 'TODOS', alumno_ids: null });
        db.run('INSERT OR REPLACE INTO configuracion (llave,valor) VALUES (?,?)', [dayKey, JSON.stringify(activities)], activityError => {
          if (activityError) return fail(activityError);
          db.get('SELECT id FROM trabajos_qr WHERE alumno_id=? AND nombre_trabajo=? AND fecha=? AND grupo_id=?', [attempt.alumno_id, activity, attempt.fecha, attempt.grupo_id], (workReadError, existing) => {
            if (workReadError) return fail(workReadError);
            const finishWork = workError => {
              if (workError) return fail(workError);
              db.run('INSERT OR REPLACE INTO examscan_attempt_results (intento_id,respuestas_json,puntos_obtenidos,puntos_posibles,calificacion,actualizado_en) VALUES (?,?,?,?,?,?)', [attemptId, JSON.stringify(score.respuestas), score.puntos_obtenidos, score.puntos_posibles, score.calificacion, updatedAt], resultError => {
                if (resultError) return fail(resultError);
                db.run('COMMIT', commitError => commitError ? reject(commitError) : resolve());
              });
            };
            if (existing) db.run('UPDATE trabajos_qr SET valor=?,campo=? WHERE id=?', [score.calificacion, attempt.campo_formativo, existing.id], finishWork);
            else db.run('INSERT INTO trabajos_qr (alumno_id,campo,nombre_trabajo,fecha,valor,grupo_id) VALUES (?,?,?,?,?,?)', [attempt.alumno_id, attempt.campo_formativo, activity, attempt.fecha, score.calificacion, attempt.grupo_id], insertError => finishWork(insertError));
          });
        });
      });
    });
  }));
  return { ...score, intento_id: attemptId, alumno: attempt.alumno, fecha: attempt.fecha, criterio_id: attempt.criterio_id, examen_id: attempt.examen_id, campo: attempt.campo_formativo };
}

function resolveQrPayload(db, payload) {
  if (!payload || payload.v !== 1 || !payload.t) return Promise.reject(new Error('El QR no corresponde a una hoja ExamScan válida.'));
  const hasLegacyIds = Boolean(payload.e && payload.a);
  const where = hasLegacyIds ? 'a.id=? AND a.examen_id=? AND a.qr_token=?' : 'a.qr_token=?';
  const params = hasLegacyIds ? [String(payload.a), String(payload.e), String(payload.t)] : [String(payload.t)];
  return new Promise((resolve, reject) => db.get(`SELECT a.id AS intento_id,a.alumno_id,s.nombre AS alumno,e.id AS examen_id,e.titulo,e.grado,e.seccion,e.ciclo_escolar,e.trimestre,e.tipo_examen,e.periodo_nombre,e.campo_formativo,e.contenido,e.pda,e.preguntas_json
    FROM examscan_attempts a JOIN examscan_exams e ON e.id=a.examen_id JOIN alumnos s ON s.id=a.alumno_id
    WHERE ${where}`, params, (err, row) => {
    if (err) return reject(err);
    if (!row) return reject(new Error('El QR no coincide con un intento registrado.'));
    try { resolve({ ...row, preguntas: JSON.parse(row.preguntas_json) }); } catch (parseError) { reject(parseError); }
  }));
}

module.exports = { installSchema, validateDraft, createAttempts, scoreAnswers, saveAttemptResult, resolveQrPayload };
